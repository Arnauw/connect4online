<?php

/**
 * PingControllerTest — Smoke test for POST /api/ping.
 *
 * Verifies that the Mercure pub/sub pipeline is wired correctly:
 * the endpoint must publish a test event and return the hub-assigned event ID.
 *
 * This test requires the Mercure Hub to be running (pnpm docker).
 */

namespace App\Tests\Functional;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class PingControllerTest extends WebTestCase
{
    /** A POST to /api/ping must return 200 with a status message and a Mercure event id. */
    public function testPing(): void
    {
        $client = static::createClient();

        $client->request('POST', '/api/ping');

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('content-type', 'application/json');

        $data = json_decode($client->getResponse()->getContent(), true);

        self::assertArrayHasKey('status', $data);
        self::assertSame('Ping sent!', $data['status']);
        self::assertArrayHasKey('id', $data); // Mercure-assigned event ID
    }
}
