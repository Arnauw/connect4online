import {useState} from "react";
import {type Cell, type ColumnIndex, Connect4, type Player} from "../logic/Connect4";

const getCellClass = (cell: Cell): string => {
    switch (cell) {
        case 1:
            return "bg-red-500 shadow-inner";
        case 2:
            return "bg-yellow-400 shadow-inner";
        default:
            return "bg-blue-800 shadow-inner";
    }
};

export const GameBoard = () => {

    const [game] = useState(() => new Connect4());
    const [board, setBoard] = useState<Cell[][]>(game.board);
    const [currentPlayer, setCurrentPlayer] = useState<Player>(game.currentPlayer);
    const [winner, setWinner] = useState<Player | null>(game.winner);

    const handleDrop = (col: ColumnIndex) => {
        // Run logic
        if (game.dropPiece(col)) {
            setBoard(game.board.map(row => [...row]));
            setCurrentPlayer(game.currentPlayer);
            setWinner(game.winner);
        }
    };

    return (
        <div className="flex flex-col items-center min-h-screen bg-slate-100 p-10 font-sans">
            <h1 className="text-4xl font-extrabold mb-8 text-slate-800 tracking-tight">
                Connect 4 Online
            </h1>

            {/* Status Banner */}
            {winner ? (
                <div
                    className="mb-6 px-6 py-2 bg-green-100 text-green-700 border-2 border-green-500 rounded-lg text-xl font-bold animate-bounce">
                    🎉 Player {winner} Wins!
                </div>
            ) : (
                <div className="mb-6 text-xl font-medium text-slate-600">
                    Player <span
                    className={
                        currentPlayer === 1
                            ? "text-red-500 font-bold"
                            : "text-yellow-500 font-bold"
                    }
                >
                        {currentPlayer}
                    </span>'s Turn
                </div>
            )}

            {/* The Board */}
            <div className="bg-blue-600 p-4 rounded-2xl shadow-2xl border-b-8 border-blue-800">
                {board.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex">
                        {row.map((cell, colIndex) => (
                            <div
                                key={colIndex}
                                onClick={() => !winner && handleDrop(colIndex as ColumnIndex)}
                                className="w-16 h-16 p-2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                            >
                                <div
                                    className={`w-full h-full rounded-full transition-colors duration-300 ${getCellClass(cell)}`}/>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <button
                onClick={() => window.location.reload()}
                className="mt-10 px-8 py-3 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors shadow-lg"
            >
                Reset Game
            </button>
        </div>
    );
};