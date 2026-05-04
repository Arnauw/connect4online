<?php

namespace App\EventListener;

use App\Entity\User;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTCreatedEvent;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\RequestStack;

class JWTCreatedListener
{
    public function __construct(private readonly RequestStack $requestStack)
    {
    }

    #[AsEventListener(event: 'lexik_jwt_authentication.on_jwt_created')]
    public function onJWTCreated(JWTCreatedEvent $event): void
    {
        $user = $event->getUser();
        if (!$user instanceof User) {
            return;
        }

        $payload = $event->getData();

        $payload['id'] = $user->getId();
        $payload['email'] = $user->getEmail();
        $payload['username'] = $user->getUsername();
        $payload['elo'] = $user->getElo();
        $payload['avatar'] = $user->getAvatar();
        $payload['roles'] = $user->getRoles();
        $payload['settings'] = $user->getSettings();

        $event->setData($payload);
    }
}
