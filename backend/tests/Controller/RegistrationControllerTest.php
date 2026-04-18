<?php

/**
 * RegistrationControllerTest — Functional tests for POST /api/register.
 *
 * Covers:
 * - Happy path: user created, verification email queued, 201 returned
 * - Missing required fields → 400
 * - Duplicate email → 409
 * - Password strength rules (length, uppercase, lowercase, digit) → 400
 * - Invalid username format (too short, special chars) → 400
 */

namespace App\Tests\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class RegistrationControllerTest extends WebTestCase
{
    // -------------------------------------------------------------------------
    // Happy path
    // -------------------------------------------------------------------------

    /**
     * A valid registration creates the user (unverified), queues one verification
     * email, and returns 201 with the new user's id.
     */
    public function testRegisterSuccess(): void
    {
        $client = static::createClient();

        $client->request('POST', '/api/register', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'email'    => 'newuser@example.com',
            'username' => 'newuser',
            'password' => 'Password1'
        ]));

        self::assertResponseStatusCodeSame(201);

        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertArrayHasKey('message', $data);
        self::assertArrayHasKey('id', $data);

        $container      = static::getContainer();
        $userRepository = $container->get(UserRepository::class);
        $user           = $userRepository->findOneBy(['email' => 'newuser@example.com']);

        self::assertInstanceOf(User::class, $user);
        self::assertSame('newuser', $user->getUsername());
        self::assertFalse($user->isVerified());

        self::assertQueuedEmailCount(1);
    }

    // -------------------------------------------------------------------------
    // Missing / malformed input
    // -------------------------------------------------------------------------

    /** Omitting any required field returns 400. */
    public function testRegisterMissingFields(): void
    {
        $client = static::createClient();

        $client->request('POST', '/api/register', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'email' => 'missing@example.com',
        ]));

        self::assertResponseStatusCodeSame(400);
    }

    // -------------------------------------------------------------------------
    // Uniqueness
    // -------------------------------------------------------------------------

    /** Registering with an email already in use returns 409 Conflict. */
    public function testRegisterDuplicateEmail(): void
    {
        $client    = static::createClient();
        $container = static::getContainer();
        $em        = $container->get('doctrine')->getManager();

        $user = new User();
        $user->setEmail('duplicate@example.com');
        $user->setUsername('duplicate');
        $user->setPassword('hash');
        $em->persist($user);
        $em->flush();

        $client->request('POST', '/api/register', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'email'    => 'duplicate@example.com',
            'username' => 'anothername',
            'password' => 'Password1'
        ]));

        self::assertResponseStatusCodeSame(409);
    }

    // -------------------------------------------------------------------------
    // Password strength rules
    // -------------------------------------------------------------------------

    /** Password shorter than 8 characters must be rejected. */
    public function testRegisterPasswordTooShort(): void
    {
        $client = static::createClient();

        $client->request('POST', '/api/register', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'email'    => 'short@example.com',
            'username' => 'shortpass',
            'password' => 'Ab1xyz' // 6 chars
        ]));

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertStringContainsString('8 characters', $data['error']);
    }

    /** Password with no uppercase letter must be rejected. */
    public function testRegisterPasswordNoUppercase(): void
    {
        $client = static::createClient();

        $client->request('POST', '/api/register', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'email'    => 'noupper@example.com',
            'username' => 'noupper',
            'password' => 'nouppercase1'
        ]));

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertStringContainsString('uppercase', $data['error']);
    }

    /** Password with no lowercase letter must be rejected. */
    public function testRegisterPasswordNoLowercase(): void
    {
        $client = static::createClient();

        $client->request('POST', '/api/register', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'email'    => 'nolower@example.com',
            'username' => 'nolower',
            'password' => 'ALLUPPERCASE1'
        ]));

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertStringContainsString('lowercase', $data['error']);
    }

    /** Password with no digit must be rejected. */
    public function testRegisterPasswordNoDigit(): void
    {
        $client = static::createClient();

        $client->request('POST', '/api/register', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'email'    => 'nodigit@example.com',
            'username' => 'nodigit',
            'password' => 'NoDigitHere'
        ]));

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertStringContainsString('number', $data['error']);
    }

    // -------------------------------------------------------------------------
    // Username format
    // -------------------------------------------------------------------------

    /**
     * Usernames must match /^[a-zA-Z0-9_-]{3,20}$/.
     * A 2-character username is too short and must return 400.
     */
    public function testRegisterInvalidUsername(): void
    {
        $client = static::createClient();

        $client->request('POST', '/api/register', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'email'    => 'baduser@example.com',
            'username' => 'ab', // only 2 chars, minimum is 3
            'password' => 'ValidPass1'
        ]));

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertArrayHasKey('error', $data);
    }
}
