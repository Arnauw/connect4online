<?php

/**
 * ResetPasswordRequest Entity
 *
 * Stores a pending password reset token in the database.
 * Used by the SymfonyCasts ResetPassword bundle to track active reset requests.
 *
 * Each row represents one reset token issued for one user.
 * Tokens are:
 * - Time-limited (expiry configured in reset_password.yaml)
 * - Single-use (consumed and deleted after successful password change)
 * - Rate-limited (the bundle prevents spamming reset requests)
 *
 * Most of the token handling logic lives in ResetPasswordRequestTrait,
 * provided by the SymfonyCasts bundle.
 */

namespace App\Entity;

use App\Repository\ResetPasswordRequestRepository;
use Doctrine\ORM\Mapping as ORM;
use SymfonyCasts\Bundle\ResetPassword\Model\ResetPasswordRequestInterface;
use SymfonyCasts\Bundle\ResetPassword\Model\ResetPasswordRequestTrait;

#[ORM\Entity(repositoryClass: ResetPasswordRequestRepository::class)]
class ResetPasswordRequest implements ResetPasswordRequestInterface
{
    use ResetPasswordRequestTrait;  // Provides: expiresAt, selector, hashedToken fields + getters

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    /** The user who requested the password reset */
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $user = null;

    /**
     * @param User $user          The user requesting the reset
     * @param \DateTimeInterface $expiresAt  When this token becomes invalid
     * @param string $selector    Public part of the token (used to look up the record)
     * @param string $hashedToken Hashed private part (compared against token in the URL)
     */
    public function __construct(User $user, \DateTimeInterface $expiresAt, string $selector, string $hashedToken)
    {
        $this->user = $user;
        $this->initialize($expiresAt, $selector, $hashedToken);  // From ResetPasswordRequestTrait
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): User
    {
        return $this->user;
    }
}
