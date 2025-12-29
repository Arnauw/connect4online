import type {InputHTMLAttributes} from "react";

interface NeonInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

export const NeonInput = ({ label, className = "", ...props }: NeonInputProps) => {
    return (
        <div className="flex flex-col gap-2 w-full max-w-md">
            <label className="text-cyan-400 font-bold text-sm tracking-widest uppercase ml-2">
                {label}
            </label>
            <input
                className={`
                    w-full px-6 py-3 rounded-full
                    bg-slate-900/80 text-white border-2 border-slate-600
                    focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.4)]
                    outline-none transition-all duration-300
                    placeholder:text-slate-600
                    ${className}
                `}
                {...props}
            />
        </div>
    );
};