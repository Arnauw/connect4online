/**
 * ResetPassword Page
 *
 * Handles the password reset form after the user clicked the email link.
 * The reset token is parsed from the URL query string: ?token=xxx
 *
 * Flow:
 * 1. User clicks link in email → lands here with ?token=...
 * 2. User enters new password + confirmation
 * 3. POST /api/reset-password/reset with token + password
 * 4. On success, redirects to /login with a success message
 *
 * Safety:
 * - If no token in URL, immediately redirects to /login
 * - Returns null during render if token is missing (avoids flash of form)
 * - Validates password strength client-side (matches registration requirements)
 * - Backend also validates strength server-side in ResetPasswordController
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/axios";
import { NeonInput } from "../components/ui/NeonInput";
import { MenuButton } from "../components/ui/MenuButton";
import { TopNavButton } from "../components/ui/TopNavButton";
import { validatePassword } from "../utils/validation";

export const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");  // Token from the email link
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    // Guard: redirect immediately if page was loaded without a valid token
    useEffect(() => {
        if (!token) {
            navigate("/login", { state: { error: "Missing Reset Token." } });
        }
    }, [token, navigate]);

    const handleSubmit = async () => {
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        // Enforce same strength rules as registration
        const validation = validatePassword(password);
        if (!validation.valid) {
            setError(validation.errors[0] || 'Invalid password');
            return;
        }

        setLoading(true);

        try {
            await api.post(`${import.meta.env.VITE_API_URL}/api/reset-password/reset`, {
                token: token,
                password: password
            });

            // Pass success message to login page via navigation state
            navigate("/login", {
                state: { successMessage: "Credentials updated successfully. Please authenticate." }
            });

        } catch (err: any) {
            console.error(err);
            if (err.response && err.response.data && err.response.data.error) {
                setError(err.response.data.error);
            } else {
                setError("Failed to reset password. The link may have expired.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Don't render the form if there's no token — effect above will redirect
    if (!token) return null;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">

            <TopNavButton label="BACK" onClick={() => navigate(-1)} />

            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-fuchsia-400 to-purple-600 drop-shadow-[0_0_10px_rgba(232,121,249,0.5)]">
                NEW CREDENTIALS
            </h1>

            <div className="flex flex-col gap-6 w-full max-w-md bg-slate-900/50 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-[0_0_30px_rgba(168,85,247,0.15)]">

                {error && (
                    <div className="bg-red-900/30 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-center font-bold text-sm animate-pulse">
                        ⚠️ {error}
                    </div>
                )}

                <NeonInput
                    label="New Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <NeonInput
                    label="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />

                <div className="mt-4">
                    <MenuButton onClick={handleSubmit}>
                        {loading ? "UPDATING..." : "RESET PASSWORD"}
                    </MenuButton>
                </div>
            </div>
        </div>
    );
};
