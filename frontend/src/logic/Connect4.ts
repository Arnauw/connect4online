export type Player = 1 | 2;
export type Cell = Player | 0;
export type ColumnIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type RowIndex = 0 | 1 | 2 | 3 | 4 | 5;

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
    }

    private createGrid(): Cell[][] {
        const board: Cell[][] = [];
        for (let rowIndex = 0; rowIndex < this.rows; rowIndex++) {
            const row: Cell[] = [];
            for (let colIndex = 0; colIndex < this.cols; colIndex++) {
                row.push(0);
            }
            board.push(row);
        }
        return board;
    }

    private switchPlayerTurn(): Player {
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        return this.currentPlayer;
    }

    public dropPiece(column: ColumnIndex): RowIndex | null {
        if (column < 0 || column > 6) {
            return null;
        }
        for (let row = this.rows - 1; row >= 0; row--) {
            if (this.board[row][column] === 0) {
                this.board[row][column] = this.currentPlayer;
                this.movesPlayed++;
                return row as RowIndex;
            }
        }
        return null;
    }

    public applyMove(column: ColumnIndex): RowIndex | null {
        const row = this.dropPiece(column);
        if (row === null) return null;

        if (this.checkHasWin(row, column)) {
            this.winner = this.currentPlayer;
            this.gameOver = true;
        } else if (this.movesPlayed >= this.rows * this.cols) {
            this.gameOver = true;
        } else {
            this.switchPlayerTurn();
        }

        return row;
    }

    private checkHasWin(row: RowIndex, column: ColumnIndex): boolean {
        const player = this.currentPlayer;

        const checkDirection = (rowDir: number, colDir: number): boolean => {
            const line: [number, number][] = [[row, column]];

            for (let step = 1; step < 4; step++) {
                const nextRow = row + (rowDir * step);
                const nextCol = column + (colDir * step);
                if (nextRow >= 0 && nextRow < this.rows && nextCol >= 0 && nextCol < this.cols && this.board[nextRow][nextCol] === player) {
                    line.push([nextRow, nextCol]);
                } else break;
            }

            for (let step = 1; step < 4; step++) {
                const nextRow = row - (rowDir * step);
                const nextCol = column - (colDir * step);
                if (nextRow >= 0 && nextRow < this.rows && nextCol >= 0 && nextCol < this.cols && this.board[nextRow][nextCol] === player) {
                    line.push([nextRow, nextCol]);
                } else break;
            }

            if (line.length >= 4) {
                this.winningLine = line.slice(0, 4);
                return true;
            }

            return false;
        };

        if (checkDirection(0, 1)) return true;
        if (checkDirection(1, 0)) return true;
        if (checkDirection(1, 1)) return true;
        if (checkDirection(1, -1)) return true;

        return false;
    }

    public printBoard() {
        console.table(this.board);
    }
}
