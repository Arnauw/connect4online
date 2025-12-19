import type { Cell, ColumnIndex } from "../logic/Connect4";

type BotRequest = {
    board: Cell[][];
    player: 1 | 2;
    difficulty: number;
};

self.onmessage = (e: MessageEvent<BotRequest>) => {
    const { board, player } = e.data;
    
    setTimeout(() => {
        const bestMove = computeBestMove(board, player);
        postMessage(bestMove); // Send result back to React
    }, 500);
};

function computeBestMove(board: Cell[][], player: 1 | 2): number {

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