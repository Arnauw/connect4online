import type {ReactNode} from "react";

interface MenuButtonProps {
    children: ReactNode;
    onClick?: () => void;
    secondary?: boolean;
}

export const MenuButton = (
    {children, onClick, secondary = false}: MenuButtonProps
) => {

    return (
        <button
            onClick={onClick}
            className={`
                w-full max-w-md py-3 rounded-full 
                font-bold text-lg tracking-wider transition-all duration-300
                border-2 backdrop-blur-sm
                active:scale-95
                ${secondary
                ? "border-slate-500 text-slate-300 hover:bg-slate-800/50"
                : "border-cyan-400 text-white shadow-[0_0_10px_rgba(34,211,238,0.5)] " 
                + "hover:bg-cyan-950/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.7)]"
            }
            `}
        >
            {children}
        </button>
    );
};