import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { Connect4 } from "../logic/Connect4";

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

export const LocalGameContext = ({ children }: { children: ReactNode }) => {
    // Re-hydrates the Connect4 class instance on restore, JSON.parse loses class methods
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

    useEffect(() => {
        if (localGameData) {
            localStorage.setItem("local_game_data", JSON.stringify(localGameData));
        } else {
            localStorage.removeItem("local_game_data");
        }
    }, [localGameData]);

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

export const useLocalGame = () => {
    const context = useContext(LocalGameCtx);
    if (!context) throw new Error("useLocalGame must be used within a LocalGameContext");
    return context;
};
