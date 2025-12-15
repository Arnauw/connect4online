export type Player = 1 | 2;
export type Cell = Player | 0;

export class Connect4 {
    rows = 6;
    cols = 7;
    board: Cell[][];
    currentPlayer: Player;
    winner: Player | null;
    gameOver: boolean;

    constructor() {
        this.board = this.createGrid();
        this.currentPlayer = 1;
        this.winner = null;
        this.gameOver = false;
    }
    
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
    
    printBoard() {
        console.table(this.board);
    }
}