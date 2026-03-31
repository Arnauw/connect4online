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
    winningLine: [number, number][] | null;

    constructor() {
        this.board = this.createGrid();
        this.currentPlayer = 1;
        this.winner = null;
        this.gameOver = false;
        this.movesPlayed = 0;
        this.winningLine = null;
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
                console.log(`This cell = board[${r}][${column}]`, this.board[r][column]);

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
        }
        return false;
    };

    private checkHasWin(row: RowIndex, column: ColumnIndex): boolean {
        const player = this.currentPlayer;

        // Helper function that checks a specific axis
        const checkDirection = (rDir: number, cDir: number): boolean => {
            // Start the line with the piece we just dropped
            const line: [number, number][] = [[row, column]];

            // 1. Look Forward
            for (let i = 1; i < 4; i++) {
                const r = row + (rDir * i);
                const c = column + (cDir * i);
                if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.board[r][c] === player) {
                    line.push([r, c]);
                } else break;
            }

            // 2. Look Backward
            for (let i = 1; i < 4; i++) {
                const r = row - (rDir * i);
                const c = column - (cDir * i);
                if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.board[r][c] === player) {
                    line.push([r, c]);
                } else break;
            }

            // 3. Did we find 4 or more?
            if (line.length >= 4) {
                // Save exactly 4 coordinates for the UI to highlight
                this.winningLine = line.slice(0, 4);
                return true;
            }

            return false;
        };

        // Check all 4 possible axes
        if (checkDirection(0, 1)) return true;  // Horizontal (-)
        if (checkDirection(1, 0)) return true;  // Vertical (|)
        if (checkDirection(1, 1)) return true;  // Diagonal (\)
        if (checkDirection(1, -1)) return true; // Diagonal (/)

        return false;
    }

    public printBoard() {
        console.table(this.board);
    };
}