export type Player = 1 | 2;
export type Cell = Player | 0;
export type ColumnIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type RowIndex = 0 | 1 | 2 | 3 | 4 | 5;

// Red = 1, Yellow = 2, empty = 0
//
//        Col 0  Col 1  Col 2  Col 3  Col 4  Col 5  Col 6
//         ↓      ↓      ↓      ↓      ↓      ↓      ↓
// Row 0 [ 0,     0,     0,     0,     0,     0,     0 ]  <-- TOP
// Row 1 [ 0,     0,     0,     0,     0,     0,     0 ]
// Row 2 [ 0,     0,     0,     0,     0,     0,     0 ]
// Row 3 [ 0,     0,     0,     0,     0,     0,     0 ]
// Row 4 [ 0,     0,     0,     X,     0,     0,     0 ]
// Row 5 [ 2,     2,     1,     2,     1,     0,     0 ]  <-- BOTTOM


export class Connect4 {
    rows = 6;
    cols = 7;
    board: Cell[][];
    currentPlayer: Player;
    winner: Player | null;
    gameOver: boolean;
    movesPlayed: number;

    constructor() {
        this.board = this.createGrid();
        this.currentPlayer = 1;
        this.winner = null;
        this.gameOver = false;
        this.movesPlayed = 0;
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

    private switchPlayerTurn(): Player {
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        return this.currentPlayer;
    };

    public dropPiece(column: ColumnIndex): boolean {
        // We might need this to prevent a bug, we'll see when we try the game.
        // if (this.gameOver) return false;
        
        const totalBoardCells: number = this.rows * this.cols;
        // check if column is either full or if input is valid
        if (column < 0 || column > 6) {
            return false;
        }

        // for each rows in that column, check if it's empty,
        // if it's empty put the piece here, else check the row above.
        for (let r = this.rows - 1; r >= 0; r--) {

            if (this.board[r][column] === 0) {
                this.board[r][column] = this.currentPlayer;
                this.movesPlayed++;
                const row = r as RowIndex;

                if (this.checkHasWin(row, column)) {
                    this.winner = this.currentPlayer;
                    this.gameOver = true;
                } else if (this.movesPlayed >= totalBoardCells) {
                    this.gameOver = true;
                } else {
                    this.switchPlayerTurn();
                }

                return true;
            }

            console.log(`This cell = board[${r}][${column}]`, this.board[r][column]);
        }
        return false;
    };

    private checkHasWin(row: RowIndex, column: ColumnIndex) {
        //      get position of last placed piece
        //     const lastPiece: Cell = this.board[row][column];
        const player: Player = this.currentPlayer;
        let count: number = 1;

        //      check horizontal - possibilities
        //      Left ←
        for (let i = 1; i < 4; i++) {
            if (column - i < 0 || this.board[row][column - i] !== player) {
                break;
            }
            count++;
        }
        //      Right →
        for (let i = 1; i < 4; i++) {
            if (column + i >= this.cols || this.board[row][column + i] !== player) {
                break;
            }
            count++;
        }

        if (count >= 4) {
            return true;
        }

        //      check vertital - possibilities
        count = 1;
        //      Up ↑, actually no need to check up, it's impossible to have other pieces up.
        //      Down ↓
        for (let i = 1; i < 4; i++) {
            if (row >= 3 || row + i >= this.rows || this.board[row + i][column] !== player) {
                break;
            }
            count++;
        }

        if (count >= 4) {
            return true;
        }

        //      check diagonals - North West ↖ (Up Left) TO South Est ↘ (Down Right) - possibilities
        count = 1;
        //      North West ↖ (Up Left)
        for (let i = 1; i < 4; i++) {
            if (column - i < 0 || row - i < 0 || this.board[row - i][column - i] !== player) {
                break;
            }
            count++;
        }
        //      South Est ↘ (Down Right)
        for (let i = 1; i < 4; i++) {
            if (column + i >= this.cols || row + i >= this.rows || this.board[row + i][column + i] !== player) {
                break;
            }
            count++;
        }

        if (count >= 4) {
            return true;
        }

//      check diagonals - North Est ↗ (Up Right) TO South West ↙ (Down Left) - possibilities
        count = 1;

        //      North Est ↗ (Up Right)
        for (let i = 1; i < 4; i++) {
            if (column + i >= this.cols || row - i < 0 || this.board[row - i][column + i] !== player) {
                break;
            }
            count++;
        }
        //      South West ↙ (Down Left)
        for (let i = 1; i < 4; i++) {
            if (column - i < 0 || row + i >= this.rows || this.board[row + i][column - i] !== player) {
                break;
            }
            count++;
        }


        if (count >= 4) {
            return true;
        }


        return false;
    };

    public printBoard() {
        console.table(this.board);
    };
}