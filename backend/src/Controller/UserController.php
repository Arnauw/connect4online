<?php

/**
 * UserController
 *
 * Handles all authenticated user profile operations.
 * All routes require full authentication (valid JWT token).
 *
 * Endpoints:
 * - GET    /api/me          → Return current user profile data
 * - PATCH  /api/me/settings → Update user settings (theme, music, sfx, volume)
 * - POST   /api/me/avatar   → Upload and optimize a new avatar image
 * - DELETE /api/me/avatar   → Delete custom avatar, reset to default
 * - DELETE /api/me          → Delete the entire account and all associated files
 */

namespace App\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/me')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]  // Every endpoint in this controller requires a valid JWT
class UserController extends AbstractController
{
    /**
     * GET /api/me
     *
     * Returns the current authenticated user's profile data.
     * Called by AuthContext on login and token refresh to keep frontend user data fresh.
     *
     * Response includes: id, email, username, elo, roles, settings, avatar
     */
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

    /**
     * PATCH /api/me/settings
     *
     * Merges incoming settings with the user's existing settings.
     * Only known/safe keys are accepted — unknown keys are silently discarded
     * to prevent database pollution or injection of unexpected data.
     *
     * Allowed keys: theme, music, sfx, volume
     *
     * Example request body: { "theme": "light", "volume": 75 }
     * Example response: { "message": "Settings updated", "settings": {...} }
     *
     * @throws \JsonException if request body is not valid JSON
     */
    #[Route('/settings', name: 'api_user_update_settings', methods: ['PATCH'])]
    public function updateSettings(Request $request, EntityManagerInterface $em): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        // Parse incoming JSON body (throws JsonException on malformed input)
        $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);

        // Load current settings, defaulting to empty array if none saved yet
        $currentSettings = $user->getSettings() ?? [];

        // Only keep keys that we explicitly allow — everything else is ignored
        $allowedKeys = ['theme', 'music', 'sfx', 'volume'];
        $filteredData = array_intersect_key($data, array_flip($allowedKeys));

        // Merge: new values overwrite old ones, unmentioned keys are preserved
        $newSettings = array_merge($currentSettings, $filteredData);

        $user->setSettings($newSettings);
        $em->flush();

        return $this->json([
            'message'  => 'Settings updated',
            'settings' => $user->getSettings()
        ]);
    }

    /**
     * POST /api/me/avatar
     *
     * Accepts a multipart file upload, validates MIME type and file size,
     * optimizes the image (resize to max 500px), then saves it via VichUploader.
     *
     * Validation:
     * - Must be JPG, PNG, or WEBP
     * - Max 10MB before optimization
     *
     * After upload, VichUploader generates a unique filename and stores it in the
     * `avatar` field on the User entity. The frontend can then use:
     *   /uploads/avatars/{filename}
     */
    #[Route('/avatar', name: 'api_user_avatar', methods: ['POST'])]
    public function uploadAvatar(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        $file = $request->files->get('avatar');

        if (!$file) {
            return $this->json(['error' => 'No file uploaded'], 400);
        }

        // Validate file type — only images allowed
        $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!in_array($file->getMimeType(), $allowedMimeTypes, true)) {
            return $this->json(['error' => 'Invalid file type (JPG, PNG, WEBP only)'], 400);
        }

        // Validate file size — 10MB maximum
        if ($file->getSize() > 10 * 1024 * 1024) {
            return $this->json(['error' => 'File too large (Max 10MB)'], 400);
        }

        // Resize image to max 500x500 to save storage and bandwidth
        $this->optimizeImage($file->getPathname());

        // VichUploader picks up the file from setAvatarFile(), generates a filename,
        // stores the file in /public/uploads/avatars/, and updates $user->avatar on flush
        $user?->setAvatarFile($file);
        $em->flush();

        return $this->json([
            'message'   => 'Avatar updated',
            'avatarUrl' => '/uploads/avatars/' . $user?->getAvatar()
        ]);
    }

    /**
     * DELETE /api/me/avatar
     *
     * Removes the user's custom avatar image file from disk and resets
     * the avatar field back to the default placeholder image.
     *
     * No-op if already using default avatar (prevents trying to delete a non-existent file).
     */
    #[Route('/avatar', name: 'api_user_avatar_delete', methods: ['DELETE'])]
    public function deleteAvatar(EntityManagerInterface $em): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $currentAvatar = $user->getAvatar();

        // Only attempt deletion if user has a custom avatar (not the default placeholder)
        if ($currentAvatar && $currentAvatar !== 'default-avatar.jpg') {
            $avatarPath = $this->getParameter('kernel.project_dir') . '/public/uploads/avatars/' . $currentAvatar;

            // Delete the physical file from disk if it still exists
            if (file_exists($avatarPath)) {
                unlink($avatarPath);
            }
        }

        // Reset to default — null out the VichUploader file reference too
        $user->setAvatar('default-avatar.jpg');
        $user->setAvatarFile(null);
        $em->flush();

        return $this->json([
            'message' => 'Avatar deleted successfully',
            'avatar'  => 'default-avatar.jpg'
        ]);
    }

    /**
     * DELETE /api/me
     *
     * Permanently deletes the user's account from the database.
     * Also deletes their custom avatar file from disk to avoid orphaned files.
     *
     * Note: Doctrine will cascade-delete related entities (e.g. games) if
     * the ORM relationships are configured with orphanRemoval or cascade=["remove"].
     */
    #[Route('', name: 'api_user_delete', methods: ['DELETE'])]
    public function deleteAccount(EntityManagerInterface $em): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        // Clean up avatar file from disk before removing from database
        $currentAvatar = $user->getAvatar();
        if ($currentAvatar && $currentAvatar !== 'default-avatar.jpg') {
            $avatarPath = $this->getParameter('kernel.project_dir') . '/public/uploads/avatars/' . $currentAvatar;
            if (file_exists($avatarPath)) {
                unlink($avatarPath);
            }
        }

        // Remove user entity and flush — Doctrine handles cascade deletes
        $em->remove($user);
        $em->flush();

        return $this->json(['message' => 'Account deleted successfully']);
    }

    /**
     * Resizes an image to fit within a 500x500 bounding box while preserving aspect ratio.
     * Images already smaller than 500px on both dimensions are left untouched.
     *
     * Supports: JPEG (85% quality), PNG (compression level 8), WEBP (85% quality)
     * Preserves alpha transparency for PNG and WEBP formats.
     *
     * @param string $filePath Absolute path to the image file (modified in place)
     */
    private function optimizeImage(string $filePath): void
    {
        [$width, $height] = getimagesize($filePath);
        $maxDim = 500;

        // Skip if already within bounds
        if ($width <= $maxDim && $height <= $maxDim) {
            return;
        }

        // Calculate new dimensions keeping aspect ratio
        $ratio = $width / $height;
        if ($ratio > 1) {
            // Landscape: constrain by width
            $newWidth  = $maxDim;
            $newHeight = (int)($maxDim / $ratio);
        } else {
            // Portrait or square: constrain by height
            $newWidth  = (int)($maxDim * $ratio);
            $newHeight = $maxDim;
        }

        // Load source image from file
        $src = imagecreatefromstring(file_get_contents($filePath));

        // Create destination canvas at the new dimensions
        $dst = imagecreatetruecolor($newWidth, $newHeight);

        // Enable full alpha channel support (needed for PNG/WEBP transparency)
        imagealphablending($dst, false);
        imagesavealpha($dst, true);

        // High-quality resize using bicubic resampling
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        // Save back to the same file path in the original format
        $info = getimagesize($filePath);
        switch ($info['mime']) {
            case 'image/jpeg': imagejpeg($dst, $filePath, 85); break;  // 85% quality
            case 'image/png':  imagepng($dst, $filePath, 8);  break;   // Compression level 8
            case 'image/webp': imagewebp($dst, $filePath, 85); break;  // 85% quality
        }

        // Free memory
        imagedestroy($src);
        imagedestroy($dst);
    }
}
