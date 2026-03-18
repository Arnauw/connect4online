<?php

namespace App\Controller;

use App\Entity\Game;
use App\Entity\User;
use App\Service\GameEngine;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/game')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class GameController extends AbstractController
{
    public function __construct(private EntityManagerInterface $em) {}

    #[Route('/create', name: 'api_game_create', methods: ['POST'])]
    public function create(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $game = new Game();
        $game->setPlayer1($user);
        $game->setStatus('WAITING');
        $game->setCurrentTurn(1);

        $emptyBoard = array_fill(0, 6, array_fill(0, 7, 0));
        $game->setBoard($emptyBoard);

        $code = strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));
        $game->setRoomCode($code);

        $this->em->persist($game);
        $this->em->flush();

        return $this->json([
            'id' => $game->getId(),
            'roomCode' => $game->getRoomCode(),
            'message' => 'Game created. Waiting for opponent.'
        ], 201);
    }

    #[Route('/join/{code}', name: 'api_game_join', methods: ['POST'])]
    public function join(string $code, HubInterface $hub): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $game = $this->em->getRepository(Game::class)->findOneBy([
            'roomCode' => strtoupper($code)
        ]);

        if (!$game) {
            return $this->json(['error' => 'Room not found.'], 404);
        }

        if ($game->getStatus() !== 'WAITING') {
            return $this->json(['error' => 'This room is already full or finished.'], 400);
        }

        if ($game->getPlayer1() === $user) {
            return $this->json(['error' => 'You cannot join your own room.'], 400);
        }

        $game->setPlayer2($user);
        $game->setStatus('PLAYING');

        $this->em->flush();

        // 🔔 MERCURE EVENT: Notify Player 1 that the game is starting!
        // We use the roomCode as the unique radio frequency/topic
        $topic = 'https://connect4.online/room/' . $game->getRoomCode();
        $update = new Update(
            $topic,
            json_encode([
                'type' => 'GAME_STARTED',
                'player2' => $user->getUsername(),
                'gameId' => $game->getId()
            ])
        );
        $hub->publish($update);

        return $this->json([
            'id' => $game->getId(),
            'roomCode' => $game->getRoomCode(),
            'message' => 'Joined successfully. Game starting!'
        ]);
    }

    #[Route('/{code}/move', name: 'api_game_move', methods: ['POST'])]
    public function move(string $code, Request $request, HubInterface $hub, GameEngine $engine): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $game = $this->em->getRepository(Game::class)->findOneBy(['roomCode' => strtoupper($code)]);

        if (!$game || $game->getStatus() !== 'PLAYING') {
            return $this->json(['error' => 'Game is not active.'], 400);
        }

        // Identify which player is making the request (1 or 2)
        $playerNum = null;
        if ($game->getPlayer1() === $user) $playerNum = 1;
        if ($game->getPlayer2() === $user) $playerNum = 2;

        if (!$playerNum) {
            return $this->json(['error' => 'You are not a player in this game.'], 403);
        }

        // Is it their turn?
        if ($game->getCurrentTurn() !== $playerNum) {
            return $this->json(['error' => 'Not your turn!'], 400);
        }

        // Get the asked column for the move
        $data = json_decode($request->getContent(), true);
        $col = $data['col'] ?? null;

        if ($col === null) {
            return $this->json(['error' => 'Column missing.'], 400);
        }

        // Apply the Move using the Engine
        $board = $game->getBoard();
        $row = $engine->dropPiece($board, $col, $playerNum);

        if ($row === -1) {
            return $this->json(['error' => 'Invalid move or column full.'], 400);
        }

        // Save the updated board
        $game->setBoard($board);

        // Check for Win or Draw
        $isWin = $engine->checkWin($board, $row, $col, $playerNum);
        $isDraw = !$isWin && $engine->checkDraw($board);

        if ($isWin) {
            $game->setStatus('FINISHED');
            $game->setWinner($user);
        } elseif ($isDraw) {
            $game->setStatus('FINISHED'); // Or 'DRAW' if you added that to your statuses
        } else {
            // Switch turns
            $game->setCurrentTurn($playerNum === 1 ? 2 : 1);
        }

        $this->em->flush();

        // Broadcast the new state to both players via Mercure
        $topic = 'https://connect4.online/room/' . $game->getRoomCode();

        $update = new Update(
            $topic,
            json_encode([
                'type' => 'BOARD_UPDATED',
                'board' => $game->getBoard(),
                'currentTurn' => $game->getCurrentTurn(),
                'status' => $game->getStatus(),
                'winnerId' => $game->getWinner()?->getId()
            ])
        );
        $hub->publish($update);

        return $this->json(['message' => 'Move accepted']);
    }

    #[Route('/{code}', name: 'api_game_get', methods: ['GET'])]
    public function getGame(string $code): JsonResponse
    {
        $game = $this->em->getRepository(Game::class)->findOneBy(['roomCode' => strtoupper($code)]);

        if (!$game) {
            return $this->json(['error' => 'Game not found.'], 404);
        }

        $user = $this->getUser();
        $myPlayerNum = null;
        if ($game->getPlayer1() === $user) $myPlayerNum = 1;
        if ($game->getPlayer2() === $user) $myPlayerNum = 2;

        return $this->json([
            'board' => $game->getBoard(),
            'currentTurn' => $game->getCurrentTurn(),
            'status' => $game->getStatus(),
            'myPlayerNum' => $myPlayerNum,
            'player1' => $game->getPlayer1()?->getUsername(),
            'player2' => $game->getPlayer2()?->getUsername(),
            'winnerId' => $game->getWinner()?->getId()
        ]);
    }
}
