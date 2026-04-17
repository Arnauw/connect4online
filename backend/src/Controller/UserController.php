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
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'username' => $user->getUsername(),
            'elo' => $user->getElo(),
            'roles' => $user->getRoles(),
            'settings' => $user->getSettings(),
            'avatar' => $user->getAvatar(),
        ]);
    }

    /**
     * @throws \JsonException
     */
    #[Route('/settings', name: 'api_user_update_settings', methods: ['PATCH'])]
    public function updateSettings(Request $request, EntityManagerInterface $em): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $currentSettings = $user->getSettings() ?? [];

        // Whitelist allowed settings keys to prevent database pollution
        $allowedKeys = ['theme', 'music', 'sfx', 'volume'];
        $filteredData = array_intersect_key($data, array_flip($allowedKeys));

        $newSettings = array_merge($currentSettings, $filteredData);

        $user->setSettings($newSettings);

        $em->flush();

        return $this->json([
            'message' => 'Settings updated',
            'settings' => $user->getSettings()
        ]);
    }

    #[Route('/avatar', name: 'api_user_avatar', methods: ['POST'])]
    public function uploadAvatar(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        $file = $request->files->get('avatar');

        if (!$file) return $this->json(['error' => 'No file uploaded'], 400);

        $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!in_array($file->getMimeType(), $allowedMimeTypes, true)) {
            return $this->json(['error' => 'Invalid file type (JPG, PNG, WEBP only)'], 400);
        }

        if ($file->getSize() > 10 * 1024 * 1024) { // 10MB
            return $this->json(['error' => 'File too large (Max 10MB)'], 400);
        }

        $this->optimizeImage($file->getPathname());

        $user?->setAvatarFile($file);
        $em->flush();

        return $this->json([
            'message' => 'Avatar updated',
            'avatarUrl' => '/uploads/avatars/' . $user?->getAvatar()
        ]);
    }

    #[Route('/avatar', name: 'api_user_avatar_delete', methods: ['DELETE'])]
    public function deleteAvatar(EntityManagerInterface $em): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $currentAvatar = $user->getAvatar();

        // Only delete if user has a custom avatar (not the default)
        if ($currentAvatar && $currentAvatar !== 'default-avatar.jpg') {
            $avatarPath = $this->getParameter('kernel.project_dir') . '/public/uploads/avatars/' . $currentAvatar;

            // Delete the physical file if it exists
            if (file_exists($avatarPath)) {
                unlink($avatarPath);
            }
        }

        // Reset to default avatar
        $user->setAvatar('default-avatar.jpg');
        $user->setAvatarFile(null);
        $em->flush();

        return $this->json([
            'message' => 'Avatar deleted successfully',
            'avatar' => 'default-avatar.jpg'
        ]);
    }

    #[Route('', name: 'api_user_delete', methods: ['DELETE'])]
    public function deleteAccount(EntityManagerInterface $em): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        // Delete custom avatar file if exists
        $currentAvatar = $user->getAvatar();
        if ($currentAvatar && $currentAvatar !== 'default-avatar.jpg') {
            $avatarPath = $this->getParameter('kernel.project_dir') . '/public/uploads/avatars/' . $currentAvatar;
            if (file_exists($avatarPath)) {
                unlink($avatarPath);
            }
        }

        // Delete user from database (this will cascade delete related entities if configured)
        $em->remove($user);
        $em->flush();

        return $this->json([
            'message' => 'Account deleted successfully'
        ]);
    }

    private function optimizeImage(string $filePath): void
    {
        [$width, $height] = getimagesize($filePath);
        $maxDim = 500;

        if ($width > $maxDim || $height > $maxDim) {
            $ratio = $width / $height;
            if ($ratio > 1) {
                $newWidth = $maxDim;
                $newHeight = $maxDim / $ratio;
            } else {
                $newWidth = $maxDim * $ratio;
                $newHeight = $maxDim;
            }

            $src = imagecreatefromstring(file_get_contents($filePath));
            $dst = imagecreatetruecolor($newWidth, $newHeight);

            // Preserve transparency for PNG/WEBP
            imagealphablending($dst, false);
            imagesavealpha($dst, true);

            imagecopyresampled($dst, $src, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

            $info = getimagesize($filePath);
            switch ($info['mime']) {
                case 'image/jpeg': imagejpeg($dst, $filePath, 85); break; // 85% quality
                case 'image/png': imagepng($dst, $filePath, 8); break;
                case 'image/webp': imagewebp($dst, $filePath, 85); break;
            }

            imagedestroy($src);
            imagedestroy($dst);
        }
    }
}
