<?php

namespace App\Entity;

use App\Repository\GameRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: GameRepository::class)]
class Game
{
////    Add this for the default board when creating new game
////    Already handled by Controller but it's best pratice.
//    public function __construct()
//    {
//        $this->board = array_fill(0, 6, array_fill(0, 7, 0));
//        $this->status = 'WAITING';
//        $this->currentTurn = 1;
//    }

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
}
