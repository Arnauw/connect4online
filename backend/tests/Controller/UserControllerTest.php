<?php

namespace App\Tests\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class UserControllerTest extends WebTestCase
{
    public function testMeEndpointUnauthenticated(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/me');
        self::assertResponseStatusCodeSame(401);
    }

    public function testMeEndpointAuthenticated(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $user = new User();
        $user->setEmail('me_test@example.com');
        $user->setUsername('me_test');
        $user->setPassword('hash');
        $user->setElo(1200);
        $user->setSettings(['theme' => 'light']);
        $em->persist($user);
        $em->flush();

        $client->loginUser($user);
        $client->request('GET', '/api/me');

        self::assertResponseIsSuccessful();
        
        $responseContent = $client->getResponse()->getContent();
        $data = json_decode($responseContent, true);

        self::assertSame('me_test@example.com', $data['email']);
        self::assertSame('me_test', $data['username']);
        self::assertSame(1200, $data['elo']);
        self::assertSame(['theme' => 'light'], $data['settings']);
    }

    public function testUpdateSettings(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $user = new User();
        $user->setEmail('settings_test@example.com');
        $user->setUsername('settings_test');
        $user->setPassword('hash');
        $user->setSettings(['theme' => 'dark', 'volume' => 50]);
        $em->persist($user);
        $em->flush();

        $client->loginUser($user);
        
        // Update settings
        $client->request('PATCH', '/api/me/settings', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'volume' => 80,
            'music' => false
        ]));

        self::assertResponseIsSuccessful();
        
        $responseContent = $client->getResponse()->getContent();
        $data = json_decode($responseContent, true);

        self::assertSame('Settings updated', $data['message']);
        
        // Verify settings merged correctly
        $expectedSettings = [
            'theme' => 'dark',
            'volume' => 80,
            'music' => false
        ];
        self::assertSame($expectedSettings, $data['settings']);

        // Check DB
        $userRepository = $container->get(UserRepository::class);
        $dbUser = $userRepository->find($user->getId());
        self::assertSame($expectedSettings, $dbUser->getSettings());
    }
}
