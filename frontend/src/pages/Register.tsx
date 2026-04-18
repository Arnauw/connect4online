/**
 * Register Page
 *
 * Registration form — collects email, username, and password.
 * Validates client-side before submitting to POST /api/register.
 *
 * On success, redirects to /login with a "check your email" success message.
 * The user must click the verification link before they can log in.
 *
 * Inline validation feedback:
 * - Email: shown after blur if invalid
 * - Username: shown after blur if invalid (3-20 chars, letters/numbers/hyphens/underscores)
 * - Password: live requirements checklist via PasswordRequirements component
 */

import { type ChangeEvent, type FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../api/axios";
import { NeonInput } from "../components/ui/NeonInput";
import { MenuButton } from "../components/ui/MenuButton";
import { TopNavButton } from "../components/ui/TopNavButton";
import { PasswordRequirements } from "../components/ui/PasswordRequirements";
import { validateEmail, validateUsername, validatePassword } from "../utils/validation";

interface RegisterFormData {
    email: string;
    username: string;
    password: string;
}

export const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<RegisterFormData>({ email: "", username: "", password: "" });
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    // Track whether each field has been touched so we only show errors after blur
    const [emailTouched, setEmailTouched] = useState(false);
    const [usernameTouched, setUsernameTouched] = useState(false);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(""); // Clear server-side error when user edits
    };

    const handleSubmit = async (e?: FormEvent) => {
        if (e) e.preventDefault();

        // Run all validations before hitting the API
        if (!validateEmail(formData.email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        const usernameValidation = validateUsername(formData.username);
        if (!usernameValidation.valid) {
            toast.error(usernameValidation.error || 'Invalid username');
            return;
        }

        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.valid) {
            toast.error(passwordValidation.errors[0] || 'Invalid password');
            return;
        }

        setError("");
        setLoading(true);

        try {
            const response = await api.post(`${import.meta.env.VITE_API_URL}/api/register`, formData);
            console.log("Registration Success:", response.data);

            toast.success('Registration successful! Check your email to verify your account.');

            // Pass success message via navigation state so Login page can display it
            navigate("/login", {
                state: {
                    successMessage:
                        "Identity initialized. ACCESS LOCKED. Check your email inbox (and spam folder) to activate your neural link. Transmission may take 2-3 minutes."
                }
            });

        } catch (err: any) {
            console.error("Full Error Object:", err);

            if (err.response) {
                if (err.response.data && err.response.data.error) {
                    setError(err.response.data.error);
                    toast.error(err.response.data.error);
                } else {
                    const errorMsg = `Server Error (${err.response.status}). Please try again.`;
                    setError(errorMsg);
                    toast.error(errorMsg);
                }
            } else if (err.request) {
                const errorMsg = "No response from server. Check your connection.";
                setError(errorMsg);
                toast.error(errorMsg);
            } else {
                setError(err.message);
                toast.error(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">

            <TopNavButton label="BACK" onClick={() => navigate(-1)} />

            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-fuchsia-400 to-purple-600 drop-shadow-[0_0_10px_rgba(232,121,249,0.5)]">
                NEW PLAYER
            </h1>

            <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-6 w-full max-w-md bg-slate-900/50 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-[0_0_30px_rgba(168,85,247,0.15)]"
            >
                {/* Email with inline validation after blur */}
                <div>
                    <NeonInput
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={() => setEmailTouched(true)}
                        autoFocus
                    />
                    {emailTouched && formData.email && !validateEmail(formData.email) && (
                        <p className="mt-1 text-xs text-red-400">Please enter a valid email address</p>
                    )}
                </div>

                {/* Username with inline validation after blur */}
                <div>
                    <NeonInput
                        label="Username"
                        name="username"
                        type="text"
                        value={formData.username}
                        onChange={handleChange}
                        onBlur={() => setUsernameTouched(true)}
                    />
                    {usernameTouched && formData.username && !validateUsername(formData.username).valid && (
                        <p className="mt-1 text-xs text-red-400">{validateUsername(formData.username).error}</p>
                    )}
                    {!usernameTouched && !formData.username && (
                        <p className="mt-1 text-xs text-slate-400">3-20 characters, letters, numbers, hyphens, underscores only</p>
                    )}
                </div>

                {/* Password with live requirements checklist */}
                <div>
                    <NeonInput
                        label="Password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                    />
                    <PasswordRequirements password={formData.password} />
                </div>

                {/* Server-side error (e.g. email already in use) */}
                {error && (
                    <div className="text-red-500 font-bold text-center animate-pulse bg-red-950/30 p-2 rounded border border-red-500/50">
                        {error}
                    </div>
                )}

                <div className="mt-4">
                    <MenuButton type="submit">
                        {loading ? "PROCESSING..." : "REGISTER"}
                    </MenuButton>
                </div>

                <div className="text-center text-slate-400 text-sm">
                    Already registered? <Link to="/login" className="text-cyan-400 hover:text-cyan-200 font-bold underline transition-colors">Login</Link>
                </div>
            </form>
        </div>
    );
};
