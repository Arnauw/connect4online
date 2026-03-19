import { useEffect, useRef } from "react";
import bgmFile from "../../assets/musics/Grid of Lights.mp3";
import {useAuth} from "../../context/AuthContext.tsx";

export const AudioController = () => {
    const { user } = useAuth();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const musicEnabled = user?.settings?.music ?? true;
    const volume = user?.settings?.volume ?? 50;

    useEffect(() => {
        if (audioRef.current) {
            // Convert 0-100 scale to 0.0-1.0 scale for HTML Audio
            audioRef.current.volume = volume / 100;

            if (musicEnabled) {
                // Browsers block autoplay unless the user has interacted with the page.
                // We wrap it in a catch block so it doesn't throw angry red errors on first load.
                audioRef.current.play().catch(() => {
                    console.log("Waiting for user interaction to play audio...");
                });
            } else {
                audioRef.current.pause();
            }
        }
    },[musicEnabled, volume]);

    return (
        <audio
            ref={audioRef}
            src={bgmFile}
            loop
            style={{ display: 'none' }}
        />
    );
};