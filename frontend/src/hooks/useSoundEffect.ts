/**
 * useSoundEffect Hook
 *
 * Custom React hook for playing sound effects with user preferences.
 * Reads settings directly from the JWT user object — guest settings are not applied.
 * (Known limitation: guests who change SFX/volume will not have those settings respected here)
 *
 * Usage:
 * const playSound = useSoundEffect();
 * playSound(dropSfx);  // Plays the sound if SFX is enabled
 */

import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * Hook that returns a function to play sound effects
 * Checks logged-in user settings before playing (defaults apply when not logged in)
 *
 * @returns playSound function that accepts an audio file path
 */
export const useSoundEffect = () => {
    // Reads directly from JWT user object — bypasses the merged `settings` object in AuthContext
    // so guest settings changes are not reflected here
    const { user } = useAuth();

    // Falls back to defaults when no user is logged in (guest)
    const sfxEnabled = user?.settings?.sfx ?? true;   // Default: SFX enabled
    const volume = user?.settings?.volume ?? 50;      // Default: 50% volume

    /**
     * Plays a sound effect if SFX is enabled
     *
     * @param audioFile - Path to the audio file to play (e.g., "/sounds/drop.ogg")
     *
     * Features:
     * - Only plays if user has SFX enabled in settings
     * - Respects user's volume preference
     * - Catches and logs browser autoplay blocking errors
     *
     * Note: useCallback ensures this function doesn't change unless
     * sfxEnabled or volume changes, preventing unnecessary re-renders
     */
    const playSound = useCallback((audioFile: string) => {
        // Don't play if user has disabled SFX
        if (!sfxEnabled) return;

        // Create new Audio instance with the file
        const audio = new Audio(audioFile);

        // Set volume based on user preference (convert 0-100 to 0.0-1.0)
        audio.volume = volume / 100;

        // Attempt to play the sound
        // Catch errors in case browser blocks autoplay
        audio.play().catch(e => console.error("SFX blocked:", e));

    }, [sfxEnabled, volume]);  // Re-create function only when settings change

    return playSound;
};
