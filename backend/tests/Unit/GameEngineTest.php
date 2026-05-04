<?php

namespace App\Tests\Unit;

use App\Service\GameEngine;
use PHPUnit\Framework\TestCase;

class GameEngineTest extends TestCase
{
    private GameEngine $engine;

    protected function setUp(): void
    {
        $this->engine = new GameEngine();
    }

    private function createEmptyBoard(): array
    {
        return array_fill(0, GameEngine::ROWS, array_fill(0, GameEngine::COLS, 0));
    }

    public function testDropPieceInEmptyColumn(): void
    {
        $board = $this->createEmptyBoard();

        $rowIndex = $this->engine->dropPiece($board, 3, 1);

        $this->assertSame(5, $rowIndex, 'Piece should drop to the bottom row (index 5)');
        $this->assertSame(1, $board[5][3], 'Board at bottom of column 3 should belong to player 1');
        $this->assertSame(0, $board[4][3], 'Row above should remain empty');
    }

    public function testDropPieceInFullColumn(): void
    {
        $board = $this->createEmptyBoard();

        for ($i = 0; $i < GameEngine::ROWS; $i++) {
            $this->engine->dropPiece($board, 2, 1);
        }

        $rowIndex = $this->engine->dropPiece($board, 2, 2);

        $this->assertSame(-1, $rowIndex, 'Should return -1 when column is full');
    }

    public function testDropPieceOutOfBounds(): void
    {
        $board = $this->createEmptyBoard();

        $this->assertSame(-1, $this->engine->dropPiece($board, -1, 1));
        $this->assertSame(-1, $this->engine->dropPiece($board, GameEngine::COLS, 1));
    }

    public function testCheckWinHorizontal(): void
    {
        $board = $this->createEmptyBoard();

        $this->engine->dropPiece($board, 0, 1);
        $this->engine->dropPiece($board, 1, 1);
        $this->engine->dropPiece($board, 2, 1);
        $rowIndex = $this->engine->dropPiece($board, 3, 1);

        $winLine = $this->engine->checkWin($board, $rowIndex, 3, 1);

        $this->assertIsArray($winLine, 'Should return a winning line array');
        $this->assertCount(4, $winLine, 'Winning line should have 4 coordinates');
    }

    public function testCheckWinVertical(): void
    {
        $board = $this->createEmptyBoard();

        $this->engine->dropPiece($board, 0, 2);
        $this->engine->dropPiece($board, 0, 2);
        $this->engine->dropPiece($board, 0, 2);
        $rowIndex = $this->engine->dropPiece($board, 0, 2);

        $winLine = $this->engine->checkWin($board, $rowIndex, 0, 2);

        $this->assertIsArray($winLine);
        $this->assertCount(4, $winLine);
    }

    /**
     * Drop pieces directly instead of via gravity, otherwise we'd need filler pieces
     * to build up each column. checkWin just needs the board + the last piece coords.
     */
    public function testCheckWinDiagonalDescending(): void
    {
        $board = $this->createEmptyBoard();

        $board[2][2] = 1;
        $board[3][3] = 1;
        $board[4][4] = 1;
        $board[5][5] = 1;

        $winLine = $this->engine->checkWin($board, 5, 5, 1);

        $this->assertIsArray($winLine, 'Descending diagonal should be detected as a win');
        $this->assertCount(4, $winLine);
    }

    public function testCheckWinDiagonalAscending(): void
    {
        $board = $this->createEmptyBoard();

        $board[2][5] = 2;
        $board[3][4] = 2;
        $board[4][3] = 2;
        $board[5][2] = 2;

        $winLine = $this->engine->checkWin($board, 5, 2, 2);

        $this->assertIsArray($winLine, 'Ascending diagonal should be detected as a win');
        $this->assertCount(4, $winLine);
    }

    public function testCheckWinReturnsNullWhenNoWin(): void
    {
        $board = $this->createEmptyBoard();
        $row = $this->engine->dropPiece($board, 3, 1);

        $this->assertNull($this->engine->checkWin($board, $row, 3, 1));
    }

    public function testCheckDrawOnEmptyBoard(): void
    {
        $board = $this->createEmptyBoard();

        $this->assertFalse($this->engine->checkDraw($board), 'Empty board should not be a draw');
    }

    /**
     * Row 0 is the top. If it's full, every column is blocked,
     * pieces stack from the bottom up, so there's nowhere left to go.
     */
    public function testCheckDrawWhenTopRowFull(): void
    {
        $board = $this->createEmptyBoard();

        for ($c = 0; $c < GameEngine::COLS; $c++) {
            $board[0][$c] = ($c % 2) + 1;
        }

        $this->assertTrue($this->engine->checkDraw($board), 'Board with full top row should be a draw');
    }
}
