<?php

/**
 * UserChecker
 *
 * Symfony security hook that runs custom account validation checks
 * before and after authentication.
 *
 * Symfony calls checkPreAuth() before verifying the password.
 * If it throws, the login attempt is rejected with the given message.
 *
 * Used here to block unverified accounts from logging in —
 * users must click the email verification link before they can play.
 */

namespace App\Security;

use App\Entity\User as AppUser;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAccountStatusException;
use Symfony\Component\Security\Core\User\UserCheckerInterface;
use Symfony\Component\Security\Core\User\UserInterface;

class UserChecker implements UserCheckerInterface
{
    /**
     * Called before password verification during login.
     * Rejects the login with a human-readable message if the account is unverified.
     *
     * Only applies to our AppUser — other user types pass through unchecked.
     */
    public function checkPreAuth(UserInterface $user): void
    {
        if (!$user instanceof AppUser) {
            return;
        }

        if (!$user->isVerified()) {
            throw new CustomUserMessageAccountStatusException(
                'Account not activated. Please check your email inbox.'
            );
        }
    }

    /**
     * Called after successful authentication.
     * No additional post-auth checks needed currently.
     */
    public function checkPostAuth(UserInterface $user, TokenInterface|null $token = null): void
    {
        // No post-auth checks required.
    }
}
