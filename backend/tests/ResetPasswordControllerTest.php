<?php

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

        // Ensure we have a clean database
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

    public function testResetPasswordController(): void
    {
        // Create a test user
        $user = (new User())
            ->setEmail('me@example.com')
            ->setPassword('a-test-password-that-will-be-changed-later')
        ;
        $this->em->persist($user);
        $this->em->flush();

        // Test Request reset password API
        $this->client->request('POST', '/api/reset-password/request', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'email' => 'me@example.com'
        ]));

        self::assertResponseIsSuccessful();

        // Ensure the reset password email was sent
        self::assertEmailCount(1);
        $messages = $this->getMailerMessages();
        self::assertGreaterThanOrEqual(1, count($messages));
        $email = $messages[0];
        
        self::assertEmailAddressContains($email, 'from', 'no-reply@connect4online.com');
        self::assertEmailAddressContains($email, 'to', 'me@example.com');

        // Extract the token from the email body
        $emailBody = quoted_printable_decode($email->toString());
        preg_match('/token=([^"&\s]+)/', $emailBody, $matches);
        self::assertArrayHasKey(1, $matches, 'Reset token not found in email');
        $token = $matches[1];

        // Test we can set a new password via API
        $this->client->request('POST', '/api/reset-password/reset', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'token' => $token,
            'password' => 'newStrongPassword'
        ]));

        self::assertResponseIsSuccessful();

        // Verify the password was actually changed in the database
        $user = $this->userRepository->findOneBy(['email' => 'me@example.com']);
        self::assertInstanceOf(User::class, $user);

        /** @var UserPasswordHasherInterface $passwordHasher */
        $passwordHasher = static::getContainer()->get(UserPasswordHasherInterface::class);
        self::assertTrue($passwordHasher->isPasswordValid($user, 'newStrongPassword'));
    }
}
