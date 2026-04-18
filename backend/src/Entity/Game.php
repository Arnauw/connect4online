<?php

/**
 * Game Entity
 *
 * Represents an online multiplayer Connect4 game in the database.
 * Each record stores the complete state of one online game including:
 * - Players (host and opponent)
 * - Current board state
 * - Game status (WAITING, PLAYING, FINISHED)
 * - Scores for rematch sessions
 * - Room cleanup tracking
 *
 * Game Lifecycle:
 * 1. WAITING: Host created room, waiting for opponent to join
 * 2. PLAYING: Both players joined, game in progress
 * 3. FINISHED: Game ended (win/draw/forfeit), players can rematch or leave
 *
 * Cleanup Strategy:
 * - WAITING games: Deleted when host leaves/cancels
 * - FINISHED games: Deleted when both players have left
 */

namespace App\Entity;

use App\Repository\GameRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: GameRepository::class)]
class Game
{
    /**
     * Constructor - Initialize default values for new game
     * Sets up empty board, initial status, and default flags
     */
    public function __construct()
    {
        // Create empty 6x7 board filled with zeros
        $this->board = array_fill(0, 6, array_fill(0, 7, 0));

        // Game starts in WAITING state (waiting for opponent to join)
        $this->status = 'WAITING';

        // Player 1 (Red/Host) always starts first
        $this->currentTurn = 1;

        // Initialize scores to zero
        $this->scoreP1 = 0;
        $this->scoreP2 = 0;

        // Initialize rematch flags to false
        $this->p1WantsRematch = false;
        $this->p2WantsRematch = false;

        // Record creation timestamp
        $this->createdAt = new \DateTime();

        // Initialize left flags to false (both players present)
        $this->p1HasLeft = false;
        $this->p2HasLeft = false;

        // Track last activity for stale game cleanup
        $this->lastActivityAt = new \DateTime();
    }

    // ==================
    // PRIMARY KEY
    // ==================

    /** @var int|null Auto-incrementing primary key */
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    // ==================
    // PLAYER RELATIONSHIPS
    // ==================

    /**
     * @var User|null Player 1 (Red) - The host who created the room
     * ManyToOne: Many games can have the same user as player1
     */
    #[ORM\ManyToOne(inversedBy: 'games')]
    private ?User $player1 = null;

    /**
     * @var User|null Player 2 (Yellow) - The opponent who joined
     * Null until someone joins the room
     */
    #[ORM\ManyToOne]
    private ?User $player2 = null;

    /**
     * @var User|null The winner of the game
     * Null if game ongoing or ended in draw
     */
    #[ORM\ManyToOne]
    private ?User $winner = null;

    // ==================
    // GAME STATE
    // ==================

    /**
     * @var array|null Current board state as 2D array
     * Structure: [[0,0,0,0,0,0,0], [0,0,0,0,0,0,0], ...]
     * Values: 0 = empty, 1 = Player 1, 2 = Player 2
     * Stored as JSON in database
     */
    #[ORM\Column(nullable: true)]
    private ?array $board = null;

    /**
     * @var int|null Which player's turn it is (1 or 2)
     */
    #[ORM\Column(nullable: true)]
    private ?int $currentTurn = null;

    /**
     * @var string|null Current game status
     * Values: 'WAITING', 'PLAYING', 'FINISHED'
     */
    #[ORM\Column(length: 20, nullable: true)]
    private ?string $status = null;

    /**
     * @var string|null 6-character hex room code (e.g., "A3F7E2")
     * Used by opponent to join the game
     * Generated randomly on game creation
     */
    #[ORM\Column(length: 10, nullable: true)]
    private ?string $roomCode = null;

    /**
     * @var array|null Coordinates of the 4 winning pieces
     * Structure: [[row, col], [row, col], [row, col], [row, col]]
     * Used by frontend to highlight winning line
     * Null if no winner yet
     */
    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $winningLine = null;

    // ==================
    // REMATCH SYSTEM
    // ==================

    /**
     * @var int|null Player 1's score in the current rematch session
     * Incremented each time player 1 wins
     * Resets when players leave and game is deleted
     */
    #[ORM\Column(nullable: true)]
    private ?int $scoreP1 = null;

    /**
     * @var int|null Player 2's score in the current rematch session
     */
    #[ORM\Column(nullable: true)]
    private ?int $scoreP2 = null;

    /**
     * @var bool|null Whether Player 1 clicked "Rematch" button
     * When both players want rematch, game resets to PLAYING
     */
    #[ORM\Column(nullable: true)]
    private ?bool $p1WantsRematch = null;

