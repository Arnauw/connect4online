<?php

namespace App\Service;

class GameEngine
{
    public const ROWS = 6;
    public const COLS = 7;

    /**
     * Applies a move. Returns the row index if successful, or -1 if invalid/full.
     */
    public function dropPiece(array &$board, int $col, int $player): int
    {
        if ($col < 0 || $col >= self::COLS) {
            return -1;
        }

        // Gravity: start from bottom
        for ($r = self::ROWS - 1; $r >= 0; $r--) {
            if ($board[$r][$col] === 0) {
                $board[$r][$col] = $player;
                return $r;
            }
        }

        return -1; // Column full
    }

    public function checkWin(array $board, int $row, int $col, int $player): bool
    {
        return
            $this->countDirection($board, $row, $col, 0, 1, $player) >= 4 || // Horizontal
            $this->countDirection($board, $row, $col, 1, 0, $player) >= 4 || // Vertical
            $this->countDirection($board, $row, $col, 1, 1, $player) >= 4 || // Diagonal \
            $this->countDirection($board, $row, $col, 1, -1, $player) >= 4;  // Diagonal /
    }

    public function checkDraw(array $board): bool
    {
        // If the top row has no 0s, the board is completely full
        return !in_array(0, $board[0], true);
    }

    private function countDirection(array $board, int $r, int $c, int $dr, int $dc, int $player): int
    {
        $count = 1;

        // Look forward
        for ($i = 1; $i < 4; $i++) {
            $nr = $r + ($dr * $i);
            $nc = $c + ($dc * $i);
            if ($nr >= 0 && $nr < self::ROWS && $nc >= 0 && $nc < self::COLS && $board[$nr][$nc] === $player) {
                $count++;
            } else {
                break;
            }
        }

        // Look backward
        for ($i = 1; $i < 4; $i++) {
            $nr = $r - ($dr * $i);
            $nc = $c - ($dc * $i);
            if ($nr >= 0 && $nr < self::ROWS && $nc >= 0 && $nc < self::COLS && $board[$nr][$nc] === $player) {
                $count++;
            } else {
                break;
            }
        }

        return $count;
    }
}
