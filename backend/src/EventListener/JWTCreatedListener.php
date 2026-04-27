<?php

/**
 * JWTCreatedListener
 *
 * Enriches the JWT payload with additional user data beyond the default fields.
 *
 * By default, LexikJWTAuthenticationBundle only puts the "username" identifier
 * (email) in the token. This listener fires when a JWT is created (login or refresh)
 * and injects extra fields so the frontend can read them directly from the token
 * without making an extra /api/me call.
 *
 * Fields added to token payload:
 * - id       → database user ID (used for game relationships)
 * - email    → user's email address
 * - username → display name shown in-game
 * - elo      → ELO rating for matchmaking display
 * - avatar   → avatar emoji or filename
 * - roles    → Symfony roles array
 * - settings → user preferences (theme, music, sfx, volume)
 * - ip       → client IP at time of token creation
 */

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

    /**
     * Fires on the 'lexik_jwt_authentication.on_jwt_created' event.
     *
     * Modifies the JWT data array in-place to include profile and settings fields.
     * The modified payload is signed and becomes the final JWT sent to the client.
     */
    #[AsEventListener(event: 'lexik_jwt_authentication.on_jwt_created')]
    public function onJWTCreated(JWTCreatedEvent $event): void
    {
        $request = $this->requestStack->getCurrentRequest();

        $user = $event->getUser();
        if (!$user instanceof User) {
            return;
        }

        // Extend the default payload with app-specific fields
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
