import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { MenuButton } from "../components/ui/MenuButton";
import { useSoundEffect } from "../hooks/useSoundEffect";
import dropSfx from "../assets/sfx/drop.ogg";
import winSfx from "../assets/sfx/victory.mp3";
import loseSfx from "../assets/sfx/loss.mp3";
import drawSfx from "../assets/sfx/draw.mp3";

type Cell = 0 | 1 | 2;

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

export const OnlineBoard = () => {
    const { roomCode } = useParams<{ roomCode: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const playSound = useSoundEffect();
    const [board, setBoard] = useState<Cell[][]>([]);
    const [status, setStatus] = useState<string>("WAITING");
    const [currentTurn, setCurrentTurn] = useState<number>(1);
    const [myPlayerNum, setMyPlayerNum] = useState<number | null>(null);
    const [opponentName, setOpponentName] = useState<string>("Waiting...");
    const [winnerId, setWinnerId] = useState<number | null>(null);
    const [winningLine, setWinningLine] = useState<[number, number][] | null>(null);

    // Fetch Initial State
    useEffect(() => {
        const fetchGame = async () => {
            try {
                const res = await api.get(`/api/game/${roomCode}`);
                setBoard(res.data.board);
                setStatus(res.data.status);
                setCurrentTurn(res.data.currentTurn);
                setMyPlayerNum(res.data.myPlayerNum);
                setWinnerId(res.data.winnerId);
                setWinningLine(res.data.winningLine || null);

                // Figure out opponent's name
                if (res.data.myPlayerNum === 1) {
                    setOpponentName(res.data.player2 || "Waiting...");
                } else {
                    setOpponentName(res.data.player1 || "Host");
                }
            } catch (err) {
                console.error(err);
                alert("Game not found.");
                navigate('/');
            }
        };
        fetchGame();
    }, [roomCode, navigate]);

    // Listen to Mercure (Real-Time Updates)
    useEffect(() => {
        if (!roomCode) return;

        const mercureUrl = new URL(`${import.meta.env.VITE_MERCURE_URL}/.well-known/mercure`);
        mercureUrl.searchParams.append('topic', `https://connect4.online/room/${roomCode}`);

        const eventSource = new EventSource(mercureUrl.toString());

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'GAME_STARTED') {
                // Refetch the full state to get the opponent's name
                window.location.reload();
            }

            if (data.type === 'BOARD_UPDATED') {
                // Update everything instantly!
                playSound(dropSfx);
                setBoard(data.board);
                setCurrentTurn(data.currentTurn);
                setStatus(data.status);
                setWinnerId(data.winnerId);
                setWinningLine(data.winningLine || null);
            }
        };

        return () => {
            eventSource.close();
        };
    }, [roomCode, playSound]);

    // Send Move to Server
    const handleDrop = async (colIndex: number) => {
        // Prevent clicking if not your turn, or game isn't playing
        if (status !== 'PLAYING' || currentTurn !== myPlayerNum) return;

        try {
            await api.post(`/api/game/${roomCode}/move`, { col: colIndex });
            // Notice we DON'T update the board state here.
            // We trust the server. The server will send a Mercure event, which updates the board above.
        } catch (err: any) {
            console.error("Move rejected:", err.response?.data?.error);
        }
    };

    // NEW: Play end game sounds based on the server's status and winnerId
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

    if (board.length === 0) return <div className="text-white text-center mt-20">Syncing to Grid...</div>;

    const isMyTurn = currentTurn === myPlayerNum;
    const amIWinner = winnerId === user?.id;
    
    return (
        <div className="relative flex flex-col items-center w-full h-full min-h-screen">

            {/* Header */}
            <div className="text-center space-y-2 mt-6 z-10">
                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                    ROOM: {roomCode}
                </h1>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col justify-center items-center w-full gap-6 pb-8">

                {/* Turn / Status Indicator */}
                <div className="h-8 flex items-center justify-center">
                    {status === 'WAITING' ? (
                        <div className="text-cyan-400 animate-pulse font-bold tracking-widest">
                            AWAITING OPPONENT...
                        </div>
                    ) : status === 'FINISHED' ? (
                        <div className={`text-xl md:text-2xl font-bold animate-bounce ${amIWinner ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'text-red-500 drop-shadow-[0_0_8px_red]'}`}>
                            {amIWinner ? '🎉 YOU WIN! 🎉' : '💀 YOU LOSE! 💀'}
                        </div>
                    ) : (
                        <div className="text-lg md:text-2xl font-medium text-white">
                            {isMyTurn ? (
                                <span className={`font-bold ${myPlayerNum === 1 ? 'text-red-500 drop-shadow-[0_0_8px_red]' : 'text-yellow-400 drop-shadow-[0_0_8px_yellow]'}`}>
                                    YOUR TURN
                                </span>
                            ) : (
                                <span className="text-slate-400">
                                    Waiting for <span className={myPlayerNum === 1 ? 'text-yellow-400' : 'text-red-500'}>{opponentName}</span>...
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* The Board */}
                <div className={`bg-blue-600/90 p-3 md:p-4 rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.6)] border-2 border-blue-400/50 backdrop-blur-sm transition-all ${!isMyTurn && status === 'PLAYING' ? 'opacity-70 pointer-events-none' : ''}`}>
                    {board.map((row, rowIndex) => (
                        <div key={rowIndex} className="flex">
                            {row.map((cell, colIndex) => {
                                // 👇 1. Check if this cell is part of the win
                                const isWinnerCell = winningLine?.some(([r, c]) => r === rowIndex && c === colIndex);

                                // 👇 2. Dim the cell if game is over and it's NOT the winning piece
                                const shouldDim = status === 'FINISHED' && cell !== 0 && !isWinnerCell;

                                return (
                                    <div
                                        key={colIndex}
                                        onClick={() => handleDrop(colIndex)}
                                        className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 p-1 md:p-2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                                    >
                                        {cell !== 0 ? (
                                            <div className={`
                                                w-full h-full rounded-full transition-all duration-500
                                                ${getCellClass(cell)}
                                                ${isWinnerCell ? 'animate-victory' : 'animate-drop'}
                                                ${shouldDim ? 'opacity-30 grayscale-[50%]' : ''}
                                            `} />
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-slate-900/40 shadow-inner" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                <div className="w-48 mt-4">
                    <MenuButton secondary onClick={() => navigate('/')}>
                        Leave Match
                    </MenuButton>
                </div>
            </div>
        </div>
    );
};