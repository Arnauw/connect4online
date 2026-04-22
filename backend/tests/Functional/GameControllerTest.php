<?php

/**
 * GameControllerTest — Functional tests for the online game API.
 *
 * Uses Symfony's WebTestCase: each test sends real HTTP requests through the
 * full kernel (routing, security, controller, Doctrine). The DAMA DoctrineTestBundle
 * wraps every test in a transaction that is rolled back on teardown, so each test
 * starts with a clean database.
 *
 * Mercure Hub publish calls are real HTTP requests to the hub configured in .env.
 * These tests require Docker to be running (pnpm docker) so the Mercure hub is reachable.
 *
 * Covers:
 * - Authentication guards (unauthenticated → 401, non-player → 403)
 * - Room lifecycle: create, join, leave (WAITING / PLAYING / FINISHED)
 * - Move validation: wrong turn, full column, non-player
 * - Win detection via move endpoint
 * - Rematch flow: single request → REMATCH_REQUESTED, both accept → GAME_RESTARTED
 * - GET game state: own game vs outsider
 */

namespace App\Tests\Functional;

use App\Entity\Game;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\Attributes\Group;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

#[Group('mercure')]
class GameControllerTest extends WebTestCase
{
    /** Generate a real JWT token for a user so sequential auth switches work on the same client. */
    private function getToken(User $user): string
    {
        return static::getContainer()->get('lexik_jwt_authentication.jwt_manager')->create($user);
    }

    /** Create and persist a minimal User entity for use in tests. */
    private function createUser(EntityManagerInterface $em, string $email, string $username): User
    {
        $user = new User();
        $user->setEmail($email);
        $user->setUsername($username);
        $user->setPassword('hash');
        $em->persist($user);
        $em->flush();

        return $user;
    }

    /** Build and persist a Game entity in the given status. */
    private function createGame(
        EntityManagerInterface $em,
        User $player1,
        string $roomCode,
        string $status = 'PLAYING',
        ?User $player2 = null,
        ?array $board = null,
    ): Game {
        $game = new Game();
        $game->setPlayer1($player1);
        $game->setPlayer2($player2);
        $game->setStatus($status);
        $game->setCurrentTurn(1);
        $game->setBoard($board ?? array_fill(0, 6, array_fill(0, 7, 0)));
        $game->setRoomCode($roomCode);
        $em->persist($game);
        $em->flush();

        return $game;
    }

    // -------------------------------------------------------------------------
    // Authentication guards
    // -------------------------------------------------------------------------

