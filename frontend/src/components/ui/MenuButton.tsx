/**
 * MenuButton Component
 *
 * The primary button used throughout the app for navigation and actions.
 * Plays a click sound effect on every click via useSoundEffect.
 *
 * Variants:
 * - Default (secondary=false): Cyan glowing neon border with hover glow effect
 * - Secondary (secondary=true): Subtle slate border for less prominent actions
 *
 * Props:
 * - children:   Button label content
 * - onClick:    Click handler (undefined disables the click action without disabling visually)
 * - secondary:  Use the subdued secondary style
 * - type:       HTML button type (default "button" to avoid accidental form submissions)
 * - className:  Additional Tailwind classes to override or extend styles
 * - disabled:   Grays out the button and prevents interaction
 */

import type {ReactNode} from "react";
import {useSoundEffect} from "../../hooks/useSoundEffect";
import clickSfx from "../../assets/sounds/sfx/click.ogg";

interface MenuButtonProps {
    children: ReactNode;
    onClick?: (e: any) => void;
    secondary?: boolean;
    type?: "button" | "submit" | "reset";
    className?: string;
    disabled?: boolean;
}

export const MenuButton = ({
    children,
    onClick,
    secondary = false,
    type = "button",
    className = "",
    disabled = false
}: MenuButtonProps) => {
    const playSound = useSoundEffect();

    const handleClick = (e: any) => {
        playSound(clickSfx);
        if (onClick) onClick(e);
    };

    return (
        <button
            type={type}
            onClick={handleClick}
            disabled={disabled}
            className={`
                w-full max-w-md py-3 rounded-full
                font-bold text-lg tracking-wider transition-all duration-300
                border-2 backdrop-blur-sm active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed
                ${secondary
                ? "border-slate-500 text-slate-300 hover:bg-slate-800/50"
                : "border-cyan-400 text-white shadow-[0_0_10px_rgba(34,211,238,0.5)] "
                + "hover:bg-cyan-950/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.7)]"
            }
            ${className}
            `}
        >
            {children}
        </button>
    );
};
