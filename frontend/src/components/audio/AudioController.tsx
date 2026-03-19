import { useEffect, useRef } from "react";
import bgmFile from "../../assets/musics/Grid of Lights.mp3";
import { useAuth } from "../../context/AuthContext.tsx";

export const AudioController = () => {
    const { user } = useAuth();
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const musicEnabled = user?.settings?.music ?? true;
    const volume = user?.settings?.volume ?? 50;

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // Set volume (0.0 to 1.0)
        audio.volume = volume / 100;

        // The function that attempts to play the music
        const playAudio = () => {
            if (musicEnabled && audio.paused) {
                audio.play()
                    .then(() => {
                        // SUCCESS! The browser allowed it.
                        // Now we remove the listeners so they don't fire on every single click.
                        document.removeEventListener("click", playAudio);
                        document.removeEventListener("keydown", playAudio);
                    })
                    .catch(() => {
                        console.log("Browser still blocking audio. Waiting for interaction...");
                    });
            }
        };

        if (musicEnabled) {
            playAudio(); // Try immediately (might fail if no interaction yet)

            // Add global listeners to catch the user's first click or key press
            document.addEventListener("click", playAudio);
            document.addEventListener("keydown", playAudio);
        } else {
            audio.pause();
        }

        // Cleanup function
        return () => {
            document.removeEventListener("click", playAudio);
            document.removeEventListener("keydown", playAudio);
        };
    }, [musicEnabled, volume]);

    return (
        <audio
            ref={audioRef}
            src={bgmFile}
            loop
            style={{ display: 'none' }}
        />
    );
};