/**
 * TopNavButton Component
 *
 * Fixed top-left navigation button used to go back or navigate to the menu.
 * Plays a click sound on press.
 *
 * Displays:
 * - A circular back-arrow icon (or custom icon if provided)
 * - An optional label next to it (hidden on small screens, visible on sm+)
 *
 * Props:
 * - label:   Text label (default "BACK")
 * - onClick: Navigation handler called after the click sound plays
 * - icon:    Optional custom SVG/JSX icon to replace the default arrow
 */

import React from "react";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import clickSfx from "../../assets/sounds/sfx/click.ogg";

type TopNavButtonProps = {
    label?: string;
    onClick: () => void;
    icon?: React.ReactNode;
};

export const TopNavButton = ({ label = "BACK", onClick, icon }: TopNavButtonProps) => {
    const playSound = useSoundEffect();

    const handleClick = () => {
        playSound(clickSfx);
        onClick();
    };

    return (
        <button
            onClick={handleClick}
            className="absolute top-6 left-6 p-2 text-cyan-400 hover:text-cyan-100 transition-colors flex items-center gap-2 group z-50 animate-fade-in"
        >
            <div className="p-2 rounded-full border border-cyan-500/30 group-hover:border-cyan-400 group-hover:bg-cyan-950/50 transition-all">
                {icon || (
                    // Default: left-pointing arrow
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                )}
            </div>
            <span className="font-bold tracking-widest hidden sm:block text-sm uppercase">{label}</span>
        </button>
    );
};
