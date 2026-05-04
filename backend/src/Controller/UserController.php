<?php

namespace App\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/me')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class UserController extends AbstractController
{
    #[Route('', name: 'api_user_me', methods: ['GET'])]
    public function me(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        return $this->json([
            'id'       => $user->getId(),
            'email'    => $user->getEmail(),
            'username' => $user->getUsername(),
            'elo'      => $user->getElo(),
            'roles'    => $user->getRoles(),
            'settings' => $user->getSettings(),
            'avatar'   => $user->getAvatar(),
        ]);
    }

    #[Route('/settings', name: 'api_user_update_settings', methods: ['PATCH'])]
    public function updateSettings(Request $request, EntityManagerInterface $em): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $currentSettings = $user->getSettings() ?? [];

        // only keep keys we explicitly allow, everything else gets dropped
        $allowedKeys = ['theme', 'music', 'sfx', 'volume'];
        $filteredData = array_intersect_key($data, array_flip($allowedKeys));

        // new values overwrite old ones, anything not mentioned stays as-is
        $newSettings = array_merge($currentSettings, $filteredData);

        $user->setSettings($newSettings);
        $em->flush();

        return $this->json([
            'message'  => 'Settings updated',
            'settings' => $user->getSettings()
        ]);
    }

    #[Route('/avatar', name: 'api_user_avatar', methods: ['POST'])]
    public function uploadAvatar(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        $file = $request->files->get('avatar');

        if (!$file) {
            return $this->json(['error' => 'No file uploaded'], 400);
        }

        // whitelist extensions only, rejects anything that could be a disguised executable
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        $extension = strtolower($file->getClientOriginalExtension());
        if (!in_array($extension, $allowedExtensions, true)) {
            return $this->json(['error' => 'Invalid file type (JPG, PNG, WEBP only)'], 400);
        }

        if ($file->getSize() > 10 * 1024 * 1024) {
            return $this->json(['error' => 'File too large (Max 10MB)'], 400);
        }

        // getimagesize() actually parses the binary data, unlike getMimeType() which just
        // reads the header and can be fooled. A PHP file renamed to .jpg won't sneak past this.
        $imageInfo = @getimagesize($file->getPathname());
        $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if ($imageInfo === false || !in_array($imageInfo['mime'], $allowedMimeTypes, true)) {
            return $this->json(['error' => 'Invalid image file'], 400);
        }

        $this->optimizeImage($file->getPathname());

        // setAvatarFile() hands the file to VichUploader, which handles the filename,
        // the move to /public/uploads/avatars/, and updating $user->avatar on flush
        $user?->setAvatarFile($file);
        $em->flush();

        return $this->json([
            'message'   => 'Avatar updated',
            'avatarUrl' => '/uploads/avatars/' . $user?->getAvatar()
        ]);
    }

    #[Route('/avatar', name: 'api_user_avatar_delete', methods: ['DELETE'])]
    public function deleteAvatar(EntityManagerInterface $em): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $currentAvatar = $user->getAvatar();

        if ($currentAvatar && $currentAvatar !== 'default-avatar.jpg') {
            $avatarPath = $this->getParameter('kernel.project_dir') . '/public/uploads/avatars/' . $currentAvatar;

            if (file_exists($avatarPath)) {
                unlink($avatarPath);
            }
        }

        // reset to default and null out the VichUploader file reference too
        $user->setAvatar('default-avatar.jpg');
        $user->setAvatarFile(null);
        $em->flush();

        return $this->json([
            'message' => 'Avatar deleted successfully',
            'avatar'  => 'default-avatar.jpg'
        ]);
    }

    #[Route('', name: 'api_user_delete', methods: ['DELETE'])]
    public function deleteAccount(EntityManagerInterface $em): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $currentAvatar = $user->getAvatar();
        if ($currentAvatar && $currentAvatar !== 'default-avatar.jpg') {
            $avatarPath = $this->getParameter('kernel.project_dir') . '/public/uploads/avatars/' . $currentAvatar;
            if (file_exists($avatarPath)) {
                unlink($avatarPath);
            }
        }

        // remove the user and flush, Doctrine takes care of cascade deletes
        $em->remove($user);
        $em->flush();

        return $this->json(['message' => 'Account deleted successfully']);
    }

    private function optimizeImage(string $filePath): void
    {
        [$width, $height] = getimagesize($filePath);
        $maxDim = 500;

        if ($width <= $maxDim && $height <= $maxDim) {
            return;
        }

        $ratio = $width / $height;
        if ($ratio > 1) {
            $newWidth  = $maxDim;
            $newHeight = (int)($maxDim / $ratio);
        } else {
            $newWidth  = (int)($maxDim * $ratio);
            $newHeight = $maxDim;
        }

        $src = imagecreatefromstring(file_get_contents($filePath));
        $dst = imagecreatetruecolor($newWidth, $newHeight);

        // Enable full alpha channel support (needed for PNG/WEBP transparency)
        imagealphablending($dst, false);
        imagesavealpha($dst, true);

        imagecopyresampled($dst, $src, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        $info = getimagesize($filePath);
        switch ($info['mime']) {
            case 'image/jpeg': imagejpeg($dst, $filePath, 85); break;
            case 'image/png':  imagepng($dst, $filePath, 8);  break;
            case 'image/webp': imagewebp($dst, $filePath, 85); break;
        }

        imagedestroy($src);
        imagedestroy($dst);
    }
}
