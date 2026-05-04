<?php

namespace App\Controller;

use App\Entity\Game;
use App\Entity\User;
use App\Service\GameEngine;
use Doctrine\ORM\EntityManagerInterface;
use Lcobucci\JWT\Configuration;
use Lcobucci\JWT\Signer\Hmac\Sha256;
use Lcobucci\JWT\Signer\Key\InMemory;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

#[Route('/api/game')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class GameController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        #[Autowire('%env(MERCURE_JWT_SECRET)%')]
        private string $mercureJwtSecret,
    ) {}

    #[Route('/create', name: 'api_game_create', methods: ['POST'])]
    public function create(): JsonResponse
    {
        $user = $this->getUser();

        $game = new Game();
        $game->setPlayer1($user);
        $game->setStatus('WAITING');
        $game->setCurrentTurn(1);

        $emptyBoard = array_fill(0, 6, array_fill(0, 7, 0));
        $game->setBoard($emptyBoard);

        $code = strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
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
        $game->updateLastActivity();

        $this->em->flush();

        $topic = 'https://connect4.online/room/' . $game->getRoomCode();
        $update = new Update(
            $topic,
            json_encode([
                'type' => 'GAME_STARTED',
                'player2' => $user->getUsername(),
                'gameId' => $game->getId()
            ]),
            private: true
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

        $playerNum = null;
        if ($game->getPlayer1() === $user) $playerNum = 1;
        if ($game->getPlayer2() === $user) $playerNum = 2;

        if (!$playerNum) {
            return $this->json(['error' => 'You are not a player in this game.'], 403);
        }

        if ($game->getCurrentTurn() !== $playerNum) {
            return $this->json(['error' => 'Not your turn!'], 400);
        }

        $data = json_decode($request->getContent(), true);
        $col = $data['col'] ?? null;

        if ($col === null) {
            return $this->json(['error' => 'Column missing.'], 400);
        }

        if (!is_int($col) || $col < 0 || $col >= 7) {
            return $this->json(['error' => 'Invalid column (0-6 required)'], 400);
        }

        $board = $game->getBoard();
        $row = $engine->dropPiece($board, $col, $playerNum);

        if ($row === -1) {
            return $this->json(['error' => 'Invalid move or column full.'], 400);
        }

        $game->setBoard($board);

        $winningLine = $engine->checkWin($board, $row, $col, $playerNum);
        $isWin = $winningLine !== null;
        $isDraw = !$isWin && $engine->checkDraw($board);

        if ($isWin) {
            $game->setStatus('FINISHED');
            $game->setWinner($user);
            $game->setWinningLine($winningLine);
            $game->setP1WantsRematch(false);
            $game->setP2WantsRematch(false);
            $game->setP1HasLeft(false);
            $game->setP2HasLeft(false);

            if ($playerNum === 1) {
                $game->setScoreP1($game->getScoreP1() + 1);
            } else {
                $game->setScoreP2($game->getScoreP2() + 1);
            }
        } elseif ($isDraw) {
            $game->setStatus('FINISHED');
            $game->setP1WantsRematch(false);
            $game->setP2WantsRematch(false);
            $game->setP1HasLeft(false);
            $game->setP2HasLeft(false);
        } else {
            $game->setCurrentTurn($playerNum === 1 ? 2 : 1);
        }

        $game->updateLastActivity();
        $this->em->flush();

        $topic = 'https://connect4.online/room/' . $game->getRoomCode();

        $update = new Update(
            $topic,
            json_encode([
                'type' => 'BOARD_UPDATED',
                'board' => $game->getBoard(),
                'currentTurn' => $game->getCurrentTurn(),
                'status' => $game->getStatus(),
                'winnerId' => $game->getWinner()?->getId(),
                'winningLine' => $game->getWinningLine(),
                'scoreP1' => $game->getScoreP1(),
                'scoreP2' => $game->getScoreP2()
            ], JSON_THROW_ON_ERROR),
            private: true
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

        if ($myPlayerNum === null) {
            return $this->json(['error' => 'You are not a player in this game.'], 403);
        }

        return $this->json([
            'board' => $game->getBoard(),
            'currentTurn' => $game->getCurrentTurn(),
            'status' => $game->getStatus(),
            'myPlayerNum' => $myPlayerNum,
            'player1' => $game->getPlayer1()?->getUsername(),
            'player1Avatar' => $game->getPlayer1()?->getAvatar(),
            'player2' => $game->getPlayer2()?->getUsername(),
            'player2Avatar' => $game->getPlayer2()?->getAvatar(),
            'winnerId' => $game->getWinner()?->getId(),
            'winningLine' => $game->getWinningLine(),
            'scoreP1' => $game->getScoreP1(),
            'scoreP2' => $game->getScoreP2(),
            'p1WantsRematch' => $game->isP1WantsRematch(),
            'p2WantsRematch' => $game->isP2WantsRematch(),
        ]);
    }

    #[Route('/{code}/rematch', name: 'api_game_rematch', methods: ['POST'])]
    public function requestRematch(string $code, HubInterface $hub): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $game = $this->em->getRepository(Game::class)->findOneBy(['roomCode' => strtoupper($code)]);

        if (!$game || $game->getStatus() !== 'FINISHED') {
            return $this->json(['error' => 'Game is not finished.'], 400);
        }

        $playerNum = null;
        if ($game->getPlayer1() === $user) $playerNum = 1;
        if ($game->getPlayer2() === $user) $playerNum = 2;

        if (!$playerNum) {
            return $this->json(['error' => 'Not a player.'], 403);
        }

        if ($playerNum === 1) $game->setP1WantsRematch(true);
        if ($playerNum === 2) $game->setP2WantsRematch(true);

        $topic = 'https://connect4.online/room/' . $game->getRoomCode();

        if ($game->isP1WantsRematch() && $game->isP2WantsRematch()) {
            $nextTurn = 1;
            if ($game->getWinner() === $game->getPlayer1()) {
                $nextTurn = 2;
            } elseif ($game->getWinner() === $game->getPlayer2()) {
                $nextTurn = 1;
            } else {
                $nextTurn = $game->getCurrentTurn() === 1 ? 2 : 1;
            }

            $game->setBoard(array_fill(0, 6, array_fill(0, 7, 0)));
            $game->setStatus('PLAYING');
            $game->setWinner(null);
            $game->setWinningLine(null);
            $game->setP1WantsRematch(false);
            $game->setP2WantsRematch(false);
            $game->setP1HasLeft(false);
            $game->setP2HasLeft(false);
            $game->setCurrentTurn($nextTurn);
            $game->updateLastActivity();

            $this->em->flush();

            $update = new Update($topic, json_encode([
                'type' => 'GAME_RESTARTED',
                'board' => $game->getBoard(),
                'currentTurn' => $game->getCurrentTurn(),
                'scoreP1' => $game->getScoreP1(),
                'scoreP2' => $game->getScoreP2()
            ], JSON_THROW_ON_ERROR), private: true);
            $hub->publish($update);

            return $this->json(['message' => 'Rematch starting!']);
        }

        $this->em->flush();

        $update = new Update($topic, json_encode([
            'type' => 'REMATCH_REQUESTED',
            'playerRequesting' => $playerNum
        ], JSON_THROW_ON_ERROR), private: true);
        $hub->publish($update);

        return $this->json(['message' => 'Rematch requested.']);
    }

    #[Route('/{code}/leave', name: 'api_game_leave', methods: ['POST'])]
    public function leave(string $code, HubInterface $hub): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $game = $this->em->getRepository(Game::class)->findOneBy(['roomCode' => strtoupper($code)]);

        if (!$game) {
            return $this->json(['error' => 'Game not found.'], 404);
        }

        $isPlayer1 = $game->getPlayer1() === $user;
        $isPlayer2 = $game->getPlayer2() === $user;

        // If not a player, just acknowledge (spectator case, shouldn't happen)
        if (!$isPlayer1 && !$isPlayer2) {
            return $this->json(['message' => 'Left as spectator.']);
        }

        $topic = 'https://connect4.online/room/' . $game->getRoomCode();

        if ($game->getStatus() === 'WAITING') {
            $this->em->remove($game);
            $this->em->flush();
            return $this->json(['message' => 'Room closed.']);
        }

        if ($game->getStatus() === 'PLAYING') {
            $game->setStatus('FINISHED');

            $winner = $isPlayer1 ? $game->getPlayer2() : $game->getPlayer1();
            $game->setWinner($winner);
            $game->setP1HasLeft(false);
            $game->setP2HasLeft(false);

            if ($winner === $game->getPlayer1()) {
                $game->setScoreP1($game->getScoreP1() + 1);
            } elseif ($winner === $game->getPlayer2()) {
                $game->setScoreP2($game->getScoreP2() + 1);
            }

            $this->em->flush();

            $update = new Update($topic, json_encode([
                'type' => 'OPPONENT_LEFT',
                'board' => $game->getBoard(),
                'currentTurn' => $game->getCurrentTurn(),
                'status' => $game->getStatus(),
                'winnerId' => $winner?->getId(),
                'scoreP1' => $game->getScoreP1(),
                'scoreP2' => $game->getScoreP2(),
                'message' => 'Your opponent fled the match. You win!'
            ], JSON_THROW_ON_ERROR), private: true);
            $hub->publish($update);

            return $this->json(['message' => 'You forfeited the match.']);
        }

        if ($game->getStatus() === 'FINISHED') {
            if ($isPlayer1) {
                $game->setP1HasLeft(true);
            } elseif ($isPlayer2) {
                $game->setP2HasLeft(true);
            }

            $this->em->flush();

            $playerNumWhoLeft = $isPlayer1 ? 1 : 2;
            $update = new Update($topic, json_encode([
                'type' => 'PLAYER_LEFT_FINISHED_GAME',
                'playerNum' => $playerNumWhoLeft
            ], JSON_THROW_ON_ERROR), private: true);
            $hub->publish($update);

            if ($game->isP1HasLeft() && $game->isP2HasLeft()) {
                $this->em->remove($game);
                $this->em->flush();
                return $this->json(['message' => 'Game deleted (both players left).']);
            }

            return $this->json(['message' => 'Left match.']);
        }

        return $this->json(['message' => 'Left match.']);
    }

    #[Route('/{code}/mercure-token', name: 'api_game_mercure_token', methods: ['GET'])]
    public function mercureToken(string $code): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $game = $this->em->getRepository(Game::class)->findOneBy(['roomCode' => strtoupper($code)]);

        if (!$game) {
            return $this->json(['error' => 'Game not found.'], 404);
        }

        $isPlayer = $game->getPlayer1() === $user || $game->getPlayer2() === $user;
        if (!$isPlayer) {
            return $this->json(['error' => 'Not a player in this game.'], 403);
        }

        $topic = 'https://connect4.online/room/' . $game->getRoomCode();

        $jwtConfig = Configuration::forSymmetricSigner(
            new Sha256(),
            InMemory::plainText($this->mercureJwtSecret)
        );

        $now = new \DateTimeImmutable();
        $token = $jwtConfig->builder()
            ->expiresAt($now->modify('+2 hours'))
            ->withClaim('mercure', ['subscribe' => [$topic]])
            ->getToken($jwtConfig->signer(), $jwtConfig->signingKey());

        return $this->json(['token' => $token->toString()]);
    }
}
