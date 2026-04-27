<?php

/**
 * GameEngine Service
 *
 * Backend implementation of Connect4 game logic for online multiplayer games.
 * This mirrors the frontend Connect4.ts logic but runs on the server to prevent cheating.
 *
 * The server is the source of truth for all online games:
 * - Validates all moves before applying them
 * - Detects wins and draws
 * - Ensures game rules are enforced (correct turn, valid columns, etc.)
 *
 * Board Structure: 6 rows x 7 columns
 * - Row 0 = top, Row 5 = bottom
 * - Cell values: 0 = empty, 1 = Player 1 (Red), 2 = Player 2 (Yellow)
 */

namespace App\Service;

class GameEngine
{
    // Standard Connect4 board dimensions
    public const ROWS = 6;
    public const COLS = 7;

    /**
     * Applies a move to the board by dropping a piece in the specified column
     * Simulates gravity - piece falls to the lowest available row
     *
     * @param array $board - Reference to the game board (modified in place)
     * @param int $col - Column index (0-6) where piece is dropped
     * @param int $player - Player number (1 or 2)
     * @return int Row index where piece landed, or -1 if move invalid/column full
     *
     * Example:
     * $row = $engine->dropPiece($board, 3, 1);  // Player 1 drops in column 3
     * if ($row >= 0) { // Move successful }
     */
    public function dropPiece(array &$board, int $col, int $player): int
    {
        if ($col < 0 || $col >= self::COLS) {
            return -1;  // invalid column
        }
        // find the lowest empty cell in this column
        for ($row = self::ROWS - 1; $row >= 0; $row--) {
            if ($board[$row][$col] === 0) {  // if cell is empty
                $board[$row][$col] = $player;  // place the piece
                return $row;
            }
        }
        return -1;  // column is full
    }

    /**
     * Checks if the most recent move created a winning line of 4
     * Checks all 4 possible directions: horizontal, vertical, and both diagonals
     *
     * @param array $board - Current game board state
     * @param int $row - Row where the last piece was placed
     * @param int $col - Column where the last piece was placed
     * @param int $player - Player who made the move (1 or 2)
     * @return array|null Array of 4 coordinates [[r,c], [r,c], [r,c], [r,c]] if win found, null otherwise
     *
     * Example return: [[5,3], [5,4], [5,5], [5,6]] = horizontal win on bottom row
     */
    public function checkWin(array $board, int $row, int $col, int $player): ?array
    {
        // Define all 4 possible winning directions
        $directions = [
            [0, 1],   // Horizontal -- (row stays same, column changes)
            [1, 0],   // Vertical | (row changes, column stays same)
            [1, 1],   // Diagonal \ (both row and column increase)
            [1, -1]   // Diagonal / (row increases, column decreases)
        ];
        // Check each direction for a winning line
        foreach ($directions as [$dr, $dc]) {
            $line = $this->getWinningLine($board, $row, $col, $dr, $dc, $player);
            if ($line) {
                return $line;  // Win found! Return the 4 winning coordinates
            }
        }
        // No win found in any direction
        return null;
    }

    /**
     * Helper method to find a winning line in a specific direction
     * Looks both forward and backward from the placed piece to find 4 in a row
     *
     * @param array $board - Current game board
     * @param int $r - Starting row
     * @param int $c - Starting column
     * @param int $dr - Row direction increment (-1, 0, or 1)
     * @param int $dc - Column direction increment (-1, 0, or 1)
     * @param int $player - Player to check for (1 or 2)
     * @return array|null Array of 4 coordinates if win found, null otherwise
     */
    private function getWinningLine(array $board, int $r, int $c, int $dr, int $dc, int $player): ?array
    {
        // Start the line with the piece that was just placed
        $line = [[$r, $c]];

        // Look forward along the direction (up to 3 more pieces)
        for ($i = 1; $i < 4; $i++) {
            $nr = $r + ($dr * $i);  // New row
            $nc = $c + ($dc * $i);  // New column

            // Check if position is valid and contains the player's piece
            if ($nr >= 0 && $nr < self::ROWS && $nc >= 0 && $nc < self::COLS && $board[$nr][$nc] === $player) {
                $line[] = [$nr, $nc];
            } else break;  // Hit empty cell or opponent's piece
        }

        // Look backward along the direction (up to 3 more pieces)
        for ($i = 1; $i < 4; $i++) {
            $nr = $r - ($dr * $i);  // New row (opposite direction)
            $nc = $c - ($dc * $i);  // New column (opposite direction)

            // Check if position is valid and contains the player's piece
            if ($nr >= 0 && $nr < self::ROWS && $nc >= 0 && $nc < self::COLS && $board[$nr][$nc] === $player) {
                $line[] = [$nr, $nc];
            } else break;  // Hit empty cell or opponent's piece
        }

        // Check if we found 4 or more in a row
        if (count($line) >= 4) {
            // Return exactly 4 coordinates for the UI to highlight
            return array_slice($line, 0, 4);
        }

        return null;  // Less than 4 in a row found
    }

    /**
     * Checks if the game is a draw (board completely full with no winner)
     * Simply checks if the top row has any empty spaces
     *
     * @param array $board - Current game board
     * @return bool True if board is full (draw), false if moves still possible
     *
     * Logic: If top row (row 0) has no zeros, entire board must be full
     * because pieces fall down due to gravity
     */
    public function checkDraw(array $board): bool
    {
        // Check if top row contains any zeros (empty cells)
        // If top row is full, entire board is full
        return !in_array(0, $board[0], true);
    }
}
