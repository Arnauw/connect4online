import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";

export const useSoundEffect = () => {
    const { user } = useAuth();

    const sfxEnabled = user?.settings?.sfx ?? true;
    const volume = user?.settings?.volume ?? 50;

    const playSound = useCallback((audioFile: string) => {
        if (!sfxEnabled) return;

        const audio = new Audio(audioFile);
        audio.volume = volume / 100;
        audio.play().catch(e => console.error("SFX blocked:", e));

    }, [sfxEnabled, volume]);

    return playSound;
};