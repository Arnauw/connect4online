import {useEffect, useRef, useState} from "react";
import { useNavigate } from "react-router-dom";
import {type Cell, type ColumnIndex, Connect4, type Player} from "../logic/Connect4.ts";
import {MenuButton} from "../components/ui/MenuButton.tsx";
import {useSoundEffect} from "../hooks/useSoundEffect";
import dropSfx from "../assets/sfx/drop.ogg";
import winSfx from "../assets/sfx/victory.mp3";
import loseSfx from "../assets/sfx/loss.mp3";
import drawSfx from "../assets/sfx/draw.mp3";
import {useAuth} from "../context/AuthContext.tsx";
import {BoardUI} from "../components/game/BoardUI.tsx";

type LocalBoardProps = {
    title?: string;
    vsBot?: boolean;
};

export const LocalBoard = ({title = "Game", vsBot}: LocalBoardProps) => {
    const { localGameData, setLocalGameData, setActiveGameStatus } = useAuth();
    const [game, setGame] = useState<Connect4>(() => {
        if (localGameData && localGameData.vsBot === vsBot) return localGameData.game;
        return new Connect4();
    });
    const [board, setBoard] = useState<Cell[][]>(game.board);
    const [currentPlayer, setCurrentPlayer] = useState<Player>(game.currentPlayer);
    const [winner, setWinner] = useState<Player | null>(game.winner);
    const [isGameOver, setIsGameOver] = useState<boolean>(game.gameOver);
    const [score, setScore] = useState(localGameData?.score || { p1: 0, p2: 0 });
    const [showWarning, setShowWarning] = useState<boolean>(false);
    const navigate = useNavigate();
    const winningLine = game.winningLine;
    const workerRef = useRef<Worker | null>(null);
    const playSound = useSoundEffect();

    // Tell the Global Layout if we are playing or finished
    useEffect(() => {
        setActiveGameStatus(isGameOver ? 'FINISHED' : 'PLAYING');
    }, [isGameOver, setActiveGameStatus]);

    // Save every move to the Global Memory Backpack
    useEffect(() => {
        setLocalGameData({ game, score, vsBot: !!vsBot });
    }, [game, score, vsBot, setLocalGameData]);

    const handleLeaveMatch = () => {
        setLocalGameData(null); // Wipe memory
        setActiveGameStatus(null);
        navigate('/');
    };

    // We must import Worker that way because it needs to use a different Thread
    // (So it's not blocked when we increase the strength of the bot later with the minimax algo)
    useEffect(() => {
        workerRef.current = new Worker(
            new URL('../workers/bot.worker.ts', import.meta.url),
            {type: 'module'},
        );

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    // UseEffect to handle end game sounds.
    useEffect(() => {
        if (!isGameOver) return;

        if (winner === 1) {
            playSound(winSfx);
        } else if (winner === 2) {
            playSound(loseSfx);
        } else {
            playSound(drawSfx);
        }
    }, [winner, isGameOver, playSound]);

    const handleDrop = (col: ColumnIndex) => {
        if (game.dropPiece(col)) {
            playSound(dropSfx);
            setBoard(game.board.map(row => [...row]));
            setCurrentPlayer(game.currentPlayer);
            setWinner(game.winner);
            setIsGameOver(game.gameOver);
            if (game.winner) {
                setWinner(game.winner);
                setScore(prev => ({
                    ...prev,
                    p1: game.winner === 1 ? prev.p1 + 1 : prev.p1,
                    p2: game.winner === 2 ? prev.p2 + 1 : prev.p2
                }));
            }
        }
    };

    const handleReset = () => {
        const newGame = new Connect4();
        setGame(newGame);
        setBoard(newGame.board);
        setCurrentPlayer(newGame.currentPlayer);
        setWinner(null);
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

            {/* 👇 TOP LEFT MENU BUTTON (Added back here) 👇 */}
            <button
                onClick={() => isGameOver ? handleLeaveMatch() : setShowWarning(true)}
                className="absolute top-6 left-6 p-2 text-cyan-400 hover:text-cyan-100 transition-colors flex items-center gap-2 group z-50 animate-fade-in"
            >
                <div className="p-2 rounded-full border border-cyan-500/30 group-hover:border-cyan-400 group-hover:bg-cyan-950/50 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </div>
                <span className="font-bold tracking-widest hidden sm:block text-sm">MENU</span>
            </button>

            <div className="w-full flex flex-col items-center pt-6 pb-2 shrink-0 z-20">
                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-cyan-300 to-blue-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                    Connect 4
                </h1>
                <h2 className="text-cyan-400 font-bold tracking-widest uppercase mb-4 animate-pulse text-sm md:text-base pt-12">
                    {title}
                </h2>

                <div
                    className="flex items-center gap-6 bg-slate-900/60 px-6 py-2 rounded-full border border-slate-700 backdrop-blur-md shadow-lg">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest">Player 1</span>
                        <span className="text-2xl font-black text-red-500 drop-shadow-[0_0_8px_red]">{score.p1}</span>
                    </div>
                    <span className="text-slate-600 font-bold text-xl">-</span>
                    <div className="flex flex-col items-center">
                        <span
                            className="text-[10px] text-slate-400 uppercase tracking-widest">{vsBot ? "Bot" : "Player 2"}</span>
                        <span
                            className="text-2xl font-black text-yellow-400 drop-shadow-[0_0_8px_yellow]">{score.p2}</span>
                    </div>
                </div>
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

                <BoardUI
                    board={board}
                    onDrop={(colIndex) => handleDrop(colIndex as ColumnIndex)}
                    winningLine={winningLine}
                    isGameOver={isGameOver}
                    disabled={!!(vsBot && currentPlayer === 2)}
                />

                {/* 👇 REPLACED BOTTOM BUTTONS 👇 */}
                {isGameOver ? (
                    <div className="flex flex-col items-center gap-3 w-64 mt-8">
                        <MenuButton onClick={handleReset}>PLAY AGAIN</MenuButton>
                        <button onClick={handleLeaveMatch} className="text-slate-500 hover:text-white text-sm underline transition-colors mt-2">
                            Leave Match
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 w-48 mt-8">
                        <MenuButton onClick={handleReset}>RESTART GAME</MenuButton>
                        <MenuButton secondary onClick={() => setShowWarning(true)}>
                            Leave Match
                        </MenuButton>
                    </div>
                )}

            </div>

            {/* 👇 ADDED LOCAL ABANDON MODAL 👇 */}
            {showWarning && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border-2 border-red-500 rounded-2xl p-6 w-full max-w-sm shadow-[0_0_40px_rgba(220,38,38,0.4)] text-center animate-bounce-in">
                        <h3 className="text-xl font-bold text-red-500 mb-2">ABANDON MATCH?</h3>
                        <p className="text-slate-300 mb-6 text-sm">
                            Leaving the grid now will erase your current progress. Are you sure?
                        </p>

                        <div className="flex gap-4 justify-center">
                            <button onClick={() => setShowWarning(false)} className="px-6 py-2 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors font-bold text-sm">
                                STAY
                            </button>
                            <button onClick={handleLeaveMatch} className="px-6 py-2 rounded-full bg-red-600 text-white hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all font-bold text-sm">
                                FORFEIT
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
