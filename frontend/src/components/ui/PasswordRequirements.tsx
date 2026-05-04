interface PasswordRequirementsProps {
    password: string;
}

export const PasswordRequirements = ({password}: PasswordRequirementsProps) => {
    const requirements = [
        { label: "At least 8 characters",       met: password.length >= 8 },
        { label: "One uppercase letter (A-Z)",   met: /[A-Z]/.test(password) },
        { label: "One lowercase letter (a-z)",   met: /[a-z]/.test(password) },
        { label: "One number (0-9)",             met: /[0-9]/.test(password) }
    ];

    const allMet = requirements.every(requirement => requirement.met);

    if (!password) return null;

    return (
        <div className="mt-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-400 mb-2 uppercase tracking-widest">Password Requirements:</p>
            <ul className="space-y-1">
                {requirements.map((requirement, index) => (
                    <li
                        key={index}
                        className={`text-sm flex items-center gap-2 transition-colors ${requirement.met ? 'text-green-400' : 'text-slate-500'}`}
                    >
                        <span className="text-lg">{requirement.met ? '✓' : '✗'}</span>
                        <span>{requirement.label}</span>
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
