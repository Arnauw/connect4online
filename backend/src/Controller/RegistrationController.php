<?php

/**
 * RegistrationController
 *
 * Handles user account creation and email verification.
 *
 * Flow:
 * 1. Frontend POSTs email/username/password to /api/register
 * 2. Backend validates fields, hashes password, creates user (unverified)
 * 3. Sends verification email with a signed URL (SymfonyCasts VerifyEmail)
 * 4. User clicks link → GET /api/verify → sets isVerified=true → redirects to login page
 *
 * Security notes:
 * - Password is validated server-side (length, uppercase, lowercase, digit)
 * - Email uniqueness is enforced before user creation
 * - Unverified users cannot log in (enforced by UserChecker)
 */

namespace App\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use SymfonyCasts\Bundle\VerifyEmail\Exception\VerifyEmailExceptionInterface;
use SymfonyCasts\Bundle\VerifyEmail\VerifyEmailHelperInterface;

class RegistrationController extends AbstractController
{
    /**
     * POST /api/register
     *
     * Creates a new user account and sends a verification email.
     *
     * Request body: { "email": string, "username": string, "password": string }
     *
     * Password requirements (validated server-side to match frontend):
     * - At least 8 characters
     * - At least one uppercase letter
     * - At least one lowercase letter
     * - At least one digit
     *
     * Returns 201 on success, 400 on validation errors, 409 if email already in use.
     *
     * @throws TransportExceptionInterface if email delivery fails
     */
    #[Route('/api/register', name: 'api_register', methods: ['POST'])]
    public function register(
        Request                     $req,
        UserPasswordHasherInterface $hasher,
        EntityManagerInterface      $em,
        VerifyEmailHelperInterface  $verifyEmailHelper,
        MailerInterface             $mailer,
        #[Autowire(env: 'MAILER_REG_FROM_EMAIL')] string $fromEmail,
        #[Autowire(env: 'MAILER_REG_FROM_NAME')]  string $fromName,
    ): JsonResponse
    {
        // Parse and validate JSON body
        try {
            $data = json_decode($req->getContent(), true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            return $this->json(['error' => 'Invalid JSON'], 400);
        }

        $email    = $data['email']    ?? null;
        $username = $data['username'] ?? null;
        $password = $data['password'] ?? null;

        if (!$email || !$username || !$password) {
            return $this->json(['error' => 'Missing fields'], 400);
        }

        // Server-side username validation (mirrors frontend validateUsername())
        if (!preg_match('/^[a-zA-Z0-9_-]{3,20}$/', $username)) {
            return $this->json(['error' => 'Username must be 3-20 characters: letters, numbers, hyphens, underscores only'], 400);
        }

        // Server-side password strength validation (mirrors frontend validation.ts)
        if (strlen($password) < 8) {
            return $this->json(['error' => 'Password must be at least 8 characters long'], 400);
        }
        if (!preg_match('/[A-Z]/', $password)) {
            return $this->json(['error' => 'Password must contain at least one uppercase letter'], 400);
        }
        if (!preg_match('/[a-z]/', $password)) {
            return $this->json(['error' => 'Password must contain at least one lowercase letter'], 400);
        }
        if (!preg_match('/[0-9]/', $password)) {
            return $this->json(['error' => 'Password must contain at least one number'], 400);
        }

        // Check email uniqueness before creating the user
        $userExists = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if ($userExists) {
            return $this->json(['error' => 'Email already exists'], 409);
        }

        // Create the user — isVerified=false until they click the email link
        $user = new User();
        $user->setEmail($email);
        $user->setUsername($username);
        $user->setPassword($hasher->hashPassword($user, $password));
        $user->setIsVerified(false);

        $em->persist($user);
        $em->flush();

        // Generate a signed verification URL containing user ID and email as query params
        // The signature expires after the time configured in config/packages/verify_email.yaml
        $signatureComponents = $verifyEmailHelper->generateSignature(
            'api_verify_email',  // Route name that handles the click
            $user->getId(),
            $user->getEmail(),
            ['id' => $user->getId()]
        );

        // Send verification email using Twig template
        $email = new TemplatedEmail()
            ->from(new Address($fromEmail, $fromName))
            ->to($user->getEmail())
            ->subject('Initialize Account Sequence')
            ->htmlTemplate('emails/verify.html.twig')
            ->context([
                'signedUrl' => $signatureComponents->getSignedUrl(),
            ]);

        $mailer->send($email);

        return $this->json([
            'message' => 'User created. Please check your email to verify.',
            'id'      => $user->getId()
        ], 201);
    }

    /**
     * GET /api/verify
     *
     * Handles the verification link click from the email.
     * Validates the signed URL, marks the user as verified, then redirects to the login page.
     *
     * The signed URL contains: id, token, expires
     * SymfonyCasts validates the signature, expiry, and that the email matches.
     *
     * Redirects to the React frontend with query params on success or failure:
     * - Success: /#/login?verified=true
     * - Failure: /#/login?error=missing_id|user_not_found|invalid_token
     */
    #[Route('/api/verify', name: 'api_verify_email', methods: ['GET'])]
    public function verifyUserEmail(
        Request                    $request,
        VerifyEmailHelperInterface $verifyEmailHelper,
        EntityManagerInterface     $entityManager,
        #[Autowire(env: 'REACT_APP_URI')] string $reactAppUri
    ): Response
    {
        $id = $request->query->get('id');

        if (null === $id) {
            return $this->redirect($reactAppUri . '/#/login?error=missing_id');
        }

        $user = $entityManager->getRepository(User::class)->find($id);

        if (null === $user) {
            return $this->redirect($reactAppUri . '/#/login?error=user_not_found');
        }

        try {
            // Validates signature, expiry, and email binding
            $verifyEmailHelper->validateEmailConfirmationFromRequest($request, $user->getId(), $user->getEmail());
        } catch (VerifyEmailExceptionInterface $e) {
            return $this->redirect($reactAppUri . '/#/login?error=invalid_token');
        }

        // Mark account as verified — UserChecker will now allow login
        $user->setIsVerified(true);
        $entityManager->flush();

        return $this->redirect($reactAppUri . '/#/login?verified=true');
    }
}
