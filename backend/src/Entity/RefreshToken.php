<?php

/**
 * RefreshToken Entity
 *
 * Stores JWT refresh tokens in the database.
 * Used by the GesdinetJWTRefreshTokenBundle to issue new access tokens
 * when the short-lived JWT expires, without requiring the user to log in again.
 *
 * Token lifecycle:
 * 1. User logs in → receives JWT (short-lived) + refresh token (long-lived)
 * 2. JWT expires → frontend sends refresh token to /api/token/refresh
 * 3. Bundle validates refresh token → issues new JWT + new refresh token
 * 4. Old refresh token is consumed
 *
 * All logic is in BaseRefreshToken from the bundle.
 * This class just provides the Doctrine entity mapping and table name.
 */

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Gesdinet\JWTRefreshTokenBundle\Entity\RefreshToken as BaseRefreshToken;

#[ORM\Entity]
#[ORM\Table(name: 'refresh_tokens')]
class RefreshToken extends BaseRefreshToken
{
    // No additional fields — all logic is inherited from BaseRefreshToken
}
