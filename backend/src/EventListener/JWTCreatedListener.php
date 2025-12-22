<?php

namespace App\EventListener;

use App\Entity\User;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTCreatedEvent;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\RequestStack;

class JWTCreatedListener
{
    /**
     * @var RequestStack
     */
    private RequestStack $requestStack;

    /**
     * @param RequestStack $requestStack
     */
    public function __construct(RequestStack $requestStack)
    {
        $this->requestStack = $requestStack;
    }

    /**
     * @param JWTCreatedEvent $event
     *
     * @return void
     */
    #[AsEventListener(event: 'lexik_jwt_authentication.on_jwt_created')]
    public function onJWTCreated(JWTCreatedEvent $event): void
    {
        $request = $this->requestStack->getCurrentRequest();

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
        $payload['ip'] = $request?->getClientIp();

        $event->setData($payload);

//        $header = $event->getHeader();
//        $header['cty'] = 'JWT';
//        $event->setHeader($header);
    }
}
