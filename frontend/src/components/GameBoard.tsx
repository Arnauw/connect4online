import {useState} from "react";
import {type ColumnIndex, Connect4} from "../logic/Connect4";

export const GameBoard = () => {

    const [game, setGame] = useState<Connect4>(() => new Connect4());
    const [tick, setTick] = useState<number>(0);

    const dropPieceHandler: (col: ColumnIndex) => void = (col: ColumnIndex) => {
    //     clicked what? idk I don't fucking have anything rendered yet ...
        if (game.dropPiece(col)) {
            console.log("that was a valid move, piece placed on this column");
            setTick(prevState => prevState + 1);
        } else {
            console.log("that was not valid move, please try again.");
        }
        
    }
    
    return (
        <div className="flex flex-col items-center min-h-screen bg-slate-100 p-10">
            <h1 className="text-4xl font-bold mb-8 text-slate-800">Connect 4</h1>
            
            <div className="bg-blue-600 p-4 rounded-xl shadow-2xl">

                {/* rows */}
                {game.board.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex">
                        {/* columns */}
                        {row.map((cell, colIndex) => (
                            <div
                                key={colIndex}
                                onClick={() => dropPieceHandler(colIndex as ColumnIndex)}
                                className="w-16 h-16 p-2 cursor-pointer hover:brightness-110"
                            >
                                {/* pieces or empty circles */}
                                <div className={`
                                    w-full h-full rounded-full shadow-inner transition-all duration-300
                                    ${cell === 0 ? "bg-blue-800" : ""}
                                    ${cell === 1 ? "bg-red-500" : ""}
                                    ${cell === 2 ? "bg-yellow-400" : ""}
                                `}></div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            
            <div className="mt-6 text-xl font-semibold">
                Player {game.currentPlayer}'s Turn
            </div>
        </div>
    );
};