    /** Unauthenticated requests to any game endpoint must return 401. */
    public function testCreateGameUnauthenticated(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/game/create');

        self::assertResponseStatusCodeSame(401);
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    /** Creating a room returns 201, a room code, and persists the game in WAITING status. */
    public function testCreateGame(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $user = $this->createUser($em, 'creator@example.com', 'creator');
        $client->loginUser($user);

        $client->request('POST', '/api/game/create');

        self::assertResponseStatusCodeSame(201);
        $data = json_decode($client->getResponse()->getContent(), true);

        self::assertArrayHasKey('id', $data);
        self::assertArrayHasKey('roomCode', $data);
        self::assertSame('Game created. Waiting for opponent.', $data['message']);

        $game = $em->getRepository(Game::class)->find($data['id']);
        self::assertNotNull($game);
        self::assertSame('WAITING', $game->getStatus());
        self::assertSame($user, $game->getPlayer1());
        self::assertNull($game->getPlayer2());
    }

    // -------------------------------------------------------------------------
    // Join
    // -------------------------------------------------------------------------

    /** Player 2 joining a WAITING room sets status to PLAYING and assigns them. */
    public function testJoinGame(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $player1 = $this->createUser($em, 'p1@example.com', 'p1');
        $player2 = $this->createUser($em, 'p2@example.com', 'p2');
        $game = $this->createGame($em, $player1, 'ABCD', 'WAITING');

        $client->loginUser($player2);
        $client->request('POST', '/api/game/join/ABCD');

        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertSame('Joined successfully. Game starting!', $data['message']);

        $em->refresh($game);
        self::assertSame('PLAYING', $game->getStatus());
        self::assertSame($player2, $game->getPlayer2());
    }

    /** The creator cannot join their own room. */
    public function testCannotJoinOwnRoom(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $user = $this->createUser($em, 'host@example.com', 'host');
        $this->createGame($em, $user, 'SELF', 'WAITING');

        $client->loginUser($user);
        $client->request('POST', '/api/game/join/SELF');

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertSame('You cannot join your own room.', $data['error']);
    }

    // -------------------------------------------------------------------------
    // Get game state
    // -------------------------------------------------------------------------

    /** GET /api/game/:code returns full game state for an actual player. */
    public function testGetGameState(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $player1 = $this->createUser($em, 'gs1@example.com', 'gs1');
        $player2 = $this->createUser($em, 'gs2@example.com', 'gs2');
        $this->createGame($em, $player1, 'GETG', 'PLAYING', $player2);

        $client->loginUser($player1);
        $client->request('GET', '/api/game/GETG');

        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertSame(1, $data['myPlayerNum']);
        self::assertSame('PLAYING', $data['status']);
        self::assertSame('gs2', $data['player2']);
        self::assertArrayHasKey('board', $data);
    }

    /** A user who is not part of the game cannot read its state. */
    public function testGetGameNonPlayer(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $player1 = $this->createUser($em, 'gn1@example.com', 'gn1');
        $player2 = $this->createUser($em, 'gn2@example.com', 'gn2');
        $outsider = $this->createUser($em, 'gnout@example.com', 'gnout');
        $this->createGame($em, $player1, 'GNPL', 'PLAYING', $player2);

        $client->loginUser($outsider);
        $client->request('GET', '/api/game/GNPL');

        self::assertResponseStatusCodeSame(403);
    }

    // -------------------------------------------------------------------------
    // Move validation
    // -------------------------------------------------------------------------

    /** A player who is not part of the game cannot submit moves. */
    public function testNonPlayerCannotMove(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $player1  = $this->createUser($em, 'np1@example.com', 'np1');
        $player2  = $this->createUser($em, 'np2@example.com', 'np2');
        $outsider = $this->createUser($em, 'npout@example.com', 'npout');
        $this->createGame($em, $player1, 'NPLY', 'PLAYING', $player2);

        $client->loginUser($outsider);
        $client->request('POST', '/api/game/NPLY/move', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode(['col' => 3]));

        self::assertResponseStatusCodeSame(403);
    }

    /** Player 2 cannot move when it is Player 1's turn. */
    public function testInvalidMoveNotTurn(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $player1 = $this->createUser($em, 'm1@example.com', 'm1');
        $player2 = $this->createUser($em, 'm2@example.com', 'm2');
        $this->createGame($em, $player1, 'MOVE', 'PLAYING', $player2);

        $client->loginUser($player2);
        $client->request('POST', '/api/game/MOVE/move', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode(['col' => 3]));

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertSame('Not your turn!', $data['error']);
    }

    /** Dropping a piece into an already-full column returns a 400 error. */
    public function testMoveOnFullColumn(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $player1 = $this->createUser($em, 'fc1@example.com', 'fc1');
        $player2 = $this->createUser($em, 'fc2@example.com', 'fc2');

        $board = array_fill(0, 6, array_fill(0, 7, 0));
        for ($r = 0; $r < 6; $r++) {
            $board[$r][3] = ($r % 2) + 1; // fill column 3 with alternating pieces
        }

        $this->createGame($em, $player1, 'FULL', 'PLAYING', $player2, $board);

        $client->loginUser($player1);
        $client->request('POST', '/api/game/FULL/move', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode(['col' => 3]));

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertSame('Invalid move or column full.', $data['error']);
    }

    /** A valid move is accepted, the turn switches, and the board is updated in the DB. */
    public function testValidMove(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $player1 = $this->createUser($em, 'v1@example.com', 'v1');
        $player2 = $this->createUser($em, 'v2@example.com', 'v2');
        $game    = $this->createGame($em, $player1, 'VALI', 'PLAYING', $player2);

        $client->loginUser($player1);
        $client->request('POST', '/api/game/VALI/move', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode(['col' => 3]));

        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertSame('Move accepted', $data['message']);

        $em->refresh($game);
        self::assertSame(2, $game->getCurrentTurn());
        $board = $game->getBoard();
        self::assertSame(1, $board[5][3]); // gravity drops to bottom row
    }

    /**
     * When a move completes a 4-in-a-row, the game status becomes FINISHED,
     * the correct player is set as winner, and their score is incremented.
     *
     * Setup: P1 already has three pieces stacked in column 0 (rows 5, 4, 3).
     * P1 drops into column 0 → piece lands at row 2 → vertical win.
     */
    public function testWinDetectionOnMove(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $player1 = $this->createUser($em, 'win1@example.com', 'win1');
        $player2 = $this->createUser($em, 'win2@example.com', 'win2');

        $board = array_fill(0, 6, array_fill(0, 7, 0));
        $board[5][0] = 1;
        $board[4][0] = 1;
        $board[3][0] = 1; // three-in-a-column, one more will win

        $game = $this->createGame($em, $player1, 'WINN', 'PLAYING', $player2, $board);

        $client->loginUser($player1);
        $client->request('POST', '/api/game/WINN/move', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode(['col' => 0]));

        self::assertResponseIsSuccessful();

        $em->refresh($game);
        self::assertSame('FINISHED', $game->getStatus());
        self::assertSame($player1, $game->getWinner());
        self::assertSame(1, $game->getScoreP1());
        self::assertSame(0, $game->getScoreP2());
    }

    // -------------------------------------------------------------------------
    // Leave
    // -------------------------------------------------------------------------

    /**
     * Host leaving a WAITING room (before anyone joined) deletes it immediately —
     * no event broadcast, no forfeit, just cleanup.
     */
    public function testLeaveWaitingDeletesRoom(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $user = $this->createUser($em, 'lw1@example.com', 'lw1');
        $game = $this->createGame($em, $user, 'LWAI', 'WAITING');
        $gameId = $game->getId();

        $client->loginUser($user);
        $client->request('POST', '/api/game/LWAI/leave');

        self::assertResponseIsSuccessful();

        $em->clear();
        self::assertNull($em->getRepository(Game::class)->find($gameId));
    }

    /**
     * A player leaving during an active game triggers a forfeit:
     * - Game becomes FINISHED
     * - The other player is set as winner
     * - Winner's score is incremented
     */
    public function testLeavePlayingForfeits(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $player1 = $this->createUser($em, 'lp1@example.com', 'lp1');
        $player2 = $this->createUser($em, 'lp2@example.com', 'lp2');
        $game    = $this->createGame($em, $player1, 'LFPL', 'PLAYING', $player2);

        $client->loginUser($player1);
        $client->request('POST', '/api/game/LFPL/leave');

        self::assertResponseIsSuccessful();

        $em->refresh($game);
        self::assertSame('FINISHED', $game->getStatus());
        self::assertSame($player2, $game->getWinner());
        self::assertSame(1, $game->getScoreP2());
        self::assertSame(0, $game->getScoreP1());
    }

    /**
     * A player leaving after a finished game sets their "has left" flag.
     * While only one player has left the room still exists (the other may rematch).
     */
    public function testLeaveFinishedGameSetsFlag(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $player1 = $this->createUser($em, 'lf1@example.com', 'lf1');
        $player2 = $this->createUser($em, 'lf2@example.com', 'lf2');
        $game    = $this->createGame($em, $player1, 'LFIN', 'FINISHED', $player2);
        $gameId  = $game->getId();

        $client->loginUser($player1);
        $client->request('POST', '/api/game/LFIN/leave');

        self::assertResponseIsSuccessful();

        $em->refresh($game);
        self::assertTrue($game->isP1HasLeft());
        self::assertFalse($game->isP2HasLeft());
        self::assertNotNull($em->getRepository(Game::class)->find($gameId)); // still in DB
    }

    /**
     * When both players leave a finished game, the room is deleted from the database
     * to prevent stale entries accumulating.
     */
    public function testBothLeavingFinishedGameDeletesIt(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $player1 = $this->createUser($em, 'bl1@example.com', 'bl1');
        $player2 = $this->createUser($em, 'bl2@example.com', 'bl2');
        $game    = $this->createGame($em, $player1, 'BOTH', 'FINISHED', $player2);
        $gameId  = $game->getId();

        $client->loginUser($player1);
        $client->request('POST', '/api/game/BOTH/leave');
        self::assertResponseIsSuccessful();

        $client->request('POST', '/api/game/BOTH/leave', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $this->getToken($player2),
        ]);
        self::assertResponseIsSuccessful();

        $em->clear();
        self::assertNull($em->getRepository(Game::class)->find($gameId));
    }

