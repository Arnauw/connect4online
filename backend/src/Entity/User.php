<?php

/**
 * User Entity
 *
 * Represents a registered user in the database.
 * Implements Symfony's UserInterface and PasswordAuthenticatedUserInterface
 * so Symfony's security system can handle authentication automatically.
 *
 * Key features:
 * - Email as unique login identifier
 * - Hashed password (never stored plain text)
 * - ELO rating for matchmaking
 * - JSON settings (theme, music, sfx, volume)
 * - Emoji avatar stored as string
 * - Email verification tracking
 * - OneToMany relationship to games played as Player 1
 */

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\HttpFoundation\File\File;
use Vich\UploaderBundle\Mapping\Attribute as Vich;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: '`user`')]  // Backticks needed - "user" is reserved word in SQL
#[ORM\UniqueConstraint(name: 'UNIQ_IDENTIFIER_EMAIL', fields: ['email'])]  // Email must be unique
#[Vich\Uploadable]  // Enables VichUploader for avatar file handling
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    /**
     * Constructor - Set safe defaults for new users
     */
    public function __construct()
    {
        $this->roles = ['ROLE_USER'];           // All users get basic role
        $this->avatar = 'default-avatar.jpg';   // Default avatar before user picks one
        $this->elo = 1000;                      // Standard starting ELO rating
        $this->settings = [                     // Default settings
            'theme' => 'dark-neon',
            'music' => true,
            'volume' => 50,
        ];
        $this->isVerified = false;              // Must verify email before playing online
        $this->games = new ArrayCollection();   // Initialize empty game collection
    }

    // ==================
    // PRIMARY KEY
    // ==================

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    // ==================
    // AUTHENTICATION FIELDS
    // ==================

    /** @var string|null Email used for login (unique, required) */
    #[ORM\Column(length: 180)]
    private ?string $email = null;

    /**
     * @var list<string> Symfony roles array (e.g., ['ROLE_USER', 'ROLE_ADMIN'])
     * Stored as JSON in database
     */
    #[ORM\Column]
    private array $roles = [];

    /**
     * @var string|null Bcrypt/Argon2 hashed password
     * Never store or log plain text passwords
     */
    #[ORM\Column]
    private ?string $password = null;

    // ==================
    // PROFILE FIELDS
    // ==================

    /** @var string|null Display name shown in games and leaderboard */
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $username = null;

    /**
     * @var int|null ELO rating for matchmaking (starts at 1000)
     * Higher = better player
     */
    #[ORM\Column(nullable: true)]
    private ?int $elo = null;

    /**
     * @var array|null User preferences stored as JSON
     * Keys: theme, music, sfx, volume
     */
    #[ORM\Column(nullable: true)]
    private ?array $settings = null;

    /**
     * @var bool|null Whether user verified their email
     * Unverified users cannot play online games
     */
    #[ORM\Column(nullable: true)]
    private ?bool $isVerified = null;

    /**
     * @var string|null Avatar - stored as emoji string (e.g., "🎮", "👾")
     * Previously was a filename, now uses emoji picker
     */
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $avatar = null;

    /**
     * @var File|null Transient file object for VichUploader
     * NOT persisted to database - only used during upload process
     * Triggers updatedAt change to force Doctrine event listener
     */
    #[Vich\UploadableField(mapping: 'user_avatar', fileNameProperty: 'avatar')]
    private ?File $avatarFile = null;

    /**
     * @var \DateTimeImmutable|null Last time user was updated
     * Required by VichUploader to detect file changes
     */
    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $updatedAt = null;

    // ==================
    // RELATIONSHIPS
    // ==================

    /**
     * @var Collection<int, Game> Games where this user is Player 1 (host)
     * OneToMany: One user can host many games
     */
    #[ORM\OneToMany(targetEntity: Game::class, mappedBy: 'player1')]
    private Collection $games;

    // ==================
    // SYMFONY SECURITY INTERFACE METHODS
    // ==================

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = $email;
        return $this;
    }

    /**
     * Returns the identifier Symfony uses to represent this user
     * We use email as the unique identifier (not username)
     *
     * @see UserInterface
     */
    public function getUserIdentifier(): string
    {
        return (string)$this->email;
    }

    /**
     * Returns all roles for this user
     * Always includes ROLE_USER as minimum
     *
     * @see UserInterface
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        // Every user always has at least ROLE_USER
        $roles[] = 'ROLE_USER';
        return array_unique($roles);
    }

    /** @param list<string> $roles */
    public function setRoles(array $roles): static
    {
        $this->roles = $roles;
        return $this;
    }

    /**
     * Returns hashed password for Symfony's password verification
     *
     * @see PasswordAuthenticatedUserInterface
     */
    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): static
    {
        $this->password = $password;
        return $this;
    }

    /**
     * Prevents actual password hash from leaking into session storage
     * Uses CRC32C hash of the password hash instead of the real hash
     * Required since Symfony 7.3
     */
    public function __serialize(): array
    {
        $data = (array)$this;
        $data["\0" . self::class . "\0password"] = hash('crc32c', $this->password);
        return $data;
    }

    // ==================
    // PROFILE GETTERS/SETTERS
    // ==================

    public function getElo(): ?int
    {
        return $this->elo;
    }

    public function setElo(?int $elo): static
    {
        $this->elo = $elo;
        return $this;
    }

    public function getSettings(): ?array
    {
        return $this->settings;
    }

    public function setSettings(?array $settings): static
    {
        $this->settings = $settings;
        return $this;
    }

    public function getUsername(): ?string
    {
        return $this->username;
    }

    public function setUsername(?string $username): static
    {
        $this->username = $username;
        return $this;
    }

    public function isVerified(): ?bool
    {
        return $this->isVerified;
    }

    public function setIsVerified(?bool $isVerified): static
    {
        $this->isVerified = $isVerified;
        return $this;
    }

    /**
     * Sets the avatar file for upload via VichUploader
     * MUST update updatedAt to trigger Doctrine change detection
     * Without this, the file upload event won't fire
     */
    public function setAvatarFile(?File $avatarFile = null): void
    {
        $this->avatarFile = $avatarFile;

        if (null !== $avatarFile) {
            // Force Doctrine to detect a change so VichUploader event fires
            $this->updatedAt = new \DateTimeImmutable();
        }
    }

    public function getAvatar(): ?string
    {
        return $this->avatar;
    }

    public function setAvatar(?string $avatar): static
    {
        $this->avatar = $avatar;
        return $this;
    }

    public function getAvatarFile(): ?File
    {
        return $this->avatarFile;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(?\DateTimeImmutable $updatedAt): void
    {
        $this->updatedAt = $updatedAt;
    }

    // ==================
    // GAME COLLECTION METHODS
    // ==================

    /** @return Collection<int, Game> */
    public function getGames(): Collection
    {
        return $this->games;
    }

    /** Add game where this user is Player 1 */
    public function addGame(Game $game): static
    {
        if (!$this->games->contains($game)) {
            $this->games->add($game);
            $game->setPlayer1($this);
        }
        return $this;
    }

    /** Remove game from collection, clear Player 1 reference */
    public function removeGame(Game $game): static
    {
        if ($this->games->removeElement($game)) {
            // Only null the owning side if it still points to this user
            if ($game->getPlayer1() === $this) {
                $game->setPlayer1(null);
            }
        }
        return $this;
    }
}
