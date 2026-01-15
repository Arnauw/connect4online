<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;
use Symfony\Component\Routing\Attribute\Route;

class PingController extends AbstractController
{
    #[Route('/api/ping', name: 'api_ping', methods: ['POST'])]
    public function ping(HubInterface $hub): JsonResponse
    {
        // 1. Create the Update (Topic, Data)
        // Topic: A specific URL (doesn't have to exist) that acts as a channel ID
        $update = new Update(
            'https://connect4.online/ping',
            json_encode(['message' => 'Pong!', 'time' => time()])
        );

        // 2. Publish to the Hub
        $id = $hub->publish($update);

        return $this->json(['status' => 'Ping sent!', 'id' => $id]);
    }
}
