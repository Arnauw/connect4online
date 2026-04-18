<?php

/**
 * ResetPasswordController
 *
 * Handles the "Forgot Password" flow using SymfonyCasts ResetPassword bundle.
 *
 * Flow:
 * 1. User submits email to POST /api/reset-password/request
 * 2. If account exists, generates a reset token and sends email with reset link
 * 3. Frontend parses token from URL, user submits token + new password to POST /api/reset-password/reset
 * 4. Token validated → password updated → token consumed (single-use)
 *
 * Security notes:
 * - "If an account exists, an email has been sent" response prevents user enumeration
 * - Reset tokens are single-use (consumed on successful reset)
 * - Token expiry is configured in config/packages/reset_password.yaml
 *
 * Note: This controller was adapted from Symfony's standard form-based template
 * to work as a stateless JSON API. The original form/redirect logic is preserved
 * in comments for reference.
 */

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
        private readonly EntityManagerInterface       $entityManager
    ) {}

    /**
     * POST /api/reset-password/request
     *
     * Initiates the password reset flow.
     * Looks up the user by email; if found, generates a reset token and sends the email.
     *
     * Always returns the same generic message regardless of whether the email exists —
     * this prevents user enumeration attacks (attacker cannot tell if an account exists).
     *
     * Request body: { "email": string }
     *
     * @throws \JsonException if request body is not valid JSON
     * @throws TransportExceptionInterface if email delivery fails
     */
    #[Route('/request', name: 'app_forgot_password_request', methods: ['POST'])]
    public function request(Request $request, MailerInterface $mailer, TranslatorInterface $translator): JsonResponse
    {
        $data  = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $email = $data['email'] ?? '';

        return $this->processSendingPasswordResetEmail($email, $mailer, $translator);
    }

    /**
     * POST /api/reset-password/reset
     *
     * Validates the reset token and updates the user's password.
     *
     * Request body: { "token": string, "password": string }
     *
     * The token comes from the reset link in the email (parsed by the frontend).
     * After a successful reset, the token is consumed and cannot be reused.
     *
     * @throws \JsonException if request body is not valid JSON
     */
    #[Route('/reset', name: 'app_reset_password', methods: ['POST'])]
    public function reset(Request $request, UserPasswordHasherInterface $passwordHasher, TranslatorInterface $translator): JsonResponse
    {
        $data          = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $token         = $data['token']    ?? null;
        $plainPassword = $data['password'] ?? null;

        if (!$token || !$plainPassword) {
            return $this->json(['error' => 'Missing token or password'], 400);
        }

        // Enforce same password strength rules as registration (mirrors RegistrationController)
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
            // Validates the token and returns the associated User
            // Throws ResetPasswordExceptionInterface if token is invalid, expired, or already used
            /** @var User $user */
            $user = $this->resetPasswordHelper->validateTokenAndFetchUser($token);
        } catch (ResetPasswordExceptionInterface $e) {
            return $this->json(['error' => sprintf('Invalid token: %s', $e->getReason())], 400);
        }

        // Consume the token so it cannot be reused
        $this->resetPasswordHelper->removeResetRequest($token);

        // Hash and save the new password
        $user->setPassword($passwordHasher->hashPassword($user, $plainPassword));
        $this->entityManager->flush();

        return $this->json(['message' => 'Password updated successfully.']);
    }

    /**
     * Looks up the user by email and sends a password reset email if found.
     * Called by the request() endpoint above.
     *
     * Returns a generic success message regardless of whether an account was found
     * to prevent user enumeration.
     *
     * @throws TransportExceptionInterface if email delivery fails
     */
    private function processSendingPasswordResetEmail(string $emailFormData, MailerInterface $mailer, TranslatorInterface $translator): JsonResponse
    {
        $user = $this->entityManager->getRepository(User::class)->findOneBy([
            'email' => $emailFormData,
        ]);

        // Return generic response even when user not found — prevents email enumeration
        if (!$user) {
            return $this->json(['message' => 'If an account exists, an email has been sent.']);
        }

        try {
            // Generate a time-limited, single-use reset token
            $resetToken = $this->resetPasswordHelper->generateResetToken($user);
        } catch (ResetPasswordExceptionInterface $e) {
            // Token generation may fail if a recent token already exists (throttle protection)
            // Return generic message to avoid leaking this information
            return $this->json(['message' => 'If an account exists, an email has been sent.']);
        }

        // Send email with reset link containing the token
        $email = new TemplatedEmail()
            ->from(new Address('no-reply@connect4online.com', 'Connect 4 Online'))
            ->to((string)$user->getEmail())
            ->subject('Your password reset request')
            ->htmlTemplate('emails/reset_password.html.twig')
            ->context([
                'resetToken' => $resetToken,  // Twig template uses this to build the reset URL
            ]);
        $mailer->send($email);

        return $this->json(['message' => 'If an account exists, an email has been sent.']);
    }
}