    // -------------------------------------------------------------------------
    // Rematch
    // -------------------------------------------------------------------------

    /**
     * Full rematch flow:
     * 1. P1 requests → game stays FINISHED, p1WantsRematch = true
     * 2. P2 accepts  → game restarts: status = PLAYING, board cleared, loser starts
     * 3. Scores are preserved across the rematch
     */
    public function testRematchBothAccept(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $player1 = $this->createUser($em, 'rm1@example.com', 'rm1');
        $player2 = $this->createUser($em, 'rm2@example.com', 'rm2');

        $game = new Game();
        $game->setPlayer1($player1);
        $game->setPlayer2($player2);
        $game->setStatus('FINISHED');
        $game->setCurrentTurn(1);
        $game->setWinner($player1); // P1 won → P2 (loser) should start the rematch
        $game->setBoard(array_fill(0, 6, array_fill(0, 7, 0)));
        $game->setScoreP1(1);
        $game->setRoomCode('RMAT');
        $em->persist($game);
        $em->flush();

        // P1 requests rematch — game should not restart yet
        $client->loginUser($player1);
        $client->request('POST', '/api/game/RMAT/rematch');
        self::assertResponseIsSuccessful();

        $em->refresh($game);
        self::assertTrue($game->isP1WantsRematch());
        self::assertSame('FINISHED', $game->getStatus());

        // P2 accepts — both agree → game restarts
        $client->request('POST', '/api/game/RMAT/rematch', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $this->getToken($player2),
        ]);
        self::assertResponseIsSuccessful();

        $em->clear();
        $game = $em->getRepository(Game::class)->findOneBy(['roomCode' => 'RMAT']);
        self::assertSame('PLAYING', $game->getStatus());
        self::assertFalse($game->isP1WantsRematch());
        self::assertFalse($game->isP2WantsRematch());
        self::assertSame(2, $game->getCurrentTurn()); // loser (P2) starts
        self::assertSame(1, $game->getScoreP1());     // scores preserved
    }
}
