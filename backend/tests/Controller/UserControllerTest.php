<?php

/**
 * UserControllerTest — Functional tests for authenticated user profile endpoints.
 *
 * All /api/me routes require IS_AUTHENTICATED_FULLY, so every test either
 * verifies the auth guard fires (401) or uses loginUser() to bypass JWT.
 *
 * Covers:
 * - GET /api/me: auth guard, profile data returned correctly
 * - PATCH /api/me/settings: merge semantics, unknown keys filtered, auth guard
 * - DELETE /api/me: account removed from database
 */

namespace App\Tests\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class UserControllerTest extends WebTestCase
{
    // -------------------------------------------------------------------------
    // GET /api/me
    // -------------------------------------------------------------------------

    /** Unauthenticated request to /api/me must return 401. */
    public function testMeEndpointUnauthenticated(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/me');
        self::assertResponseStatusCodeSame(401);
    }

    /** Authenticated request returns the correct profile fields. */
    public function testMeEndpointAuthenticated(): void
    {
        $client    = static::createClient();
        $container = static::getContainer();
        $em        = $container->get('doctrine')->getManager();

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

        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertSame('me_test@example.com', $data['email']);
        self::assertSame('me_test', $data['username']);
        self::assertSame(1200, $data['elo']);
        self::assertSame(['theme' => 'light'], $data['settings']);
    }

    // -------------------------------------------------------------------------
    // PATCH /api/me/settings
    // -------------------------------------------------------------------------

    /** Unauthenticated PATCH must return 401. */
    public function testUpdateSettingsUnauthenticated(): void
    {
        $client = static::createClient();
        $client->request('PATCH', '/api/me/settings', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode(['volume' => 80]));
        self::assertResponseStatusCodeSame(401);
    }

    /**
     * Incoming keys are merged into the existing settings object.
     * Only the specified keys change; unmentioned keys are preserved.
     */
    public function testUpdateSettings(): void
    {
        $client    = static::createClient();
        $container = static::getContainer();
        $em        = $container->get('doctrine')->getManager();

        $user = new User();
        $user->setEmail('settings_test@example.com');
        $user->setUsername('settings_test');
        $user->setPassword('hash');
        $user->setSettings(['theme' => 'dark', 'volume' => 50]);
        $em->persist($user);
        $em->flush();

        $client->loginUser($user);
        $client->request('PATCH', '/api/me/settings', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'volume' => 80,
            'music'  => false
        ]));

        self::assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertSame('Settings updated', $data['message']);

        $expected = ['theme' => 'dark', 'volume' => 80, 'music' => false];
        self::assertSame($expected, $data['settings']);

        $userRepository = $container->get(UserRepository::class);
        self::assertSame($expected, $userRepository->find($user->getId())->getSettings());
    }

    /**
     * Only the four allowed keys (theme, music, sfx, volume) may be stored.
     * Any unknown key sent by the client must be silently discarded.
     */
    public function testUpdateSettingsFiltersUnknownKeys(): void
    {
        $client    = static::createClient();
        $container = static::getContainer();
        $em        = $container->get('doctrine')->getManager();

        $user = new User();
        $user->setEmail('filter_test@example.com');
        $user->setUsername('filter_test');
        $user->setPassword('hash');
        $user->setSettings([]);
        $em->persist($user);
        $em->flush();

        $client->loginUser($user);
        $client->request('PATCH', '/api/me/settings', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'volume'      => 60,
            'injectedKey' => 'malicious'
        ]));

        self::assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertSame(60, $data['settings']['volume']);
        self::assertArrayNotHasKey('injectedKey', $data['settings']);
    }

    // -------------------------------------------------------------------------
    // DELETE /api/me
    // -------------------------------------------------------------------------

    /** Deleting an account removes the user row from the database. */
    public function testDeleteAccount(): void
    {
        $client    = static::createClient();
        $container = static::getContainer();
        $em        = $container->get('doctrine')->getManager();

        $user = new User();
        $user->setEmail('delete_test@example.com');
        $user->setUsername('delete_test');
        $user->setPassword('hash');
        $em->persist($user);
        $em->flush();

        $userId = $user->getId();

        $client->loginUser($user);
        $client->request('DELETE', '/api/me');

        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertSame('Account deleted successfully', $data['message']);

        $em->clear();
        $userRepository = $container->get(UserRepository::class);
        self::assertNull($userRepository->find($userId));
    }
}
