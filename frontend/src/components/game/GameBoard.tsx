import {useEffect, useRef, useState} from "react";
import {type Cell, type ColumnIndex, Connect4, type Player} from "../../logic/Connect4.ts";
import {MenuButton} from "../ui/MenuButton.tsx";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import dropSfx from "../../assets/sfx/drop.ogg";

type GameBoardProps = {
    title?: string;
    vsBot?: boolean;
};

const getCellClass = (cell: Cell): string => {
    switch (cell) {
        case 1:
            return "bg-red-500 shadow-[inset_0_4px_6px_rgba(0,0,0,0.4)] drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]";
        case 2:
            return "bg-yellow-400 shadow-[inset_0_4px_6px_rgba(0,0,0,0.4)] drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]";
        default:
            return "bg-slate-900/40 shadow-inner";
    }
};

export const GameBoard = ({title = "Game", vsBot}: GameBoardProps) => {
    const [game, setGame] = useState<Connect4>(() => new Connect4());
    const [board, setBoard] = useState<Cell[][]>(game.board);
    const [currentPlayer, setCurrentPlayer] = useState<Player>(game.currentPlayer);
    const [winner, setWinner] = useState<Player | null>(game.winner);
    const [isGameOver, setIsGameOver] = useState<boolean>(game.gameOver);
    const workerRef = useRef<Worker | null>(null);
    const playSound = useSoundEffect();
    
    // We must import Worker that way because it needs to use a different Thread
    // (So it's not blocked when we increase the strength of the bot later with the minimax algo)
    useEffect(() => {
        workerRef.current = new Worker(
            new URL('../../workers/bot.worker.ts', import.meta.url),
            {type: 'module'},
        );

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const handleDrop = (col: ColumnIndex) => {
        if (game.dropPiece(col)) {
            playSound(dropSfx);
            setBoard(game.board.map(row => [...row]));
            setCurrentPlayer(game.currentPlayer);
            setWinner(game.winner);
            setIsGameOver(game.gameOver);
        }
    };

    const handleReset = () => {
        const newGame = new Connect4();
        setGame(newGame);
        setBoard(newGame.board);
        setCurrentPlayer(newGame.currentPlayer);
        setWinner(newGame.winner);
        setIsGameOver(newGame.gameOver);
    };

    useEffect(() => {
        if (currentPlayer === 2 && vsBot && !winner && !isGameOver) {
            if (!workerRef.current) return;
            
            workerRef.current.onmessage = (e) => {
                const colIndex = e.data as ColumnIndex;
                handleDrop(colIndex);
            };

            workerRef.current.postMessage({
                board: game.board,
                player: 2
            });
        }
    }, [currentPlayer]);

    return (
        <div className="min-h-screen w-full flex flex-col items-center relative">

            <div className="w-full flex flex-col items-center pt-6 pb-2 shrink-0 z-20">
                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-cyan-300 to-blue-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                    Connect 4
                </h1>
                <h2 className="text-cyan-400 font-bold tracking-widest uppercase mb-4 animate-pulse text-sm md:text-base pt-12">
                    {title}
                </h2>
            </div>

            <div className="grow flex flex-col justify-center items-center w-full pb-10">

                <div className="h-8 flex items-end mb-12">
                    {winner ? (
                        <div
                            className="text-xl md:text-2xl font-bold text-green-400 animate-bounce drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]">
                            🎉 Player {winner} Wins! 🎉
                        </div>
                    ) : isGameOver ? (
                        <div className="text-xl md:text-2xl font-bold text-gray-300">
                            🤝 It's a Draw! 🤝
                        </div>
                    ) : (
                        <div className="text-lg md:text-2xl font-medium text-white">
                            Player <span
                            className={currentPlayer === 1 ? "text-red-500 drop-shadow-[0_0_8px_red]" : "text-yellow-400 drop-shadow-[0_0_8px_yellow]"}>
                                {currentPlayer}
                            </span>'s Turn
                        </div>
                    )}
                </div>

                <div
                    className="bg-blue-600/90 p-3 md:p-4 rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.6)] border-2 border-blue-400/50 backdrop-blur-sm">
                    {board.map((row, rowIndex) => (
                        <div key={rowIndex} className="flex">
                            {row.map((cell, colIndex) => (
                                <div
                                    key={colIndex}
                                    onClick={() => {
                                        const isHumanTurn = currentPlayer === 1;
                                        if (!winner && (isHumanTurn || !vsBot)) {
                                            handleDrop(colIndex as ColumnIndex);
                                        }
                                    }}
                                    className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 p-1 md:p-2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                                >
                                    <div
                                        className={`w-full h-full rounded-full transition-all duration-300 ${getCellClass(cell)}`}/>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                <div className="w-48 mt-8">
                    <MenuButton onClick={handleReset}>
                        Reset Game
                    </MenuButton>
                </div>

            </div>
        </div>
    );
};