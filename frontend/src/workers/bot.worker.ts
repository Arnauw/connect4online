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
 * - Main thread sends: { board, player, difficulty }
 * - Worker responds with: column index (0-6) for the bot's move
 */

import type { Cell, ColumnIndex } from "../logic/Connect4";

/**
 * Structure of the request sent from the main thread to the worker
 */
type BotRequest = {
    board: Cell[][];      // Current game board state
    player: 1 | 2;        // Which player the bot is playing as
    difficulty: number;   // AI difficulty level (currently unused, for future implementation)
};

/**
 * Message handler - receives move requests from the main thread
 * Calculates the best move and sends it back
 */
self.onmessage = (e: MessageEvent<BotRequest>) => {
    const { board, player } = e.data;

    // Add a small delay to make the bot feel more "natural" (not instant)
    setTimeout(() => {
        const bestMove = computeBestMove(board, player);
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
 * @param player - Which player the bot is (1 or 2)
 * @returns Column index (0-6) where the bot wants to drop its piece, or -1 if no valid moves
 */
function computeBestMove(board: Cell[][], player: 1 | 2): number {
    // Find all columns that aren't full (top row has empty space)
    const validColumns: number[] = [];

    for (let c = 0; c < 7; c++) {
        if (board[0][c] === 0) {  // Check if top cell of column is empty
            validColumns.push(c);
        }
    }

    // No valid moves available (board is full)
    if (validColumns.length === 0) return -1;

    // Pick a random valid column
    // TODO: Implement smarter AI algorithm based on difficulty level
    const randomIndex = Math.floor(Math.random() * validColumns.length);
    return validColumns[randomIndex];
}
