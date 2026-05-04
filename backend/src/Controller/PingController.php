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
        // the topic is just a channel ID, it's a URI by convention but doesn't have to resolve to anything
        $update = new Update(
            'https://connect4.online/ping',
            json_encode(['message' => 'Pong!', 'time' => time()])
        );

        $id = $hub->publish($update);

        return $this->json(['status' => 'Ping sent!', 'id' => $id]);
    }
}
