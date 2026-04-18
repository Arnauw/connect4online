/**
 * NeonSlider Component
 *
 * A styled range slider with a cyan accent and live value display.
 * Used in Settings for the Master Volume control.
 *
 * Props:
 * - label:    Text label above the slider
 * - value:    Current numeric value (shown as percentage next to label)
 * - min:      Minimum value (default 0)
 * - max:      Maximum value (default 100)
 * - onChange: Called with the new number value when slider moves
 */

interface NeonSliderProps {
    label: string;
    value: number;
    min?: number;
    max?: number;
    onChange: (val: number) => void;
}

export const NeonSlider = ({ label, value, min = 0, max = 100, onChange }: NeonSliderProps) => {
    return (
        <div className="flex flex-col gap-2 w-full p-2">
            <div className="flex justify-between">
                <span className="text-slate-300 font-bold tracking-wide uppercase text-sm">{label}</span>
                <span className="text-cyan-400 font-mono text-xs">{value}%</span>
            </div>

            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
            />
        </div>
    );
};
