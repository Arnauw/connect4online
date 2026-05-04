import { useSoundEffect } from "../../hooks/useSoundEffect";
import clickSfx from "../../assets/sounds/sfx/click.ogg";

type TopNavButtonProps = {
    label?: string;
    onClick: () => void;
};

export const TopNavButton = ({ label = "BACK", onClick }: TopNavButtonProps) => {
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
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
            </div>
            <span className="font-bold tracking-widest hidden sm:block text-sm uppercase">{label}</span>
        </button>
    );
};
