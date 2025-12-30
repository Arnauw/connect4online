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

        $newSettings = array_merge($currentSettings, $data);

        $user->setSettings($newSettings);

        $em->flush();

        return $this->json([
            'message' => 'Settings updated',
            'settings' => $user->getSettings()
        ]);
    }

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
}
