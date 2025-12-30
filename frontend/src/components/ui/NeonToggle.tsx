interface NeonToggleProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export const NeonToggle = ({ label, checked, onChange }: NeonToggleProps) => {
    return (
        <div className="flex items-center justify-between w-full p-2">
            <span className="text-slate-300 font-bold tracking-wide uppercase text-sm">{label}</span>

            <button
                onClick={() => onChange(!checked)}
                className={`
                    relative w-14 h-7 rounded-full transition-all duration-300 shadow-inner
                    ${checked ? "bg-cyan-900/80 border-2 border-cyan-400" : "bg-slate-800 border-2 border-slate-600"}
                `}
            >
                <div
                    className={`
                        absolute top-1 left-1 w-4 h-4 rounded-full shadow-md transition-all duration-300
                        ${checked
                        ? "translate-x-7 bg-cyan-400 shadow-[0_0_10px_cyan]"
                        : "translate-x-0 bg-slate-400"}
                    `}
                />
            </button>
        </div>
    );
};