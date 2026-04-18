<?php

/**
 * ResetPasswordControllerTest — Functional test for the full password-reset flow.
 *
 * Exercises the two-step SymfonyCasts ResetPasswordBundle flow end-to-end:
 * 1. POST /api/reset-password/request → sends a reset email
 * 2. POST /api/reset-password/reset   → changes the password using the token from the email
 *
 * The test extracts the reset token directly from the email body so it can drive
 * step 2 without needing a real mail client. After reset, it verifies that the
 * new password is valid using the password hasher service.
 *
 * setUp() clears all users before each test to avoid conflicts with leftover rows
 * from earlier runs (test DB is rolled back by DAMA, but starting clean is safer).
 */

namespace App\Tests;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class ResetPasswordControllerTest extends WebTestCase
{
    private KernelBrowser $client;
    private EntityManagerInterface $em;
    private UserRepository $userRepository;

    protected function setUp(): void
    {
        $this->client = static::createClient();

        $container = static::getContainer();

        /** @var EntityManagerInterface $em */
        $em = $container->get('doctrine')->getManager();
        $this->em = $em;

        $this->userRepository = $container->get(UserRepository::class);

        foreach ($this->userRepository->findAll() as $user) {
            $this->em->remove($user);
        }

        $this->em->flush();
    }

    /**
     * Full reset flow:
     * - Request a reset → email is sent, response is 200
     * - Extract token from email body via regex
     * - POST token + new password → response is 200
     * - Verify DB password now matches the new value
     */
    public function testResetPasswordController(): void
    {
        $user = (new User())
            ->setEmail('me@example.com')
            ->setPassword('a-test-password-that-will-be-changed-later');
        $this->em->persist($user);
        $this->em->flush();

        // Step 1: request a reset link
        $this->client->request('POST', '/api/reset-password/request', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'email' => 'me@example.com'
        ]));

        self::assertResponseIsSuccessful();
        self::assertEmailCount(1);

        // Extract the signed token from the email body
        $messages = $this->getMailerMessages();
        self::assertGreaterThanOrEqual(1, count($messages));
        $email = $messages[0];

        self::assertEmailAddressContains($email, 'from', 'no-reply@connect4online.com');
        self::assertEmailAddressContains($email, 'to', 'me@example.com');

        $emailBody = quoted_printable_decode($email->toString());
        preg_match('/token=([^"&\s]+)/', $emailBody, $matches);
        self::assertArrayHasKey(1, $matches, 'Reset token not found in email body');
        $token = $matches[1];

        // Step 2: use the token to set a new password
        $this->client->request('POST', '/api/reset-password/reset', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'token'    => $token,
            'password' => 'newStrongPassword'
        ]));

        self::assertResponseIsSuccessful();

        // Verify the hashed password in the DB matches the new plaintext password
        $updatedUser = $this->userRepository->findOneBy(['email' => 'me@example.com']);
        self::assertInstanceOf(User::class, $updatedUser);

        /** @var UserPasswordHasherInterface $passwordHasher */
        $passwordHasher = static::getContainer()->get(UserPasswordHasherInterface::class);
        self::assertTrue($passwordHasher->isPasswordValid($updatedUser, 'newStrongPassword'));
    }
}
