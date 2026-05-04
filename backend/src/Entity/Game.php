<?php

namespace App\Entity;

use App\Repository\GameRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: GameRepository::class)]
class Game
{
    public function __construct()
    {
        $this->board = array_fill(0, 6, array_fill(0, 7, 0));
        $this->status = 'WAITING';
        $this->currentTurn = 1;
        $this->scoreP1 = 0;
        $this->scoreP2 = 0;
        $this->p1WantsRematch = false;
        $this->p2WantsRematch = false;
        $this->createdAt = new \DateTime();
        $this->p1HasLeft = false;
        $this->p2HasLeft = false;
        $this->lastActivityAt = new \DateTime();
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'games')]
    private ?User $player1 = null;

    #[ORM\ManyToOne]
    private ?User $player2 = null;

    #[ORM\ManyToOne]
    private ?User $winner = null;

    #[ORM\Column(nullable: true)]
    private ?array $board = null;

    #[ORM\Column(nullable: true)]
    private ?int $currentTurn = null;

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $status = null;

    #[ORM\Column(length: 10, nullable: true)]
    private ?string $roomCode = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $winningLine = null;

    #[ORM\Column(nullable: true)]
    private ?int $scoreP1 = null;

    #[ORM\Column(nullable: true)]
    private ?int $scoreP2 = null;

    #[ORM\Column(nullable: true)]
    private ?bool $p1WantsRematch = null;

    #[ORM\Column(nullable: true)]
    private ?bool $p2WantsRematch = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $createdAt = null;

    #[ORM\Column(nullable: true)]
    private ?bool $p1HasLeft = null;

    #[ORM\Column(nullable: true)]
    private ?bool $p2HasLeft = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $lastActivityAt = null;

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
