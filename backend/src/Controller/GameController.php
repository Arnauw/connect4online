<?php

/**
 * GameController - Online Multiplayer Game Management
 *
 * This controller handles all API endpoints for online Connect4 games.
 * It manages the complete game lifecycle from room creation to cleanup.
 *
 * Endpoints:
 * - POST /api/game/create         - Create a new game room
 * - POST /api/game/join/{code}    - Join an existing room
 * - POST /api/game/{code}/move    - Make a move
 * - GET  /api/game/{code}         - Get current game state
 * - POST /api/game/{code}/rematch - Request/accept rematch
 * - POST /api/game/{code}/leave   - Leave/forfeit game
 *
 * Real-Time Communication (Mercure):
 * - Uses Mercure Hub for server-sent events (SSE)
 * - Events published to room-specific topics
 * - Frontend subscribes to receive live updates
 * - No polling needed - instant updates for both players
 *
 * Security:
 * - All endpoints require full authentication (IS_AUTHENTICATED_FULLY)
 * - Server validates all moves (prevents cheating)
 * - Players can only access games they're part of
 * - No spectating allowed
 */

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

// Base route for all game endpoints
#[Route('/api/game')]
// Require authentication for all endpoints in this controller
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class GameController extends AbstractController
{
    /**
     * Constructor - Inject EntityManager for database operations
     */
    public function __construct(private EntityManagerInterface $em) {}

    /**
     * CREATE GAME ROOM
     * POST /api/game/create
     *
     * Creates a new online game room with a random 6-character code.
     * The creator becomes Player 1 (Red) and waits for an opponent.
     *
     * Flow:
     * 1. Create new Game entity
     * 2. Set creator as Player 1
     * 3. Generate random room code (16.7M possible combinations)
     * 4. Save to database
     * 5. Return room code to creator
     *
     * Response: { id, roomCode, message }
     * Status: 201 Created
     */
    #[Route('/create', name: 'api_game_create', methods: ['POST'])]
    public function create(): JsonResponse
    {
        /** @var User $user - Get currently authenticated user */
        $user = $this->getUser();

        // Create new game instance (constructor sets defaults)
        $game = new Game();
        $game->setPlayer1($user);
        $game->setStatus('WAITING');  // Waiting for opponent to join
        $game->setCurrentTurn(1);      // Player 1 starts

        // Initialize empty 6x7 board
        $emptyBoard = array_fill(0, 6, array_fill(0, 7, 0));
        $game->setBoard($emptyBoard);

        // Generate random 6-character hex code (e.g., "A3F7E2")
        // Using 3 random bytes = 24 bits = 16,777,216 combinations
        // Much more secure than sequential codes
        $code = strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
        $game->setRoomCode($code);

        // Save game to database
        $this->em->persist($game);
        $this->em->flush();

        return $this->json([
            'id' => $game->getId(),
            'roomCode' => $game->getRoomCode(),
            'message' => 'Game created. Waiting for opponent.'
        ], 201);  // 201 = Created
    }

    /**
     * JOIN GAME ROOM
     * POST /api/game/join/{code}
     *
     * Allows a player to join an existing game room using the 6-character code.
     * The joiner becomes Player 2 (Yellow) and the game starts immediately.
     *
     * Security Checks:
     * - Room must exist
     * - Room must be in WAITING state (not already full/finished)
     * - Cannot join your own room
     *
     * Flow:
     * 1. Find game by room code
     * 2. Validate game state and permissions
     * 3. Add joiner as Player 2
     * 4. Change status to PLAYING
     * 5. Broadcast GAME_STARTED event to Player 1 (via Mercure)
     *
     * Mercure Event: Notifies Player 1 that opponent joined
     * Response: { id, roomCode, message }
     */
    #[Route('/join/{code}', name: 'api_game_join', methods: ['POST'])]
    public function join(string $code, HubInterface $hub): JsonResponse
    {
        /** @var User $user - Player trying to join */
        $user = $this->getUser();

        // Find game by room code (case-insensitive)
        $game = $this->em->getRepository(Game::class)->findOneBy([
            'roomCode' => strtoupper($code)
        ]);

        // Validation: Room must exist
        if (!$game) {
            return $this->json(['error' => 'Room not found.'], 404);
        }

        // Validation: Room must be waiting for a player
        if ($game->getStatus() !== 'WAITING') {
            return $this->json(['error' => 'This room is already full or finished.'], 400);
        }

        // Validation: Cannot join your own room
        if ($game->getPlayer1() === $user) {
            return $this->json(['error' => 'You cannot join your own room.'], 400);
        }

        // Add this user as Player 2 and start the game
        $game->setPlayer2($user);
        $game->setStatus('PLAYING');

        $this->em->flush();

        // MERCURE: Notify Player 1 that opponent joined
        // Player 1 is listening to this topic and will navigate to game board
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

    /**
     * MAKE A MOVE
     * POST /api/game/{code}/move
     * Body: { "col": 0-6 }
     *
     * Processes a player's move, validates it, updates the board, and checks for win/draw.
     * This is the core gameplay endpoint.
     *
     * Security & Validation:
     * - Game must exist and be in PLAYING state
     * - User must be one of the two players
     * - Must be player's turn
     * - Column must be valid (0-6) and not full
     *
     * Flow:
     * 1. Validate game state and permissions
     * 2. Validate move (correct turn, valid column)
     * 3. Apply move using GameEngine (server-side validation)
     * 4. Check for win condition
     * 5. Check for draw condition
     * 6. Update scores if game ends
     * 7. Broadcast new board state to both players (via Mercure)
     *
     * Mercure Event: BOARD_UPDATED - Sends complete game state to both players
     * Response: { message }
     *
     * @throws \JsonException
     */
    #[Route('/{code}/move', name: 'api_game_move', methods: ['POST'])]
    public function move(string $code, Request $request, HubInterface $hub, GameEngine $engine): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        // Find game by room code
        $game = $this->em->getRepository(Game::class)->findOneBy(['roomCode' => strtoupper($code)]);

        // Validation: Game must exist and be active
        if (!$game || $game->getStatus() !== 'PLAYING') {
            return $this->json(['error' => 'Game is not active.'], 400);
        }

        // Identify which player number the user is (1 or 2)
        $playerNum = null;
        if ($game->getPlayer1() === $user) $playerNum = 1;
        if ($game->getPlayer2() === $user) $playerNum = 2;

        // Validation: User must be a player in this game
        if (!$playerNum) {
            return $this->json(['error' => 'You are not a player in this game.'], 403);
        }

        // Validation: Must be player's turn
        if ($game->getCurrentTurn() !== $playerNum) {
            return $this->json(['error' => 'Not your turn!'], 400);
        }

        // Parse request body to get column index
        $data = json_decode($request->getContent(), true);
        $col = $data['col'] ?? null;

        // Validation: Column must be specified
        if ($col === null) {
            return $this->json(['error' => 'Column missing.'], 400);
        }

        // Validation: Column must be valid (0-6)
        if (!is_int($col) || $col < 0 || $col >= 7) {
            return $this->json(['error' => 'Invalid column (0-6 required)'], 400);
        }

        // Apply the move using GameEngine (modifies board array by reference)
        $board = $game->getBoard();
        $row = $engine->dropPiece($board, $col, $playerNum);

        // Validation: Move must be valid (column not full)
        if ($row === -1) {
            return $this->json(['error' => 'Invalid move or column full.'], 400);
        }

        // Save the updated board to database
        $game->setBoard($board);

        // Check if this move created a winning line
        $winningLine = $engine->checkWin($board, $row, $col, $playerNum);
        $isWin = $winningLine !== null;
        $isDraw = !$isWin && $engine->checkDraw($board);

        // Handle WIN condition
        if ($isWin) {
            $game->setStatus('FINISHED');
            $game->setWinner($user);
            $game->setWinningLine($winningLine);

            // Reset rematch and left flags for new game end state
            $game->setP1WantsRematch(false);
            $game->setP2WantsRematch(false);
            $game->setP1HasLeft(false);
            $game->setP2HasLeft(false);

            // Increment winner's score
            if ($playerNum === 1) {
                $game->setScoreP1($game->getScoreP1() + 1);
            } else {
                $game->setScoreP2($game->getScoreP2() + 1);
            }
        }
        // Handle DRAW condition
        elseif ($isDraw) {
            $game->setStatus('FINISHED');

            // Reset flags (no winner, but game is over)
            $game->setP1WantsRematch(false);
            $game->setP2WantsRematch(false);
            $game->setP1HasLeft(false);
            $game->setP2HasLeft(false);
        }
        // Game continues - switch turns
        else {
            $game->setCurrentTurn($playerNum === 1 ? 2 : 1);
        }

        // Save all changes to database
        $this->em->flush();

        // MERCURE: Broadcast updated game state to both players
        // Both players listen to this topic and update their UI instantly
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
            ], JSON_THROW_ON_ERROR)
        );
        $hub->publish($update);

        return $this->json(['message' => 'Move accepted']);
    }

    /**
     * GET GAME STATE
     * GET /api/game/{code}
     *
     * Retrieves the current state of a game.
     * Used when player refreshes page or navigates back to ongoing game.
     *
     * Security:
     * - Only actual players can view the game (no spectating)
     * - Returns player-specific data (myPlayerNum)
     *
     * Response: Complete game state with player info, board, scores, etc.
     */
    #[Route('/{code}', name: 'api_game_get', methods: ['GET'])]
    public function getGame(string $code): JsonResponse
    {
        // Find game by room code
        $game = $this->em->getRepository(Game::class)->findOneBy(['roomCode' => strtoupper($code)]);

        if (!$game) {
            return $this->json(['error' => 'Game not found.'], 404);
        }

        // Identify which player the user is
        $user = $this->getUser();
        $myPlayerNum = null;
        if ($game->getPlayer1() === $user) $myPlayerNum = 1;
        if ($game->getPlayer2() === $user) $myPlayerNum = 2;

        // Security: Prevent spectating - only actual players can view
        if ($myPlayerNum === null) {
            return $this->json(['error' => 'You are not a player in this game.'], 403);
        }

        // Return complete game state
        return $this->json([
            'board' => $game->getBoard(),
            'currentTurn' => $game->getCurrentTurn(),
            'status' => $game->getStatus(),
            'myPlayerNum' => $myPlayerNum,  // Tells frontend if they're P1 or P2
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

    /**
     * REQUEST REMATCH
     * POST /api/game/{code}/rematch
     *
     * Allows players to request a rematch after a game finishes.
     * When both players accept, the game board resets but scores persist.
     *
     * Rematch Logic:
     * - First click: Sets player's "wants rematch" flag, broadcasts request
     * - Second click (other player): Both flags set -> Game restarts
     *
     * Starting Player for Rematch:
     * - If there was a winner: Loser starts next game
     * - If draw: Alternate who starts
     *
     * Flow:
     * 1. Validate game is finished
     * 2. Set requesting player's rematch flag
     * 3. Check if both players want rematch
     * 4. If yes: Reset board, determine starter, broadcast GAME_RESTARTED
     * 5. If no: Broadcast REMATCH_REQUESTED to opponent
     *
     * @throws \JsonException
     */
    #[Route('/{code}/rematch', name: 'api_game_rematch', methods: ['POST'])]
    public function requestRematch(string $code, HubInterface $hub): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $game = $this->em->getRepository(Game::class)->findOneBy(['roomCode' => strtoupper($code)]);

        // Validation: Game must be finished
        if (!$game || $game->getStatus() !== 'FINISHED') {
            return $this->json(['error' => 'Game is not finished.'], 400);
        }

        // Identify which player is requesting
        $playerNum = null;
        if ($game->getPlayer1() === $user) $playerNum = 1;
        if ($game->getPlayer2() === $user) $playerNum = 2;

        if (!$playerNum) {
            return $this->json(['error' => 'Not a player.'], 403);
        }

        // Set this player's rematch flag
        if ($playerNum === 1) $game->setP1WantsRematch(true);
        if ($playerNum === 2) $game->setP2WantsRematch(true);

        $topic = 'https://connect4.online/room/' . $game->getRoomCode();

        // CHECK: Do BOTH players want a rematch?
        if ($game->isP1WantsRematch() && $game->isP2WantsRematch()) {

            // Determine who starts the next game (loser starts for fairness)
            $nextTurn = 1;  // Default to Player 1
            if ($game->getWinner() === $game->getPlayer1()) {
                $nextTurn = 2;  // Player 1 won, so Player 2 starts
            } elseif ($game->getWinner() === $game->getPlayer2()) {
                $nextTurn = 1;  // Player 2 won, so Player 1 starts
            } else {
                // Draw - alternate who starts
                $nextTurn = $game->getCurrentTurn() === 1 ? 2 : 1;
            }

            // Reset the game for rematch
            $game->setBoard(array_fill(0, 6, array_fill(0, 7, 0)));  // Empty board
            $game->setStatus('PLAYING');
            $game->setWinner(null);
            $game->setWinningLine(null);
            $game->setP1WantsRematch(false);
            $game->setP2WantsRematch(false);
            $game->setP1HasLeft(false);
            $game->setP2HasLeft(false);
            $game->setCurrentTurn($nextTurn);

            $this->em->flush();

            // MERCURE: Broadcast game restart to both players
            $update = new Update($topic, json_encode([
                'type' => 'GAME_RESTARTED',
                'board' => $game->getBoard(),
                'currentTurn' => $game->getCurrentTurn(),
                'scoreP1' => $game->getScoreP1(),
                'scoreP2' => $game->getScoreP2()
            ], JSON_THROW_ON_ERROR));
            $hub->publish($update);

            return $this->json(['message' => 'Rematch starting!']);
        }

        $this->em->flush();

        // Only ONE player has requested rematch so far
        // Broadcast to opponent that this player wants a rematch
        $update = new Update($topic, json_encode([
            'type' => 'REMATCH_REQUESTED',
            'playerRequesting' => $playerNum
        ], JSON_THROW_ON_ERROR));
        $hub->publish($update);

        return $this->json(['message' => 'Rematch requested.']);
    }

    /**
     * LEAVE GAME
     * POST /api/game/{code}/leave
     *
     * Handles players leaving games in different states.
     * Behavior depends on game status:
     *
     * WAITING State (host waiting for opponent):
     * - Delete the game immediately (no one joined yet)
     *
     * PLAYING State (game in progress):
     * - Leaving player forfeits
     * - Other player wins automatically
     * - Score updated for winner
     * - Broadcast OPPONENT_LEFT event
     *
     * FINISHED State (game already ended):
     * - Mark player as having left
     * - Broadcast to opponent that player left
     * - If BOTH players have left, delete game from database
     *
     * This cleanup strategy ensures:
     * - No abandoned WAITING rooms
     * - Forfeits are properly handled
     * - Finished games auto-delete when both players leave
     *
     * @throws \JsonException
     */
    #[Route('/{code}/leave', name: 'api_game_leave', methods: ['POST'])]
    public function leave(string $code, HubInterface $hub): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $game = $this->em->getRepository(Game::class)->findOneBy(['roomCode' => strtoupper($code)]);

        if (!$game) {
            return $this->json(['error' => 'Game not found.'], 404);
        }

        // Identify which player is leaving
        $isPlayer1 = $game->getPlayer1() === $user;
        $isPlayer2 = $game->getPlayer2() === $user;

        // If not a player, just acknowledge (spectator case, shouldn't happen)
        if (!$isPlayer1 && !$isPlayer2) {
            return $this->json(['message' => 'Left as spectator.']);
        }

        $topic = 'https://connect4.online/room/' . $game->getRoomCode();

        // CASE 1: WAITING State - Host cancels before opponent joins
        if ($game->getStatus() === 'WAITING') {
            // No one joined yet, just delete the room
            $this->em->remove($game);
            $this->em->flush();
            return $this->json(['message' => 'Room closed.']);
        }

        // CASE 2: PLAYING State - Someone forfeits during gameplay
        if ($game->getStatus() === 'PLAYING') {
            // Mark game as finished
            $game->setStatus('FINISHED');

            // Determine winner (the player who DIDN'T leave)
            $winner = $isPlayer1 ? $game->getPlayer2() : $game->getPlayer1();
            $game->setWinner($winner);

            // Reset left flags (game just ended)
            $game->setP1HasLeft(false);
            $game->setP2HasLeft(false);

            // Update score for the winner (they won by forfeit)
            if ($winner === $game->getPlayer1()) {
                $game->setScoreP1($game->getScoreP1() + 1);
            } elseif ($winner === $game->getPlayer2()) {
                $game->setScoreP2($game->getScoreP2() + 1);
            }

            $this->em->flush();

            // MERCURE: Notify opponent that they won by forfeit
            $update = new Update($topic, json_encode([
                'type' => 'OPPONENT_LEFT',
                'board' => $game->getBoard(),
                'currentTurn' => $game->getCurrentTurn(),
                'status' => $game->getStatus(),
                'winnerId' => $winner?->getId(),
                'scoreP1' => $game->getScoreP1(),
                'scoreP2' => $game->getScoreP2(),
                'message' => 'Your opponent fled the match. You win!'
            ], JSON_THROW_ON_ERROR));
            $hub->publish($update);

            return $this->json(['message' => 'You forfeited the match.']);
        }

        // CASE 3: FINISHED State - Player leaving post-game
        if ($game->getStatus() === 'FINISHED') {
            // Mark this player as having left
            if ($isPlayer1) {
                $game->setP1HasLeft(true);
            } elseif ($isPlayer2) {
                $game->setP2HasLeft(true);
            }

            $this->em->flush();

            // MERCURE: Notify opponent that this player left
            // This shows "PLAYER LEFT" bubble and hides Rematch button
            $playerNumWhoLeft = $isPlayer1 ? 1 : 2;
            $update = new Update($topic, json_encode([
                'type' => 'PLAYER_LEFT_FINISHED_GAME',
                'playerNum' => $playerNumWhoLeft
            ], JSON_THROW_ON_ERROR));
            $hub->publish($update);

            // If BOTH players have now left, delete the game
            if ($game->isP1HasLeft() && $game->isP2HasLeft()) {
                $this->em->remove($game);
                $this->em->flush();
                return $this->json(['message' => 'Game deleted (both players left).']);
            }

            return $this->json(['message' => 'Left match.']);
        }

        // Fallback (shouldn't reach here)
        return $this->json(['message' => 'Left match.']);
    }
}
