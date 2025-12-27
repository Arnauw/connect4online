<?php

namespace App\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

class RegistrationController extends AbstractController
{
    /**
     * @throws \JsonException
     */
    #[Route('/register', name: 'app_register', methods: ['POST'])]
    public function index(
        Request $req,
        UserPasswordHasherInterface $hasher,
        EntityManagerInterface $em,
        MailerInterface $mailer,
    ): Response
    {
        $data = json_decode($req->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $postEmail = $data['email'] ?? null;
        $postUsername = $data['username'] ?? null;
        $postPassword = $data['password'] ?? null;

        if (array_key_exists('email', $data) && array_key_exists('password', $data)) {

            $userExists = $em->getRepository(User::class)->findOneBy(['email' => $postEmail]);
            if ($userExists) {
                return $this->json(['error' => 'Email already exists'], 409);
            }

            $newUser = new User();

            $trimedEmail = trim($postEmail);
            if (!filter_var($trimedEmail, FILTER_VALIDATE_EMAIL)) {
                return $this->json(['error' => 'Invalid email format'], 400);
            }
            $newUser->setEmail($trimedEmail);

            $trimedPassword= trim($postPassword);
            if (!empty($trimedPassword)){

                if (strlen($trimedPassword) < 6) {
                    return $this->json(['error' => 'Password is too short (min 6 characters)'], 400);
                }

                $hashedPassword = $hasher->hashPassword($newUser, $trimedPassword);
                $newUser->setPassword($hashedPassword);
            }

            $trimedUsername = trim($postUsername);
            if (!empty($trimedUsername)){

                if (strlen($trimedUsername) < 3) {
                    return $this->json(['error' => 'Username is too short (min 3 characters)'], 400);
                }
                $newUser->setUsername($trimedUsername);
            }

            $em->persist($newUser);
            $em->flush();

        }

//        dd($data);
//{
//	"email": "georges.lucas@gmail.com",
//	"password": "superPassword1234",
//	"username": "Le Boss du Puissance 4"
//}

//        $email = (new TemplatedEmail())
//            ->from('no-reply@connect4.com')
//            ->to($newUser->getEmail())
//            ->subject('Verify your email')
//            ->htmlTemplate('emails/verify.html.twig') // We need to create this
//            ->context([
//                'signedUrl' => $signatureComponents->getSignedUrl(),
//            ]);
//        $mailer->send($email);

        return $this->json([
            'message' => 'User created successfully',
            'id' => $newUser->getId(),
            'email' => $newUser->getEmail(),
            'username' => $newUser->getUsername(),
        ], 201);
    }
}

