<?php

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

        $userExists = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if ($userExists) {
            return $this->json(['error' => 'Email already exists'], 409);
        }

        // stays false until they click the link in the verification email
        $user = new User();
        $user->setEmail($email);
        $user->setUsername($username);
        $user->setPassword($hasher->hashPassword($user, $password));
        $user->setIsVerified(false);

        $em->persist($user);
        $em->flush();

        // build a signed URL with an expiry, the time window is in verify_email.yaml
        $signatureComponents = $verifyEmailHelper->generateSignature(
            'api_verify_email',  // Route name that handles the click
            $user->getId(),
            $user->getEmail(),
            ['id' => $user->getId()]
        );

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
            // checks the signature, expiry, and that the email still matches
            $verifyEmailHelper->validateEmailConfirmationFromRequest($request, $user->getId(), $user->getEmail());
        } catch (VerifyEmailExceptionInterface $e) {
            return $this->redirect($reactAppUri . '/#/login?error=invalid_token');
        }

        // flip the flag so UserChecker lets them log in
        $user->setIsVerified(true);
        $entityManager->flush();

        return $this->redirect($reactAppUri . '/#/login?verified=true');
    }
}
