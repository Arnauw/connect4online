<?php

namespace App\Service;

class GameEngine
{
    public const ROWS = 6;
    public const COLS = 7;

    public function dropPiece(array &$board, int $col, int $player): int
    {
        if ($col < 0 || $col >= self::COLS) {
            return -1;
        }
        for ($row = self::ROWS - 1; $row >= 0; $row--) {
            if ($board[$row][$col] === 0) {
                $board[$row][$col] = $player;
                return $row;
            }
        }
        return -1;
    }

    public function checkWin(array $board, int $row, int $col, int $player): ?array
    {
        $directions = [
            [0, 1],
            [1, 0],
            [1, 1],
            [1, -1]
        ];
        foreach ($directions as [$rowDir, $colDir]) {
            $line = $this->getWinningLine($board, $row, $col, $rowDir, $colDir, $player);
            if ($line) {
                return $line;
            }
        }
        return null;
    }

    private function getWinningLine(array $board, int $row, int $col, int $rowDir, int $colDir, int $player): ?array
    {
        $line = [[$row, $col]];

        for ($step = 1; $step < 4; $step++) {
            $nextRow = $row + ($rowDir * $step);
            $nextCol = $col + ($colDir * $step);
            if ($nextRow >= 0 && $nextRow < self::ROWS && $nextCol >= 0 && $nextCol < self::COLS && $board[$nextRow][$nextCol] === $player) {
                $line[] = [$nextRow, $nextCol];
            } else break;
        }

        for ($step = 1; $step < 4; $step++) {
            $nextRow = $row - ($rowDir * $step);
            $nextCol = $col - ($colDir * $step);
            if ($nextRow >= 0 && $nextRow < self::ROWS && $nextCol >= 0 && $nextCol < self::COLS && $board[$nextRow][$nextCol] === $player) {
                $line[] = [$nextRow, $nextCol];
            } else break;
        }

        if (count($line) >= 4) {
            return array_slice($line, 0, 4);
        }

        return null;
    }

    public function checkDraw(array $board): bool
    {
        return !in_array(0, $board[0], true);
    }
}
