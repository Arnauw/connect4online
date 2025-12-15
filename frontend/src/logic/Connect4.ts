export type Player = 1 | 2;
export type Cell = Player | 0;
export type ColumnIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

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
    };
    
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
    };

    private switchTurn(): Player {
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        return this.currentPlayer;
    };

    private dropPiece(column: ColumnIndex) {
        // check if column is either full or if input is valid
        if (column < 0 && column > 6) {
            return false;
        }
        // if there is room on the column to actually drop the piece



        console.log(column);
    };
    
    printBoard() {
        console.table(this.board);
    };
}