/**
 * useSoundEffect Hook
 *
 * Custom React hook for playing sound effects with user preferences.
 * Respects user settings for:
 * - SFX on/off toggle
 * - Volume level (0-100)
 *
 * Usage:
 * const playSound = useSoundEffect();
 * playSound(dropSfx);  // Plays the sound if SFX is enabled
 */

import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * Hook that returns a function to play sound effects
 * Automatically checks user settings before playing
 *
 * @returns playSound function that accepts an audio file path
 */
export const useSoundEffect = () => {
    // Get user settings from authentication context
    const { user } = useAuth();

    // Extract SFX settings with defaults if not set
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
