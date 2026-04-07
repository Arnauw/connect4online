<?php

namespace App\Tests\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class RegistrationControllerTest extends WebTestCase
{
    public function testRegisterSuccess(): void
    {
        $client = static::createClient();

        $client->request('POST', '/api/register', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'email' => 'newuser@example.com',
            'username' => 'newuser',
            'password' => 'password123'
        ]));

        self::assertResponseStatusCodeSame(201);
        
        $responseContent = $client->getResponse()->getContent();
        $data = json_decode($responseContent, true);

        self::assertArrayHasKey('message', $data);
        self::assertArrayHasKey('id', $data);

        // Check if user was actually created
        $container = static::getContainer();
        $userRepository = $container->get(UserRepository::class);
        $user = $userRepository->findOneBy(['email' => 'newuser@example.com']);

        self::assertInstanceOf(User::class, $user);
        self::assertSame('newuser', $user->getUsername());
        self::assertFalse($user->isVerified());

        // Check if verification email was queued
        self::assertQueuedEmailCount(1);
    }

    public function testRegisterMissingFields(): void
    {
        $client = static::createClient();

        $client->request('POST', '/api/register', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'email' => 'missing@example.com',
        ]));

        self::assertResponseStatusCodeSame(400);
    }

    public function testRegisterDuplicateEmail(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        // Create user
        $user = new User();
        $user->setEmail('duplicate@example.com');
        $user->setUsername('duplicate');
        $user->setPassword('hash');
        $em->persist($user);
        $em->flush();

        // Try to register again
        $client->request('POST', '/api/register', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'email' => 'duplicate@example.com',
            'username' => 'anothername',
            'password' => 'password123'
        ]));

        self::assertResponseStatusCodeSame(409);
    }
}
