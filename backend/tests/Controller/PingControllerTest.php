<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class PingControllerTest extends WebTestCase
{
    public function testPing(): void
    {
        $client = static::createClient();

        $client->request('POST', '/api/ping');

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('content-type', 'application/json');

        $responseContent = $client->getResponse()->getContent();
        $data = json_decode($responseContent, true);

        self::assertArrayHasKey('status', $data);
        self::assertSame('Ping sent!', $data['status']);
        self::assertArrayHasKey('id', $data);
    }
}
