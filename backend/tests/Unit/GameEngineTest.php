<?php

/**
 * GameEngineTest — Unit tests for the GameEngine service.
 *
 * GameEngine is pure logic with no dependencies, so these are true unit tests:
 * no database, no HTTP, no framework. Fast and isolated.
 *
 * Covers:
 * - dropPiece: gravity simulation, column bounds, full columns
 * - checkWin: horizontal, vertical, both diagonals, no-win case
 * - checkDraw: empty board vs full top row
 */

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

    // -------------------------------------------------------------------------
    // dropPiece
    // -------------------------------------------------------------------------

    /** Piece dropped into an empty column must fall to the bottom row (index 5). */
    public function testDropPieceInEmptyColumn(): void
    {
        $board = $this->createEmptyBoard();

        $rowIndex = $this->engine->dropPiece($board, 3, 1);

        $this->assertSame(5, $rowIndex, 'Piece should drop to the bottom row (index 5)');
        $this->assertSame(1, $board[5][3], 'Board at bottom of column 3 should belong to player 1');
        $this->assertSame(0, $board[4][3], 'Row above should remain empty');
    }

    /** Dropping into a full column must return -1 without modifying the board. */
    public function testDropPieceInFullColumn(): void
    {
        $board = $this->createEmptyBoard();

        for ($i = 0; $i < GameEngine::ROWS; $i++) {
            $this->engine->dropPiece($board, 2, 1);
        }

        $rowIndex = $this->engine->dropPiece($board, 2, 2);

        $this->assertSame(-1, $rowIndex, 'Should return -1 when column is full');
    }

    /** Column indices outside 0–6 must be rejected immediately. */
    public function testDropPieceOutOfBounds(): void
    {
        $board = $this->createEmptyBoard();

        $this->assertSame(-1, $this->engine->dropPiece($board, -1, 1));
        $this->assertSame(-1, $this->engine->dropPiece($board, GameEngine::COLS, 1));
    }

    // -------------------------------------------------------------------------
    // checkWin
    // -------------------------------------------------------------------------

    /** Four consecutive pieces in the same row = horizontal win. */
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

    /** Four stacked pieces in the same column = vertical win. */
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
     * Descending diagonal (\): pieces at (2,2), (3,3), (4,4), (5,5).
     * We place pieces directly on the board to avoid the complexity of
     * stacking filler pieces for gravity — checkWin only needs the board state
     * and the coordinates of the last-placed piece.
     */
    public function testCheckWinDiagonalDescending(): void
    {
        $board = $this->createEmptyBoard();

        $board[2][2] = 1;
        $board[3][3] = 1;
        $board[4][4] = 1;
        $board[5][5] = 1; // last placed

        $winLine = $this->engine->checkWin($board, 5, 5, 1);

        $this->assertIsArray($winLine, 'Descending diagonal should be detected as a win');
        $this->assertCount(4, $winLine);
    }

    /**
     * Ascending diagonal (/): pieces at (2,5), (3,4), (4,3), (5,2).
     */
    public function testCheckWinDiagonalAscending(): void
    {
        $board = $this->createEmptyBoard();

        $board[2][5] = 2;
        $board[3][4] = 2;
        $board[4][3] = 2;
        $board[5][2] = 2; // last placed

        $winLine = $this->engine->checkWin($board, 5, 2, 2);

        $this->assertIsArray($winLine, 'Ascending diagonal should be detected as a win');
        $this->assertCount(4, $winLine);
    }

    /** A single placed piece with no neighbours must return null (no win yet). */
    public function testCheckWinReturnsNullWhenNoWin(): void
    {
        $board = $this->createEmptyBoard();
        $row = $this->engine->dropPiece($board, 3, 1);

        $this->assertNull($this->engine->checkWin($board, $row, 3, 1));
    }

    // -------------------------------------------------------------------------
    // checkDraw
    // -------------------------------------------------------------------------

    /** An empty board is not a draw. */
    public function testCheckDrawOnEmptyBoard(): void
    {
        $board = $this->createEmptyBoard();

        $this->assertFalse($this->engine->checkDraw($board), 'Empty board should not be a draw');
    }

    /**
     * If the top row (row 0) is fully occupied, the entire board is full.
     * Pieces can no longer be dropped anywhere → draw.
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
