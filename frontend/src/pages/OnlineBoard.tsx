import {useState, useEffect} from "react";
import {useParams, useNavigate} from "react-router-dom";
import {api} from "../api/axios";
import {useAuth} from "../context/AuthContext";
import {MenuButton} from "../components/ui/MenuButton";
import {useSoundEffect} from "../hooks/useSoundEffect";
import {Avatar} from "../components/ui/Avatar";
import dropSfx from "../assets/sfx/drop.ogg";
import winSfx from "../assets/sfx/victory.mp3";
import loseSfx from "../assets/sfx/loss.mp3";
import drawSfx from "../assets/sfx/draw.mp3";

import type { Cell } from "../logic/Connect4";
import { BoardUI } from "../components/game/BoardUI";

type PlayerScore = { p1: number; p2: number };
type RematchStatus = { p1: boolean; p2: boolean };

export const OnlineBoard = () => {
    const {roomCode} = useParams<{ roomCode: string }>();
    const navigate = useNavigate();
    const {user, setActiveRoom, setActiveGameStatus} = useAuth();
    const playSound = useSoundEffect();
    const [board, setBoard] = useState<Cell[][]>([]);
    const [status, setStatus] = useState<string>("WAITING");
    const [currentTurn, setCurrentTurn] = useState<number>(1);
    const [myPlayerNum, setMyPlayerNum] = useState<number | null>(null);
    const [opponentName, setOpponentName] = useState<string>("Waiting...");
    const [myAvatar, setMyAvatar] = useState<string | null>(null);
    const [opponentAvatar, setOpponentAvatar] = useState<string | null>(null);
    const [winnerId, setWinnerId] = useState<number | null>(null);
    const [winningLine, setWinningLine] = useState<[number, number][] | null>(null);
    const [score, setScore] = useState<PlayerScore>({p1: 0, p2: 0});
    const [rematchStatus, setRematchStatus] = useState<RematchStatus>({p1: false, p2: false});
    const [showWarning, setShowWarning] = useState<boolean>(false);

    // 1. Fetch Initial State
    useEffect(() => {
        const fetchGame = async () => {
            try {
                const res = await api.get(`/api/game/${roomCode}`);
                setBoard(res.data.board);
                setStatus(res.data.status);
                setActiveGameStatus(res.data.status);
                setCurrentTurn(res.data.currentTurn);
                setMyPlayerNum(res.data.myPlayerNum);
                setWinnerId(res.data.winnerId);
                setWinningLine(res.data.winningLine);
                setScore({p1: res.data.scoreP1, p2: res.data.scoreP2});
                setRematchStatus({p1: res.data.p1WantsRematch, p2: res.data.p2WantsRematch});

                if (res.data.myPlayerNum === 1) {
                    setOpponentName(res.data.player2 || "Waiting...");
                    setMyAvatar(res.data.player1Avatar);
                    setOpponentAvatar(res.data.player2Avatar);
                } else {
                    setOpponentName(res.data.player1 || "Host");
                    setMyAvatar(res.data.player2Avatar);
                    setOpponentAvatar(res.data.player1Avatar);
                }
            } catch (err) {
                console.error(err);
                alert("Game not found.");
                navigate('/');
            }
        };
        fetchGame();
    }, [roomCode, navigate]);

    useEffect(() => {
        return () => setActiveGameStatus(null);
    }, [setActiveGameStatus]);

    // 2. Listen to Mercure (Real-Time Updates)
    useEffect(() => {
        if (!roomCode) return;

        const mercureUrl = new URL(`${import.meta.env.VITE_MERCURE_URL}/.well-known/mercure`);
        mercureUrl.searchParams.append('topic', `https://connect4.online/room/${roomCode}`);
        const eventSource = new EventSource(mercureUrl.toString());

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'GAME_STARTED') {
                window.location.reload();
            }

            if (data.type === 'BOARD_UPDATED') {
                playSound(dropSfx);
                setBoard(data.board);
                setCurrentTurn(data.currentTurn);
                setStatus(data.status);
                setActiveGameStatus(data.status);
                setWinnerId(data.winnerId);
                setWinningLine(data.winningLine);

                if (data.scoreP1 !== undefined) {
                    setScore({p1: data.scoreP1, p2: data.scoreP2});
                }

                if (data.status === 'FINISHED') {
                    setRematchStatus({p1: false, p2: false});
                }
            }

            // 👇 NEW: CATCH REMATCH EVENTS
            if (data.type === 'REMATCH_REQUESTED') {
                setRematchStatus(prev => ({
                    ...prev,
                    p1: data.playerRequesting === 1 ? true : prev.p1,
                    p2: data.playerRequesting === 2 ? true : prev.p2,
                }));
            }

            if (data.type === 'GAME_RESTARTED') {
                setBoard(data.board);
                setCurrentTurn(data.currentTurn);
                setStatus('PLAYING');
                setActiveGameStatus('PLAYING');
                setWinnerId(null);
                setWinningLine(null);
                setScore({p1: data.scoreP1, p2: data.scoreP2});
                setRematchStatus({p1: false, p2: false});
            }

            if (data.type === 'OPPONENT_LEFT') {
                playSound(winSfx);
                setBoard(data.board);
                setCurrentTurn(data.currentTurn);
                setStatus('FINISHED');
                setActiveGameStatus('FINISHED');
                setWinnerId(data.winnerId);
                setScore({p1: data.scoreP1, p2: data.scoreP2});

                // Clear active room locally so we don't get the "Rejoin" button anymore
                setActiveRoom(null);
            }
        };

        return () => eventSource.close();
    }, [roomCode, playSound]);

    // Play sounds when game ends
    useEffect(() => {
        if (status === 'FINISHED') {
            if (winnerId === user?.id) {
                playSound(winSfx);
            } else if (winnerId !== null) {
                playSound(loseSfx);
            } else {
                playSound(drawSfx);
            }
        }
    }, [status, winnerId, user?.id, playSound]);

    // 3. Send Move to Server
    const handleDrop = async (colIndex: number) => {
        if (status !== 'PLAYING' || currentTurn !== myPlayerNum) return;

        try {
            await api.post(`/api/game/${roomCode}/move`, {col: colIndex});
        } catch (err: any) {
            console.error("Move rejected:", err.response?.data?.error);
        }
    };

    // 👇 NEW: Request Rematch
    const handleRematch = async () => {
        try {
            await api.post(`/api/game/${roomCode}/rematch`);
            // Update local state optimistically
            setRematchStatus(prev => ({
                ...prev,
                p1: myPlayerNum === 1 ? true : prev.p1,
                p2: myPlayerNum === 2 ? true : prev.p2,
            }));
        } catch (err) {
            console.error("Failed to request rematch", err);
        }
    };

    const executeLeaveMatch = async () => {
        try {
            await api.post(`/api/game/${roomCode}/leave`);
        } catch (err) {
            console.error("Error leaving match:", err);
        }
        setActiveRoom(null);
        navigate('/');
    };

    // The handler for the Menu/Leave buttons
    const handleLeaveClick = () => {
        if (status === 'PLAYING') {
            setShowWarning(true); // Pop the modal
        } else {
            executeLeaveMatch();  // Leave instantly if game is over/waiting
        }
    };

    if (board.length === 0) return <div className="text-white text-center mt-20">Syncing to Grid...</div>;

    const isMyTurn = currentTurn === myPlayerNum;
    const amIWinner = winnerId === user?.id;

    // Check if I have already requested a rematch
    const haveIRequestedRematch = (myPlayerNum === 1 && rematchStatus.p1) || (myPlayerNum === 2 && rematchStatus.p2);

    return (
        <div className="relative flex flex-col items-center w-full h-full min-h-screen">

            <button
                onClick={handleLeaveClick}
                className="absolute top-6 left-6 p-2 text-cyan-400 hover:text-cyan-100 transition-colors flex items-center gap-2 group z-50 animate-fade-in"
            >
                <div className="p-2 rounded-full border border-cyan-500/30 group-hover:border-cyan-400 group-hover:bg-cyan-950/50 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </div>
                <span className="font-bold tracking-widest hidden sm:block text-sm">MENU</span>
            </button>

            {/* Header */}
            <div className="text-center space-y-2 mt-6 z-10 w-full flex flex-col items-center">
                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                    ROOM: {roomCode}
                </h1>

                {/* 👇 SCOREBOARD 👇 */}
                <div
                    className="flex items-center gap-4 md:gap-6 mt-4 bg-slate-900/60 px-4 md:px-6 py-2 rounded-full border border-slate-700 backdrop-blur-md shadow-lg">

                    {/* PLAYER 1 (Red) */}
                    <div className="flex items-center gap-3">
                        <Avatar
                            avatarStr={myPlayerNum === 1 ? myAvatar : opponentAvatar}
                            className="w-10 h-10 rounded-full border-2 border-red-500 shadow-[0_0_10px_red] text-red-500"
                        />
                        <div className="flex flex-col items-center min-w-[50px]">
                            <span
                                className="text-[10px] text-slate-400 uppercase tracking-widest">{myPlayerNum === 1 ? "You" : opponentName}</span>
                            <span
                                className="text-2xl font-black text-red-500 drop-shadow-[0_0_8px_red]">{score.p1}</span>
                        </div>
                    </div>

                    <span className="text-slate-600 font-bold text-xl">-</span>

                    {/* PLAYER 2 (Yellow) */}
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center min-w-[50px]">
                            <span
                                className="text-[10px] text-slate-400 uppercase tracking-widest">{myPlayerNum === 2 ? "You" : opponentName}</span>
                            <span
                                className="text-2xl font-black text-yellow-400 drop-shadow-[0_0_8px_yellow]">{score.p2}</span>
                        </div>
                        <Avatar
                            avatarStr={myPlayerNum === 2 ? myAvatar : opponentAvatar}
                            className="w-10 h-10 rounded-full border-2 border-yellow-400 shadow-[0_0_10px_yellow] text-yellow-400"
                        />
                    </div>

                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col justify-center items-center w-full gap-6 pb-8">

                {/* Turn / Status Indicator */}
                <div className="min-h-[4rem] flex items-center justify-center my-2">
                    {status === 'WAITING' ? (
                        <div className="text-cyan-400 animate-pulse font-bold tracking-widest">
                            AWAITING OPPONENT...
                        </div>
                    ) : status === 'FINISHED' ? (
                        <div
                            className={`text-xl md:text-2xl font-bold animate-bounce ${amIWinner ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]' : winnerId === null ? 'text-gray-300' : 'text-red-500 drop-shadow-[0_0_8px_red]'}`}>
                            {amIWinner ? '🎉 YOU WIN! 🎉' : winnerId === null ? '🤝 DRAW! 🤝' : '💀 YOU LOSE! 💀'}
                        </div>
                    ) : (
                        <div className="text-lg md:text-2xl font-medium text-white">
                            {isMyTurn ? (
                                <span
                                    className={`font-bold ${myPlayerNum === 1 ? 'text-red-500 drop-shadow-[0_0_8px_red]' : 'text-yellow-400 drop-shadow-[0_0_8px_yellow]'}`}>
                                    YOUR TURN
                                </span>
                            ) : (
                                <span className="text-slate-400">
                                    Waiting for <span
                                    className={myPlayerNum === 1 ? 'text-yellow-400' : 'text-red-500'}>{opponentName}</span>...
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* The Board */}
                <BoardUI
                    board={board}
                    onDrop={handleDrop}
                    winningLine={winningLine}
                    isGameOver={status === 'FINISHED'}
                    disabled={!isMyTurn && status === 'PLAYING'}
                />

                {/* 👇 ACTIONS 👇 */}
                {status === 'FINISHED' ? (
                    <div className="flex flex-col items-center gap-3 w-64 mt-4">

                        {!haveIRequestedRematch && (
                            (myPlayerNum === 1 && rematchStatus.p2) || (myPlayerNum === 2 && rematchStatus.p1)
                        ) && (
                            <div
                                className="text-cyan-400 font-bold text-sm animate-pulse mb-1 drop-shadow-[0_0_5px_cyan]">
                                Opponent wants a rematch!
                            </div>
                        )}

                        <MenuButton
                            // PREVENT DOUBLE CLICKS: Pass undefined to onClick if already requested
                            onClick={haveIRequestedRematch ? undefined : handleRematch}
                            secondary={haveIRequestedRematch}
                        >
                            {haveIRequestedRematch ? "AWAITING OPPONENT..." : "REMATCH"}
                        </MenuButton>

                        <button onClick={handleLeaveClick} className="text-slate-500 hover:text-white text-sm underline transition-colors mt-2">
                            Leave Match
                        </button>
                    </div>
                ) : (
                    <div className="w-48 mt-4">
                        <MenuButton secondary onClick={handleLeaveClick}>
                            Leave Match
                        </MenuButton>
                    </div>
                )}
            </div>

            {/* 👇 LOCAL MODAL 👇 */}
            {showWarning && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div
                        className="bg-slate-900 border-2 border-red-500 rounded-2xl p-6 w-full max-w-sm shadow-[0_0_40px_rgba(220,38,38,0.4)] text-center animate-bounce-in">
                        <h3 className="text-xl font-bold text-red-500 mb-2">ABANDON MATCH?</h3>
                        <p className="text-slate-300 mb-6 text-sm">
                            Leaving the grid now will count as a forfeit. Are you sure you want to disconnect?
                        </p>

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => setShowWarning(false)}
                                className="px-6 py-2 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors font-bold text-sm"
                            >
                                STAY
                            </button>
                            <button
                                onClick={executeLeaveMatch}
                                className="px-6 py-2 rounded-full bg-red-600 text-white hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all font-bold text-sm"
                            >
                                FORFEIT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};