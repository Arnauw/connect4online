import type { Cell } from "../logic/Connect4";

type BotRequest = {
    board: Cell[][];
    difficulty: number;
};

self.onmessage = (e: MessageEvent<BotRequest>) => {
    const { board } = e.data;

    setTimeout(() => {
        const bestMove = computeBestMove(board);
        postMessage(bestMove);
    }, 500);
};

function computeBestMove(board: Cell[][]): number {
    const validColumns: number[] = [];

    for (let col = 0; col < 7; col++) {
        if (board[0][col] === 0) {
            validColumns.push(col);
        }
    }

    if (validColumns.length === 0) return -1;

    const randomIndex = Math.floor(Math.random() * validColumns.length);
    return validColumns[randomIndex];
}
