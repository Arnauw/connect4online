import { useAuth } from "../context/AuthContext";

export const useSoundEffect = () => {
    const { settings } = useAuth();

    const playSound = (audioFile: string) => {
        if (!(settings.sfx ?? true)) return;
        const audio = new Audio(audioFile);
        audio.volume = (settings.volume ?? 50) / 100;
        audio.play().catch(e => console.error("SFX blocked:", e));
    };

    return playSound;
};
