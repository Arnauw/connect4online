/**
 * Local Game Context
 *
 * Manages the state of in-progress local games (vs Bot or 2P mode).
 * Kept separate from AuthContext because this is game state, not auth state.
 *
 * Provides global access to:
 * - localGameData: the current game instance, score, and mode (vsBot flag)
 * - setLocalGameData: update or clear the game state
 *
 * State persistence:
 * - Game state is saved to localStorage so games survive page refresh
 * - On mount, the saved game is re-hydrated (Connect4 class instance restored from JSON)
 * - On logout, game state is cleared via the "auth_logout" custom event
 *
 * Usage:
 * const { localGameData, setLocalGameData } = useLocalGame();
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { Connect4 } from "../logic/Connect4";

/**
 * Structure for local game state (vs Bot or 2 Player)
 * Persisted to localStorage so games survive page refresh
 */
export interface LocalGameData {
    game: Connect4;
    score: { p1: number; p2: number };
    vsBot: boolean;
}

interface LocalGameContextType {
    localGameData: LocalGameData | null;
    setLocalGameData: (data: LocalGameData | null) => void;
}

const LocalGameCtx = createContext<LocalGameContextType | null>(null);

/**
 * LocalGameContext Component
 * Wraps the app and provides local game state to all components
 */
export const LocalGameContext = ({ children }: { children: ReactNode }) => {
    // Restore saved game from localStorage on mount
    // Re-hydrates the Connect4 class instance (JSON.parse loses class methods)
    const [localGameData, setLocalGameData] = useState<LocalGameData | null>(() => {
        const saved = localStorage.getItem("local_game_data");
        if (!saved) return null;
        try {
            const parsed = JSON.parse(saved);
            const game = new Connect4();
            Object.assign(game, parsed.game);
            return { ...parsed, game };
        } catch (e) {
            console.error("Failed to load local game data", e);
            return null;
        }
    });

    // Persist every game state change to localStorage so refreshing doesn't lose progress
    useEffect(() => {
        if (localGameData) {
            localStorage.setItem("local_game_data", JSON.stringify(localGameData));
        } else {
            localStorage.removeItem("local_game_data");
        }
    }, [localGameData]);

    // Clear game state when AuthProvider fires the logout event
    useEffect(() => {
        const handleLogout = () => setLocalGameData(null);
        window.addEventListener("auth_logout", handleLogout);
        return () => window.removeEventListener("auth_logout", handleLogout);
    }, []);

    return (
        <LocalGameCtx.Provider value={{ localGameData, setLocalGameData }}>
            {children}
        </LocalGameCtx.Provider>
    );
};

/**
 * useLocalGame Hook
 *
 * Custom hook to access the local game context from any component.
 * Throws an error if used outside of LocalGameContext.
 *
 * Usage:
 * const { localGameData, setLocalGameData } = useLocalGame();
 */
export const useLocalGame = () => {
    const context = useContext(LocalGameCtx);
    if (!context) throw new Error("useLocalGame must be used within a LocalGameContext");
    return context;
};
