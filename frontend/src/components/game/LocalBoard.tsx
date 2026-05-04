import {useEffect, useRef, useState} from "react";
import { useNavigate } from "react-router-dom";
import {type Cell, type ColumnIndex, Connect4, type Player} from "../../logic/Connect4.ts";
import {MenuButton} from "../ui/MenuButton.tsx";
import {useSoundEffect} from "../../hooks/useSoundEffect";
import dropSfx from "../../assets/sounds/sfx/drop.ogg";
import winSfx from "../../assets/sounds/sfx/victory.mp3";
import loseSfx from "../../assets/sounds/sfx/loss.mp3";
import drawSfx from "../../assets/sounds/sfx/draw.mp3";
import {useAuth} from "../../context/AuthContext.tsx";
import {useLocalGame} from "../../context/LocalGameContext.tsx";
import {BoardUI} from "./BoardUI.tsx";
import {TopNavButton} from "../ui/TopNavButton.tsx";

type LocalBoardProps = {
    title?: string;
    vsBot?: boolean;
};

export const LocalBoard = ({title = "Game", vsBot}: LocalBoardProps) => {
    const { setActiveGameStatus, settings } = useAuth();
    const { localGameData, setLocalGameData } = useLocalGame();
    // Restore saved game from localStorage if it matches the current mode, else start fresh
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
    const endGameAudioRef = useRef<HTMLAudioElement | null>(null);
    // So we don't replay the end-of-game sound on every re-render once the game is over
    const hasPlayedEndSoundRef = useRef<boolean>(false);

    // Tell MusicController whether a game is active so it can react accordingly
    useEffect(() => {
        setActiveGameStatus(isGameOver ? 'FINISHED' : 'PLAYING');
    }, [isGameOver, setActiveGameStatus]);

    // If we're restoring a finished game from localStorage,
    // mark the sound as played so it doesn't fire again on mount
    useEffect(() => {
        if (game.gameOver) {
            hasPlayedEndSoundRef.current = true;
        }
    }, []);

    useEffect(() => {
        setLocalGameData({ game, score, vsBot: !!vsBot });
    }, [game, board, score, vsBot, setLocalGameData]);

    const handleLeaveMatch = () => {
        setLocalGameData(null);
        setActiveGameStatus(null);
        navigate('/');
    };

    useEffect(() => {
        workerRef.current = new Worker(
            new URL('../../workers/bot.worker.ts', import.meta.url),
            {type: 'module'},
        );

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    useEffect(() => {
        if (!isGameOver || hasPlayedEndSoundRef.current) return;

        const sfxEnabled = settings.sfx ?? true;
        if (!sfxEnabled) return;

        hasPlayedEndSoundRef.current = true;

        // Sound plays from Player 1's perspective in both 1P and 2P modes
        // (in 2P mode, Player 2 winning still triggers the "loss" sound)
        let soundFile: string;
        if (winner === 1) {
            soundFile = winSfx;
        } else if (winner === 2) {
            soundFile = loseSfx;
        } else {
            soundFile = drawSfx;
        }

        const audio = new Audio(soundFile);
        audio.volume = (settings.volume ?? 50) / 100;
        endGameAudioRef.current = audio;
        audio.play().catch(e => console.error("End game sound blocked:", e));

        return () => {
            if (endGameAudioRef.current) {
                endGameAudioRef.current.pause();
                endGameAudioRef.current.currentTime = 0;
                endGameAudioRef.current = null;
            }
        };
    }, [winner, isGameOver, settings.sfx, settings.volume]);

    const handleDrop = (col: ColumnIndex) => {
        if (game.applyMove(col) !== null) {
            playSound(dropSfx);
            setBoard(game.board.map(row => [...row]));  // Spread to trigger re-render
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
        hasPlayedEndSoundRef.current = false; // Allow sound to play again next game end
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
            });
        }
    }, [currentPlayer]);

    return (
        <div className="min-h-screen w-full flex flex-col items-center relative">

            <TopNavButton
                label="MENU"
                onClick={() => isGameOver ? handleLeaveMatch() : setShowWarning(true)}
            />

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
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest">{vsBot ? "Bot" : "Player 2"}</span>
                        <span className="text-2xl font-black text-yellow-400 drop-shadow-[0_0_8px_yellow]">{score.p2}</span>
                    </div>
                </div>
            </div>

            <div className="grow flex flex-col justify-center items-center w-full pb-10">

                <div className="h-8 flex items-end mb-12">
                    {winner ? (
                        <div className="text-xl md:text-2xl font-bold text-green-400 animate-bounce drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]">
                            🎉 Player {winner} Wins! 🎉
                        </div>
                    ) : isGameOver ? (
                        <div className="text-xl md:text-2xl font-bold text-gray-300">
                            🤝 It's a Draw! 🤝
                        </div>
                    ) : (
                        <div className="text-lg md:text-2xl font-medium text-white">
                            Player <span className={currentPlayer === 1 ? "text-red-500 drop-shadow-[0_0_8px_red]" : "text-yellow-400 drop-shadow-[0_0_8px_yellow]"}>
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
