<?php

namespace App\Tests\Controller;

use App\Entity\Game;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class GameControllerTest extends WebTestCase
{
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

        // Verify in DB
        $game = $em->getRepository(Game::class)->find($data['id']);
        self::assertNotNull($game);
        self::assertSame('WAITING', $game->getStatus());
        self::assertSame($user, $game->getPlayer1());
        self::assertNull($game->getPlayer2());
    }

    public function testJoinGame(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $player1 = $this->createUser($em, 'p1@example.com', 'p1');
        $player2 = $this->createUser($em, 'p2@example.com', 'p2');

        // P1 creates game
        $game = new Game();
        $game->setPlayer1($player1);
        $game->setStatus('WAITING');
        $game->setCurrentTurn(1);
        $game->setBoard(array_fill(0, 6, array_fill(0, 7, 0)));
        $game->setRoomCode('ABCD');
        $em->persist($game);
        $em->flush();

        // P2 joins game
        $client->loginUser($player2);
        $client->request('POST', '/api/game/join/ABCD');

        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);

        self::assertSame('Joined successfully. Game starting!', $data['message']);
        
        // Refresh game from DB
        $em->refresh($game);
        self::assertSame('PLAYING', $game->getStatus());
        self::assertSame($player2, $game->getPlayer2());
    }

    public function testInvalidMoveNotTurn(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $player1 = $this->createUser($em, 'm1@example.com', 'm1');
        $player2 = $this->createUser($em, 'm2@example.com', 'm2');

        $game = new Game();
        $game->setPlayer1($player1);
        $game->setPlayer2($player2);
        $game->setStatus('PLAYING');
        $game->setCurrentTurn(1); // Player 1's turn
        $game->setBoard(array_fill(0, 6, array_fill(0, 7, 0)));
        $game->setRoomCode('MOVE');
        $em->persist($game);
        $em->flush();

        // Player 2 tries to move
        $client->loginUser($player2);
        $client->request('POST', '/api/game/MOVE/move', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'col' => 3
        ]));

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertSame('Not your turn!', $data['error']);
    }

    public function testValidMove(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $player1 = $this->createUser($em, 'v1@example.com', 'v1');
        $player2 = $this->createUser($em, 'v2@example.com', 'v2');

        $game = new Game();
        $game->setPlayer1($player1);
        $game->setPlayer2($player2);
        $game->setStatus('PLAYING');
        $game->setCurrentTurn(1);
        $game->setBoard(array_fill(0, 6, array_fill(0, 7, 0)));
        $game->setRoomCode('VALI');
        $em->persist($game);
        $em->flush();

        // Player 1 moves
        $client->loginUser($player1);
        $client->request('POST', '/api/game/VALI/move', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'col' => 3
        ]));

        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertSame('Move accepted', $data['message']);

        $em->refresh($game);
        self::assertSame(2, $game->getCurrentTurn());
        $board = $game->getBoard();
        self::assertSame(1, $board[5][3]); // Gravity should drop it to the bottom
    }
}
