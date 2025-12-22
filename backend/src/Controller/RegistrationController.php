<?php

namespace App\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

class RegistrationController extends AbstractController
{
    /**
     * @throws \JsonException
     */
    #[Route('/register', name: 'app_register', methods: ['POST'])]
    public function index(Request $req, UserPasswordHasherInterface $hasher, EntityManagerInterface $em): Response
    {
        $data = json_decode($req->getContent(), true, 512, JSON_THROW_ON_ERROR);


        $emailExist = false;
        $passwordExist = false;
        if (array_key_exists('email', $data) && array_key_exists('password', $data)) {
            $emailExist = true;
            $passwordExist = true;

            $postedEmail = $data['email'];

            $userExists = $em->getRepository(User::class)->findOneBy(['email' => $postedEmail]);

            if ($userExists) {
                return $this->json(['error' => 'Email already exists'], 409);
            }

            dd('User can be created');


            $postedPassword = $data['password'];
        }

//        dd($data);

//{
//	"email": "georges.lucas@gmail.com",
//	"password": "superPassword1234",
//	"username": "Le Boss du Puissance 4"
//}

        return $this->json([
            'data' => $data,
            "array_key_exists('email, data) ?" => $emailExist,
            "array_key_exists('password', data) ?" => $passwordExist,
        ]);
    }
}
