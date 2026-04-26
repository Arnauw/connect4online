/**
 * Connect4 Game Logic
 *
 * This module contains the core game logic for Connect 4.
 * It handles board state, move validation, win detection, and game flow.
 *
 * Board Layout:
 * - 6 rows x 7 columns grid
 * - Row 0 is the top, Row 5 is the bottom
 * - Pieces "fall" down due to gravity (bottom-filled columns)
 * - Player 1 (Red) vs Player 2 (Yellow)
 */

// Type definitions for type safety
export type Player = 1 | 2;  // 1 = Red player, 2 = Yellow player
export type Cell = Player | 0;  // Cell can contain Player 1, Player 2, or empty (0)
export type ColumnIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;  // Valid column indices
export type RowIndex = 0 | 1 | 2 | 3 | 4 | 5;  // Valid row indices

/**
 * Visual representation of the board coordinate system:
 *
 * Red = 1, Yellow = 2, empty = 0
 *
 *        Col 0  Col 1  Col 2  Col 3  Col 4  Col 5  Col 6
 * Row 0 [ 0,     0,     0,     0,     0,     0,     0 ]
 * Row 1 [ 0,     0,     0,     0,     0,     0,     0 ]
 * Row 2 [ 0,     0,     0,     0,     0,     0,     0 ]
 * Row 3 [ 0,     0,     0,     0,     0,     0,     0 ]
 * Row 4 [ 0,     0,     0,     X,     0,     0,     0 ]
 * Row 5 [ 2,     2,     1,     2,     1,     0,     0 ]
 */

/**
 * Main Connect4 game class
 * Manages game state, validates moves, and detects wins
 */
export class Connect4 {
    rows = 6;
    cols = 7;
    board: Cell[][];
    currentPlayer: Player;
    winner: Player | null;
    gameOver: boolean; 
    movesPlayed: number;
    winningLine: [number, number][] | null;

    /**
     * Constructor - Initializes a new game
     * Creates an empty board and sets starting player to 1 (Red)
     */
    constructor() {
        this.board = this.createGrid();
        this.currentPlayer = 1;  // Player 1 (Red) always starts
        this.winner = null;
        this.gameOver = false;
        this.movesPlayed = 0;
        this.winningLine = null;
    }

    /**
     * Creates an empty 6x7 game board filled with zeros
     * @returns A 2D array representing an empty board
     */
    private createGrid(): Cell[][] {
        const board: Cell[][] = [];
        for (let r = 0; r < this.rows; r++) {
            const row: Cell[] = [];
            for (let c = 0; c < this.cols; c++) {
                row.push(0);
            }
            board.push(row);
        }
        return board;
    }

    /**
     * Switches the current player turn
     * @returns The new current player (1 or 2)
     */
    private switchPlayerTurn(): Player {
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        return this.currentPlayer;
    }

    /**
     * Attempts to drop a piece in the specified column
     * Pieces fall to the lowest available row in that column
     *
     * @param column - The column index (0-6) where the piece should be dropped
     * @returns true if the move was successful, false if column is full or invalid
     */
    public dropPiece(column: ColumnIndex): boolean {
        const totalBoardCells: number = this.rows * this.cols;

        // Validate column index
        if (column < 0 || column > 6) {
            return false;
        }
        // Find the lowest empty row in this column
        for (let r = this.rows - 1; r >= 0; r--) {

            if (this.board[r][column] === 0) {
                this.board[r][column] = this.currentPlayer;
                this.movesPlayed++;
                const row = r as RowIndex;
                console.log(`Piece dropped at board[${r}][${column}]`, this.board[r][column]);

                // Check if this move created a winning line
                if (this.checkHasWin(row, column)) {
                    this.winner = this.currentPlayer;
                    this.gameOver = true;
                }
                // Check if board is full (draw)
                else if (this.movesPlayed >= totalBoardCells) {
                    this.gameOver = true;
                }
                else {
                    this.switchPlayerTurn();
                }

                return true;
            }
        }
        // Column is full, cannot do this move
        return false;
    }

    /**
     * Checks if the piece just placed created a winning line of 4
     * Checks all 4 possible directions: horizontal, vertical, and both diagonals
     *
     * @param row - Row index where the piece was just placed
     * @param column - Column index where the piece was just placed
     * @returns true if this move created a win, false otherwise
     */
    private checkHasWin(row: RowIndex, column: ColumnIndex): boolean {
        const player = this.currentPlayer;

        /**
         * Helper function that checks for 4 in a row along a specific direction
         * @param rDir - Row direction (-1, 0, or 1)
         * @param cDir - Column direction (-1, 0, or 1)
         * @returns true if 4+ pieces found in this direction
         */
        const checkDirection = (rDir: number, cDir: number): boolean => {
            // Start the line with the piece we just dropped
            const line: [number, number][] = [[row, column]];

            // Look forward along the direction (up to 3 more pieces)
            for (let i = 1; i < 4; i++) {
                const r = row + (rDir * i);
                const c = column + (cDir * i);
                // Check if position is valid and contains current player's piece
                if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.board[r][c] === player) {
                    line.push([r, c]);
                } else break;  // Hit empty cell or edge of board
            }

            // Look backward along the direction (up to 3 more pieces)
            for (let i = 1; i < 4; i++) {
                const r = row - (rDir * i);
                const c = column - (cDir * i);
                // Check if position is valid and contains current player's piece
                if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.board[r][c] === player) {
                    line.push([r, c]);
                } else break;  // Hit empty cell or edge of board
            }

            // Check if we found 4 or more in a row
            if (line.length >= 4) {
                // Save exactly 4 coordinates for the UI to highlight
                this.winningLine = line.slice(0, 4);
                return true;
            }

            return false;
        };

        // Check all 4 possible winning directions
        if (checkDirection(0, 1)) return true;   // Horizontal (-) [row stays same, col changes]
        if (checkDirection(1, 0)) return true;   // Vertical (|) [row changes, col stays same]
        if (checkDirection(1, 1)) return true;   // Diagonal (\) [both increase]
        if (checkDirection(1, -1)) return true;  // Diagonal (/) [row increases, col decreases]

        return false;  // No win found
    }

    /**
     * Debug utility - Prints the current board state to console
     * Useful for testing and debugging game logic
     */
    public printBoard() {
        console.table(this.board);
    }
}
