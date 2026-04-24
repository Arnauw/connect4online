/**
 * LocalBoard - Shared game board for local single-player (vs Bot) and two-player modes.
 *
 * Props:
 * - title: Header text above the board (e.g., "Player vs Bot")
 * - vsBot: When true, Player 2's moves are handled by the Web Worker AI
 *
 * State persistence:
 * - Game state is saved to localStorage via AuthContext so it survives page refresh
 * - On mount, the saved game is restored if the mode (vsBot flag) matches
 *
 * Bot integration:
 * - The bot runs in a Web Worker to avoid blocking the UI thread
 * - After each Player 1 move, the board is posted to the worker
 * - The worker responds with a column index, which triggers handleDrop as Player 2
 *
 * End game sounds:
 * - hasPlayedEndSoundRef prevents replaying the sound on re-renders
 * - On mount, if the game is already over (restored from localStorage), sound is pre-skipped
 *
 * Leave confirmation:
 * - If game is in progress, MENU button shows a warning modal instead of leaving immediately
 * - If game is over, MENU button leaves directly without confirmation
 */

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
import {BoardUI} from "./BoardUI.tsx";
import {TopNavButton} from "../ui/TopNavButton.tsx";

type LocalBoardProps = {
    title?: string;
    vsBot?: boolean;
};

export const LocalBoard = ({title = "Game", vsBot}: LocalBoardProps) => {
    const { localGameData, setLocalGameData, setActiveGameStatus, settings } = useAuth();

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

    // Prevents replaying end-of-game sound on re-renders after game is already over
    const hasPlayedEndSoundRef = useRef<boolean>(false);

    // Inform PageLayout/AudioController about game status for any global UI reactions
    useEffect(() => {
        setActiveGameStatus(isGameOver ? 'FINISHED' : 'PLAYING');
    }, [isGameOver, setActiveGameStatus]);

    // If the page is loaded with a game already finished (restored from localStorage),
    // mark sound as already played so we don't play it again on mount
    useEffect(() => {
        if (game.gameOver) {
            hasPlayedEndSoundRef.current = true;
        }
    }, []); // Empty deps — only run once on mount

    // Persist every game state change to localStorage so refreshing doesn't lose progress
    useEffect(() => {
        setLocalGameData({ game, score, vsBot: !!vsBot });
    }, [game, board, score, vsBot, setLocalGameData]);

    const handleLeaveMatch = () => {
        setLocalGameData(null);       // Clear persisted game data
        setActiveGameStatus(null);
        navigate('/');
    };

    // Spawn the bot Web Worker on mount, terminate on unmount
    // Worker runs the minimax AI on a separate thread so the UI stays responsive
    useEffect(() => {
        workerRef.current = new Worker(
            new URL('../../workers/bot.worker.ts', import.meta.url),
            {type: 'module'},
        );

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    // Play the appropriate end-game sound (win/loss/draw) exactly once per game
    useEffect(() => {
        if (!isGameOver || hasPlayedEndSoundRef.current) return;

        const sfxEnabled = settings.sfx ?? true;
        if (!sfxEnabled) return;

        hasPlayedEndSoundRef.current = true;

        // Player 1 = human; Player 2 = bot. Winning = victory, losing = loss, tie = draw
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

    /** Apply a move: drop a piece in the column, update all derived state */
    const handleDrop = (col: ColumnIndex) => {
        if (game.dropPiece(col)) {
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

    /** Reset game board while keeping session scores */
    const handleReset = () => {
        const newGame = new Connect4();
        setGame(newGame);
        setBoard(newGame.board);
        setCurrentPlayer(newGame.currentPlayer);
        setWinner(null);
        setIsGameOver(newGame.gameOver);
        hasPlayedEndSoundRef.current = false; // Allow sound to play again next game end
    };

    // Bot move: whenever it becomes Player 2's turn in vs-bot mode, send board to worker
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

            {/* MENU navigates home — confirms first if game is still in progress */}
            <TopNavButton
                label="MENU"
                onClick={() => isGameOver ? handleLeaveMatch() : setShowWarning(true)}
            />

            {/* Header: title + live score */}
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

                {/* Game status banner */}
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
                    disabled={!!(vsBot && currentPlayer === 2)}  // Disable during bot's turn
                />

                {/* Post-game buttons vs in-game buttons */}
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

            {/* Abandon match confirmation modal — shown when leaving mid-game */}
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
