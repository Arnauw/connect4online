<?php

/**
 * PingController
 *
 * Development/testing utility for verifying Mercure Hub connectivity.
 *
 * POST /api/ping publishes a test message to the Mercure Hub.
 * Any SSE subscriber listening on the "connect4.online/ping" topic
 * will receive the message, confirming the pub/sub pipeline is working.
 *
 * This is not used in production gameplay — it's a manual test endpoint.
 */

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;
use Symfony\Component\Routing\Attribute\Route;

class PingController extends AbstractController
{
    /**
     * POST /api/ping
     *
     * Publishes a test "Pong!" message to the Mercure Hub.
     * Returns the Mercure message ID assigned by the hub.
     *
     * Test with: curl -X POST http://localhost:8000/api/ping
     * Then check your EventSource subscriber for { message: "Pong!", time: ... }
     */
    #[Route('/api/ping', name: 'api_ping', methods: ['POST'])]
    public function ping(HubInterface $hub): JsonResponse
    {
        // Mercure Update: topic is a URI used as a channel identifier (does not need to be a real URL)
        $update = new Update(
            'https://connect4.online/ping',
            json_encode(['message' => 'Pong!', 'time' => time()])
        );

        // Publish to Mercure Hub — returns the assigned event ID
        $id = $hub->publish($update);

        return $this->json(['status' => 'Ping sent!', 'id' => $id]);
    }
}
