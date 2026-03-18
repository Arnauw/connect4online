import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/axios";
import { MenuButton } from "../components/ui/MenuButton";
import { NeonInput } from "../components/ui/NeonInput";

type MenuMode = "select" | "host" | "join";

export const OnlineGame = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<MenuMode>("select");
    const [roomCode, setRoomCode] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // --- HOST LOGIC: Create Game ---
    const handleHostGame = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await api.post("/api/game/create");
            setRoomCode(response.data.roomCode);
            setMode("host");
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to create room.");
        } finally {
            setLoading(false);
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
                eventSource.close();
                navigate(`/online/${roomCode}`);
            }
        };

        // Cleanup connection when leaving the page
        return () => {
            eventSource.close();
        };
    }, [mode, roomCode, navigate]);

    // --- JOIN LOGIC: Enter Code ---
    const handleJoinGame = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!joinCode || joinCode.length !== 4) {
            setError("Room code must be exactly 4 characters.");
            return;
        }

        setLoading(true);
        setError("");
        try {
            await api.post(`/api/game/join/${joinCode.toUpperCase()}`);
            // If successful, the backend just sent the Mercure ping to the host!
            // We can just navigate directly to the game board.
            navigate(`/online/${joinCode.toUpperCase()}`);
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to join room. Is the code correct?");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                NETWORK LOBBY
            </h1>

            <div className="flex flex-col gap-6 w-full max-w-md bg-slate-900/80 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-[0_0_30px_rgba(34,211,238,0.1)] text-center">

                {error && (
                    <div className="bg-red-900/30 border border-red-500/50 text-red-400 px-4 py-2 rounded text-xs font-bold shadow-[0_0_10px_red]">
                        ⚠️ {error}
                    </div>
                )}

                {/* STATE 1: SELECT MODE */}
                {mode === "select" && (
                    <>
                        <p className="text-slate-400 text-sm mb-4">Establish a new connection or join an existing grid.</p>
                        <MenuButton onClick={handleHostGame}>
                            {loading ? "INITIALIZING..." : "HOST NEW MATCH"}
                        </MenuButton>
                        <MenuButton secondary onClick={() => setMode("join")}>
                            JOIN VIA CODE
                        </MenuButton>
                    </>
                )}

                {/* STATE 2: HOSTING (Waiting) */}
                {mode === "host" && (
                    <div className="flex flex-col items-center gap-6">
                        <p className="text-slate-400 text-sm">Share this uplink code with your opponent:</p>

                        <div className="bg-slate-950 border-2 border-cyan-400 rounded-lg py-4 px-8 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                            <span className="text-5xl font-black text-cyan-400 tracking-[0.2em] uppercase">
                                {roomCode}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 text-cyan-500 font-bold animate-pulse mt-4">
                            <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                            AWAITING CONNECTION...
                        </div>

                        <button onClick={() => setMode("select")} className="text-slate-500 hover:text-white text-sm underline mt-4">
                            Cancel
                        </button>
                    </div>
                )}

                {/* STATE 3: JOINING */}
                {mode === "join" && (
                    <form onSubmit={handleJoinGame} className="flex flex-col items-center gap-6 w-full">
                        <p className="text-slate-400 text-sm">Enter the 4-digit uplink code.</p>

                        <NeonInput
                            label="Room Code"
                            type="text"
                            maxLength={4}
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            placeholder="e.g. X9L2"
                            className="text-center text-2xl font-bold uppercase tracking-widest"
                        />

                        <MenuButton type="submit">
                            {loading ? "CONNECTING..." : "CONNECT"}
                        </MenuButton>

                        <button type="button" onClick={() => setMode("select")} className="text-slate-500 hover:text-white text-sm underline">
                            Cancel
                        </button>
                    </form>
                )}

            </div>
        </div>
    );
};