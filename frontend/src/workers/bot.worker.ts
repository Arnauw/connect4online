/**
 * Connect4 Bot AI Worker
 *
 * This Web Worker runs the bot AI logic in a separate thread to prevent
 * the main UI thread from freezing during AI calculations.
 *
 * Web Workers enable multithreading in the browser, which is essential
 * when the bot needs to evaluate many possible moves (especially for
 * higher difficulty levels that might use minimax or Monte Carlo algorithms).
 *
 * Communication:
 * - Main thread sends: { board, difficulty }
 * - Worker responds with: column index (0-6) for the bot's move
 */

import type { Cell } from "../logic/Connect4";

/**
 * Structure of the request sent from the main thread to the worker
 */
type BotRequest = {
    board: Cell[][];
    difficulty: number;
};

/**
 * Message handler - receives move requests from the main thread
 * Calculates the best move and sends it back
 */
self.onmessage = (e: MessageEvent<BotRequest>) => {
    const { board } = e.data;

    // Add a small delay to make the bot feel more "natural" (not instant)
    setTimeout(() => {
        const bestMove = computeBestMove(board);
        postMessage(bestMove);  // Send the chosen column back to the main thread
    }, 500);  // 500ms delay
};

/**
 * Computes the best move for the bot to make
 *
 * Current Implementation: Random valid move
 * Future Enhancement: This could be replaced with minimax algorithm,
 * alpha-beta pruning, or Monte Carlo tree search for smarter AI
 *
 * @param board - The current game board state
 * @returns Column index (0-6) where the bot wants to drop its piece, or -1 if no valid moves
 */
function computeBestMove(board: Cell[][]): number {
    // Find all columns that are not full (top row has empty space)
    const validColumns: number[] = [];

    for (let col = 0; col < 7; col++) {
        // Check if top cell of column is empty (board[0][...] is the top row)
        if (board[0][col] === 0) {
            validColumns.push(col);
        }
    }

    // No valid moves available (board is full)
    if (validColumns.length === 0) return -1;

    // Pick a random valid column
    const randomIndex = Math.floor(Math.random() * validColumns.length);
    return validColumns[randomIndex];
}
