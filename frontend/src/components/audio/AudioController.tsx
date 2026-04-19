/**
 * AudioController Component
 *
 * Manages background music playback for the entire app.
 * Rendered once inside PageLayout so it persists across page navigation.
 *
 * Browser autoplay policy:
 * Browsers block audio until the user has interacted with the page (clicked or pressed a key).
 * This component handles that restriction by:
 * 1. Attempting to play immediately on mount (succeeds if user previously interacted)
 * 2. Adding global click/keydown listeners that retry playback on first user interaction
 * 3. Removing those listeners once playback succeeds (no need to keep listening)
 *
 * Reacts to settings changes:
 * - musicEnabled → play or pause
 * - volume → update audio element volume immediately
 */

import { useEffect, useRef } from "react";
import bgmFile from "../../assets/sounds/musics/Grid_of_Lights.mp3";
import { useAuth } from "../../context/AuthContext.tsx";

export const AudioController = () => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { settings } = useAuth();
    const musicEnabled = settings.music ?? false;
    const volume = settings.volume ?? 50;

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.volume = volume / 100;

        const playAudio = () => {
            if (musicEnabled && audio.paused) {
                audio.play()
                    .then(() => {
                        // Playback succeeded — remove listeners so they don't fire on every click
                        document.removeEventListener("click", playAudio);
                        document.removeEventListener("keydown", playAudio);
                    })
                    .catch(() => {
                        console.log("Browser still blocking audio. Waiting for interaction...");
                    });
            }
        };

        if (musicEnabled) {
            playAudio(); // Try immediately in case the user already interacted earlier
            // Fallback: listen for the first user interaction to unlock autoplay
            document.addEventListener("click", playAudio);
            document.addEventListener("keydown", playAudio);
        } else {
            audio.pause();
        }

        return () => {
            document.removeEventListener("click", playAudio);
            document.removeEventListener("keydown", playAudio);
        };
    }, [musicEnabled, volume]);

    // Hidden audio element — looping background music track
    return (
        <audio
            ref={audioRef}
            src={bgmFile}
            loop
            style={{ display: 'none' }}
        />
    );
};
