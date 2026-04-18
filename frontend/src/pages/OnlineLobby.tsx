import {useState, useEffect, useRef, type FormEvent} from "react";
import {useNavigate} from "react-router-dom";
import toast from "react-hot-toast";
import {api} from "../api/axios";
import {MenuButton} from "../components/ui/MenuButton";
import {NeonInput} from "../components/ui/NeonInput";
import { useAuth } from "../context/AuthContext";
import { TopNavButton } from "../components/ui/TopNavButton";

type MenuMode = "select" | "host" | "join";

export const OnlineLobby = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<MenuMode>("select");
    const [roomCode, setRoomCode] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);
    const { activeRoom, setActiveRoom } = useAuth();
    const gameStartedRef = useRef(false);

    const handleCopyCode = () => {
        navigator.clipboard.writeText(roomCode);
        toast.success(`Room code ${roomCode} copied to clipboard!`);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    // --- HOST LOGIC: Create Game ---
    const handleHostGame = async () => {
        // Prevent hosting if already have an active room
        if (activeRoom) {
            toast.error("You already have an active room! Leave it first.");
            return;
        }

        setLoading(true);
        setError("");
        gameStartedRef.current = false; // Reset flag when creating new room
        try {
            const response = await api.post("/api/game/create");
            setRoomCode(response.data.roomCode);
            setMode("host");
            setActiveRoom(response.data.roomCode);
            toast.success(`Game room created! Code: ${response.data.roomCode}`);
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || "Failed to create room.";
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // --- HOST LOGIC: Cancel/Leave Room ---
    const handleCancelHost = async () => {
        if (!roomCode) return;

        try {
            await api.post(`/api/game/${roomCode}/leave`);
            setActiveRoom(null);
            setRoomCode("");
            setMode("select");
            gameStartedRef.current = false; // Reset flag
            toast.success("Room cancelled");
        } catch (err: any) {
            console.error("Failed to cancel room:", err);
            // Still clean up locally even if backend fails
            setActiveRoom(null);
            setRoomCode("");
            setMode("select");
            gameStartedRef.current = false; // Reset flag
        }
    };

    // --- HOST LOGIC: Listen for Opponent ---
    useEffect(() => {
        if (mode !== "host" || !roomCode) return;

        // Connect to Mercure
        const mercureUrl = new URL(`${import.meta.env.VITE_MERCURE_URL}/.well-known/mercure`);
        mercureUrl.searchParams.append('topic', `https://connect4.online/room/${roomCode}`);

        const eventSource = new EventSource(mercureUrl.toString());

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'GAME_STARTED') {
                // Opponent joined! Navigate to the game board.
                gameStartedRef.current = true;
                eventSource.close();
                navigate(`/online/${roomCode}`);
            }
        };

        // Cleanup connection when leaving the page
        return () => {
            eventSource.close();
        };
    }, [mode, roomCode, navigate]);

    // --- CLEANUP: Cancel room if user navigates away while hosting ---
    useEffect(() => {
        return () => {
            // Only cleanup if user navigates away while hosting AND the game hasn't started
            // Don't cleanup if game started (opponent joined) - that's a legitimate navigation
            if (mode === "host" && roomCode && !gameStartedRef.current) {
                api.post(`/api/game/${roomCode}/leave`).catch(err =>
                    console.error("Failed to cleanup room on unmount:", err)
                );
                setActiveRoom(null);
            }
        };
    }, [mode, roomCode, setActiveRoom]);

    // --- JOIN LOGIC: Enter Code ---
    const handleJoinGame = async (e?: FormEvent) => {
        if (e) e.preventDefault();
        if (!joinCode || joinCode.length !== 6) {
            const errorMsg = "Room code must be exactly 6 characters.";
            setError(errorMsg);
            toast.error(errorMsg);
            return;
        }

        setLoading(true);
        setError("");
        try {
            await api.post(`/api/game/join/${joinCode.toUpperCase()}`);
            setActiveRoom(joinCode.toUpperCase());
            toast.success('Joined game! Starting match...');
            navigate(`/online/${joinCode.toUpperCase()}`);
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || "Failed to join room. Is the code correct?";
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">
            <TopNavButton label="BACK" onClick={() => navigate(-1)} />

            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                NETWORK LOBBY
            </h1>

            <div
                className="flex flex-col gap-6 w-full max-w-md bg-slate-900/80 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-[0_0_30px_rgba(34,211,238,0.1)] text-center">

                {error && (
                    <div
                        className="bg-red-900/30 border border-red-500/50 text-red-400 px-4 py-2 rounded text-xs font-bold shadow-[0_0_10px_red]">
                        ⚠️ {error}
                    </div>
                )}

                {/* STATE 1: SELECT MODE */}
                {mode === "select" && (
                    <>
                        <p className="text-slate-400 text-sm mb-4">Establish a new connection or join an existing
                            grid.</p>
                        <MenuButton onClick={handleHostGame} disabled={!!activeRoom}>
                            {loading ? "INITIALIZING..." : activeRoom ? "ALREADY HOSTING" : "HOST NEW MATCH"}
                        </MenuButton>
                        <MenuButton onClick={() => setMode("join")}>
                            JOIN VIA CODE
                        </MenuButton>
                    </>
                )}

                {/* STATE 2: HOSTING (Waiting) */}
                {mode === "host" && (
                    <div className="flex flex-col items-center gap-6 w-full">
                        <p className="text-slate-400 text-sm">Share this uplink code with your opponent:</p>

                        {/* CLICKABLE COPY BOX */}
                        <div
                            onClick={handleCopyCode}
                            className="bg-slate-950 border-2 border-cyan-400 rounded-lg pt-6 pb-4 px-8 shadow-[0_0_20px_rgba(34,211,238,0.3)] cursor-pointer hover:bg-cyan-950/30 transition-colors group flex flex-col items-center min-w-[250px]"
                            title="Click to copy"
                        >
                            <span className="text-5xl font-black text-cyan-400 tracking-[0.2em] uppercase">
                                {roomCode}
                            </span>

                            {/* MOVED INSIDE THE BOX (No more absolute overlap!) */}
                            <div className="h-4 mt-3 flex items-center justify-center">
                                {copied ? (
                                    <span
                                        className="text-green-400 font-bold text-xs flex items-center gap-1 animate-bounce">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                             strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                  d="M4.5 12.75l6 6 9-13.5"/>
                                        </svg>
                                        COPIED!
                                    </span>
                                ) : (
                                    <span
                                        className="text-cyan-400 font-bold text-xs flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                             strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                  d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 0 0-2.25 2.25v6"/>
                                        </svg>
                                        Click to copy
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-cyan-500 font-bold animate-pulse mt-2">
                            <div
                                className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin"/>
                            AWAITING CONNECTION...
                        </div>

                        <button onClick={handleCancelHost}
                                className="text-slate-500 hover:text-white text-sm underline mt-2">
                            Cancel
                        </button>
                    </div>
                )}

                {/* STATE 3: JOINING */}
                {mode === "join" && (
                    <form onSubmit={handleJoinGame} className="flex flex-col items-center gap-6 w-full">
                        <p className="text-slate-400 text-sm">Enter the 6-digit uplink code.</p>

                        <NeonInput
                            label="Room Code"
                            type="text"
                            maxLength={6}
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            placeholder="e.g. A3F7E2"
                            className="text-center text-2xl font-bold uppercase tracking-widest"
                            autoFocus
                        />

                        <MenuButton type="submit">
                            {loading ? "CONNECTING..." : "CONNECT"}
                        </MenuButton>

                        <button type="button" onClick={() => setMode("select")}
                                className="text-slate-500 hover:text-white text-sm underline">
                            Cancel
                        </button>
                    </form>
                )}

            </div>
        </div>
    );
};
