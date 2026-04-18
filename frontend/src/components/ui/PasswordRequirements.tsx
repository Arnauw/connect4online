/**
 * PasswordRequirements Component
 *
 * Live checklist showing which password requirements have been met.
 * Each requirement turns green with a checkmark as the user types.
 * Returns null (renders nothing) until the user has typed something.
 *
 * Requirements checked:
 * - At least 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 *
 * The list is memoized so it only recomputes when the password changes.
 * Shows a "Strong password!" indicator when all requirements are met.
 *
 * Props:
 * - password: The current password string from the form
 */

import {useMemo} from "react";

interface PasswordRequirement {
    label: string;
    met: boolean;
}

interface PasswordRequirementsProps {
    password: string;
}

export const PasswordRequirements = ({password}: PasswordRequirementsProps) => {
    const requirements: PasswordRequirement[] = useMemo(() => [
        { label: "At least 8 characters",       met: password.length >= 8 },
        { label: "One uppercase letter (A-Z)",   met: /[A-Z]/.test(password) },
        { label: "One lowercase letter (a-z)",   met: /[a-z]/.test(password) },
        { label: "One number (0-9)",             met: /[0-9]/.test(password) }
    ], [password]);

    const allMet = requirements.every(r => r.met);

    // Don't render until user starts typing
    if (!password) return null;

    return (
        <div className="mt-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-400 mb-2 uppercase tracking-widest">Password Requirements:</p>
            <ul className="space-y-1">
                {requirements.map((req, index) => (
                    <li
                        key={index}
                        className={`text-sm flex items-center gap-2 transition-colors ${req.met ? 'text-green-400' : 'text-slate-500'}`}
                    >
                        <span className="text-lg">{req.met ? '✓' : '✗'}</span>
                        <span>{req.label}</span>
                    </li>
                ))}
            </ul>
            {allMet && (
                <p className="mt-2 text-xs text-green-400 font-bold">
                    ✓ Strong password!
                </p>
            )}
        </div>
    );
};
