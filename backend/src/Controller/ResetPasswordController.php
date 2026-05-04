<?php

namespace App\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Contracts\Translation\TranslatorInterface;
use SymfonyCasts\Bundle\ResetPassword\Controller\ResetPasswordControllerTrait;
use SymfonyCasts\Bundle\ResetPassword\Exception\ResetPasswordExceptionInterface;
use SymfonyCasts\Bundle\ResetPassword\ResetPasswordHelperInterface;

#[Route('/api/reset-password')]
class ResetPasswordController extends AbstractController
{
    use ResetPasswordControllerTrait;

    public function __construct(
        private readonly ResetPasswordHelperInterface $resetPasswordHelper,
        private readonly EntityManagerInterface       $entityManager,
        #[Autowire(env: 'MAILER_FORGOT_FROM_EMAIL')] private readonly string $fromEmail,
        #[Autowire(env: 'MAILER_FORGOT_FROM_NAME')]  private readonly string $fromName,
    ) {}

    #[Route('/request', name: 'app_forgot_password_request', methods: ['POST'])]
    public function request(Request $request, MailerInterface $mailer, TranslatorInterface $translator): JsonResponse
    {
        $data  = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $email = $data['email'] ?? '';

        return $this->processSendingPasswordResetEmail($email, $mailer, $translator);
    }

    #[Route('/reset', name: 'app_reset_password', methods: ['POST'])]
    public function reset(Request $request, UserPasswordHasherInterface $passwordHasher, TranslatorInterface $translator): JsonResponse
    {
        $data          = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $token         = $data['token']    ?? null;
        $plainPassword = $data['password'] ?? null;

        if (!$token || !$plainPassword) {
            return $this->json(['error' => 'Missing token or password'], 400);
        }

        // same password rules as registration, keep them in sync
        if (strlen($plainPassword) < 8) {
            return $this->json(['error' => 'Password must be at least 8 characters long'], 400);
        }
        if (!preg_match('/[A-Z]/', $plainPassword)) {
            return $this->json(['error' => 'Password must contain at least one uppercase letter'], 400);
        }
        if (!preg_match('/[a-z]/', $plainPassword)) {
            return $this->json(['error' => 'Password must contain at least one lowercase letter'], 400);
        }
        if (!preg_match('/[0-9]/', $plainPassword)) {
            return $this->json(['error' => 'Password must contain at least one number'], 400);
        }

        try {
            // throws if the token is invalid, expired, or has already been used
            /** @var User $user */
            $user = $this->resetPasswordHelper->validateTokenAndFetchUser($token);
        } catch (ResetPasswordExceptionInterface $e) {
            return $this->json(['error' => sprintf('Invalid token: %s', $e->getReason())], 400);
        }

        // Consume the token so it cannot be reused
        $this->resetPasswordHelper->removeResetRequest($token);

        $user->setPassword($passwordHasher->hashPassword($user, $plainPassword));
        $this->entityManager->flush();

        return $this->json(['message' => 'Password updated successfully.']);
    }

    private function processSendingPasswordResetEmail(
        string $emailFormData,
        MailerInterface $mailer,
        TranslatorInterface $translator,
    ): JsonResponse
    {
        $user = $this->entityManager->getRepository(User::class)->findOneBy([
            'email' => $emailFormData,
        ]);

        // return the same generic response even if the user doesn't exist, prevents email enumeration
        if (!$user) {
            return $this->json(['message' => 'If an account exists, an email has been sent.']);
        }

        try {
            $resetToken = $this->resetPasswordHelper->generateResetToken($user);
        } catch (ResetPasswordExceptionInterface $e) {
            // throws when a token was already generated recently (rate limiting),
            // return the same generic message so we don't accidentally reveal that
            return $this->json(['message' => 'If an account exists, an email has been sent.']);
        }

        $email = new TemplatedEmail()
            ->from(new Address($this->fromEmail, $this->fromName))
            ->to((string)$user->getEmail())
            ->subject('Your password reset request')
            ->htmlTemplate('emails/reset_password.html.twig')
            ->context([
                'resetToken' => $resetToken,
            ]);
        $mailer->send($email);

        return $this->json(['message' => 'If an account exists, an email has been sent.']);
    }
}
