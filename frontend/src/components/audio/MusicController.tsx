import { useEffect, useRef } from "react";
import bgmFile from "../../assets/sounds/musics/Grid_of_Lights.mp3";
import { useAuth } from "../../context/AuthContext.tsx";

export const MusicController = () => {
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
                        // worked, remove the listeners so they don't fire on every click
                        document.removeEventListener("click", playAudio);
                        document.removeEventListener("keydown", playAudio);
                    })
                    .catch(() => {
                        console.log("Browser still blocking audio. Waiting for interaction...");
                    });
            }
        };

        if (musicEnabled) {
            playAudio();
            // some browsers block autoplay until the user does something, so wait for the first click or keypress
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

    return (
        <audio
            ref={audioRef}
            src={bgmFile}
            loop
            style={{ display: 'none' }}
        />
    );
};
