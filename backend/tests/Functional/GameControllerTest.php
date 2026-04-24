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
 * - Authentication guard (unauthenticated → 401)
 * - Room lifecycle: create, join, leave (PLAYING forfeit)
 * - Business rules: cannot join own room
 * - Move validation: valid move, win detection
 * - Rematch flow: both players accept → game restarts
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
    // Authentication guard
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
        $client    = static::createClient();
        $container = static::getContainer();
        $em        = $container->get('doctrine')->getManager();

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
        $client    = static::createClient();
        $container = static::getContainer();
        $em        = $container->get('doctrine')->getManager();

        $player1 = $this->createUser($em, 'p1@example.com', 'p1');
        $player2 = $this->createUser($em, 'p2@example.com', 'p2');
        $game    = $this->createGame($em, $player1, 'ABCD', 'WAITING');

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
        $client    = static::createClient();
        $container = static::getContainer();
        $em        = $container->get('doctrine')->getManager();

        $user = $this->createUser($em, 'host@example.com', 'host');
        $this->createGame($em, $user, 'SELF', 'WAITING');

        $client->loginUser($user);
        $client->request('POST', '/api/game/join/SELF');

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertSame('You cannot join your own room.', $data['error']);
    }

    // -------------------------------------------------------------------------
    // Move
    // -------------------------------------------------------------------------

    /** A valid move is accepted, the turn switches, and the board is updated in the DB. */
    public function testValidMove(): void
    {
        $client    = static::createClient();
        $container = static::getContainer();
        $em        = $container->get('doctrine')->getManager();

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
        $client    = static::createClient();
        $container = static::getContainer();
        $em        = $container->get('doctrine')->getManager();

        $player1 = $this->createUser($em, 'win1@example.com', 'win1');
        $player2 = $this->createUser($em, 'win2@example.com', 'win2');

        $board       = array_fill(0, 6, array_fill(0, 7, 0));
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
     * A player leaving during an active game triggers a forfeit:
     * - Game becomes FINISHED
     * - The other player is set as winner
     * - Winner's score is incremented
     */
    public function testLeavePlayingForfeits(): void
    {
        $client    = static::createClient();
        $container = static::getContainer();
        $em        = $container->get('doctrine')->getManager();

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
        $client    = static::createClient();
        $container = static::getContainer();
        $em        = $container->get('doctrine')->getManager();

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
