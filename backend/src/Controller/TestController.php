<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class TestController extends AbstractController
{
    #[Route('/test', name: 'app_test')]
    public function index(): Response
    {
//        // Register mail
//        return $this->render('emails/verify.html.twig', [
//
//        ]);

//        // Recover Password Mail
        return $this->render('emails/reset_password.html.twig', [

        ]);
    }
}
