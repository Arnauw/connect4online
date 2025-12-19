// A Web Worker permits the use of Multithreading in the browser.
// We need multithreading to avoid the page freezing when the bot will calculate like 1000 moves.

import type { Cell, ColumnIndex } from "../logic/Connect4";

type BotRequest = {
    board: Cell[][];
    player: 1 | 2;
    difficulty: number;
};

const colindex: ColumnIndex = 0; // remove this it's just to remove eslint errors.
console.log(colindex); // remove this it's just to remove eslint errors.

self.onmessage = (e: MessageEvent<BotRequest>) => {
    const { board, player } = e.data;
    
    setTimeout(() => {
        const bestMove = computeBestMove(board, player);
        postMessage(bestMove); // Send result back to React
    }, 500);
};

function computeBestMove(board: Cell[][], player: 1 | 2): number {
    console.log(player); // remove this it's just to remove eslint errors.
    const validColumns: number[] = [];

    for (let c = 0; c < 7; c++) {
        if (board[0][c] === 0) {
            validColumns.push(c);
        }
    }

    if (validColumns.length === 0) return -1;

    const randomIndex = Math.floor(Math.random() * validColumns.length);
    return validColumns[randomIndex];
}