    /**
     * @var bool|null Whether Player 2 clicked "Rematch" button
     */
    #[ORM\Column(nullable: true)]
    private ?bool $p2WantsRematch = null;

    // ==================
    // METADATA & CLEANUP
    // ==================

    /**
     * @var \DateTimeInterface|null Timestamp when game was created
     */
    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $createdAt = null;

    /**
     * @var bool|null Whether Player 1 has left a FINISHED game
     * When both players leave, game is deleted from database
     */
    #[ORM\Column(nullable: true)]
    private ?bool $p1HasLeft = null;

    /**
     * @var bool|null Whether Player 2 has left a FINISHED game
     */
    #[ORM\Column(nullable: true)]
    private ?bool $p2HasLeft = null;

    /**
     * @var \DateTimeInterface|null Timestamp of last meaningful game activity
     * Updated on: create, join, move, rematch
     * Used by CleanupStaleGamesCommand to delete abandoned rooms after 1 hour
     */
    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $lastActivityAt = null;

    // ==================
    // GETTERS & SETTERS
    // ==================

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getPlayer1(): ?User
    {
        return $this->player1;
    }

    public function setPlayer1(?User $player1): static
    {
        $this->player1 = $player1;
        return $this;
    }

    public function getPlayer2(): ?User
    {
        return $this->player2;
    }

    public function setPlayer2(?User $player2): static
    {
        $this->player2 = $player2;
        return $this;
    }

    public function getWinner(): ?User
    {
        return $this->winner;
    }

    public function setWinner(?User $winner): static
    {
        $this->winner = $winner;
        return $this;
    }

    public function getBoard(): ?array
    {
        return $this->board;
    }

    public function setBoard(?array $board): static
    {
        $this->board = $board;
        return $this;
    }

    public function getCurrentTurn(): ?int
    {
        return $this->currentTurn;
    }

    public function setCurrentTurn(?int $currentTurn): static
    {
        $this->currentTurn = $currentTurn;
        return $this;
    }

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(?string $status): static
    {
        $this->status = $status;
        return $this;
    }

    public function getRoomCode(): ?string
    {
        return $this->roomCode;
    }

    public function setRoomCode(?string $roomCode): static
    {
        $this->roomCode = $roomCode;
        return $this;
    }

    public function getWinningLine(): ?array
    {
        return $this->winningLine;
    }

    public function setWinningLine(?array $winningLine): static
    {
        $this->winningLine = $winningLine;
        return $this;
    }

    public function getScoreP1(): ?int
    {
        return $this->scoreP1;
    }

    public function setScoreP1(?int $scoreP1): static
    {
        $this->scoreP1 = $scoreP1;
        return $this;
    }

    public function getScoreP2(): ?int
    {
        return $this->scoreP2;
    }

    public function setScoreP2(?int $scoreP2): static
    {
        $this->scoreP2 = $scoreP2;
        return $this;
    }

    public function isP1WantsRematch(): ?bool
    {
        return $this->p1WantsRematch;
    }

    public function setP1WantsRematch(?bool $p1WantsRematch): static
    {
        $this->p1WantsRematch = $p1WantsRematch;
        return $this;
    }

    public function isP2WantsRematch(): ?bool
    {
        return $this->p2WantsRematch;
    }

    public function setP2WantsRematch(?bool $p2WantsRematch): static
    {
        $this->p2WantsRematch = $p2WantsRematch;
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeInterface $createdAt): static
    {
        $this->createdAt = $createdAt;
        return $this;
    }

    public function isP1HasLeft(): ?bool
    {
        return $this->p1HasLeft;
    }

    public function setP1HasLeft(?bool $p1HasLeft): static
    {
        $this->p1HasLeft = $p1HasLeft;
        return $this;
    }

    public function isP2HasLeft(): ?bool
    {
        return $this->p2HasLeft;
    }

    public function setP2HasLeft(?bool $p2HasLeft): static
    {
        $this->p2HasLeft = $p2HasLeft;
        return $this;
    }

    public function getLastActivityAt(): ?\DateTimeInterface
    {
        return $this->lastActivityAt;
    }

    public function setLastActivityAt(\DateTimeInterface $lastActivityAt): static
    {
        $this->lastActivityAt = $lastActivityAt;
        return $this;
    }

    public function updateLastActivity(): static
    {
        $this->lastActivityAt = new \DateTime();
        return $this;
    }
}
