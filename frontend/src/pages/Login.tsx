/**
 * Login Page
 *
 * Authenticates the user with email + password via POST /api/login_check.
 * On success, stores the JWT access token and refresh token in localStorage
 * and calls AuthContext.login() to update global state.
 *
 * Query param handling on mount:
 * - ?verified=true  → User just clicked the verification email link
 * - ?error=invalid_token → Email verification link was expired or tampered
 * - ?error=session_expired → JWT refresh failed, user was logged out
 *
 * Navigation state handling:
 * - state.successMessage → Success message passed from another page (e.g. after registration)
 */

import {useState, useEffect} from "react";
import {useNavigate, Link, useLocation, useSearchParams} from "react-router-dom";
import toast from "react-hot-toast";
import {api} from "../api/axios";
import {NeonInput} from "../components/ui/NeonInput";
import {MenuButton} from "../components/ui/MenuButton";
import {useAuth} from "../context/AuthContext";
import {TopNavButton} from "../components/ui/TopNavButton";
import {validateEmail} from "../utils/validation";

export const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {login} = useAuth();
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<string>("");

    // Handle feedback messages from query params or navigation state on mount
    useEffect(() => {
        // Message passed via navigate("/login", { state: { successMessage: "..." } })
        if (location.state && location.state.successMessage) {
            setSuccess(location.state.successMessage);
            toast.success(location.state.successMessage, { duration: 6000 });
            // Clear navigation state so it doesn't show again on refresh
            window.history.replaceState({}, document.title);
        }

        const verified = searchParams.get("verified");
        const errorParam = searchParams.get("error");

        // ?verified=true: user just clicked the email verification link
        if (verified === "true") {
            const msg = "ACCESS GRANTED: Neural Link Verified. You may now login.";
            setSuccess(msg);
            toast.success(msg);
        }

        // ?error=invalid_token: verification link expired or invalid
        if (errorParam === "invalid_token") {
            const msg = "VERIFICATION FAILED: Link expired or invalid.";
            setError(msg);
            toast.error(msg);
        }

        // ?error=session_expired: refresh token expired, axios interceptor forced logout
        if (errorParam === "session_expired") {
            const msg = "SESSION EXPIRED: Please re-authenticate.";
            setError(msg);
            toast.error(msg);
        }
    }, [location, searchParams]);

    const handleSubmit = async () => {
        setError("");
        setSuccess("");

        // Client-side validation before hitting the API
        if (!validateEmail(email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        if (!password) {
            toast.error('Password is required');
            return;
        }

        try {
            const response = await api.post(
                `${import.meta.env.VITE_API_URL}/api/login_check`,
                { email, password }
            );

            // Store refresh token separately (longer-lived, used to get new access tokens)
            localStorage.setItem("refresh_token", response.data.refresh_token);

            // Store access token via AuthContext (also saves to localStorage)
            login(response.data.token);
            toast.success('Welcome back!');
            navigate("/");

        } catch (err: any) {
            console.error("Login Error:", err);

            if (err.response) {
                const serverMessage = err.response.data?.message;

                if (serverMessage) {
                    // Backend returned a specific message (e.g., "Account not activated")
                    const msg = `ACCESS DENIED: ${serverMessage}`;
                    setError(msg);
                    toast.error(msg);
                } else if (err.response.status === 401) {
                    const msg = "ACCESS DENIED: Invalid credentials.";
                    setError(msg);
                    toast.error(msg);
                } else {
                    const msg = `System Error (${err.response.status}). Please retry.`;
                    setError(msg);
                    toast.error(msg);
                }
            } else if (err.request) {
                const msg = "CONNECTION FAILED: Server unreachable.";
                setError(msg);
                toast.error(msg);
            } else {
                const msg = "Unknown Error.";
                setError(msg);
                toast.error(msg);
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">

            <TopNavButton label="BACK" onClick={() => navigate(-1)} />

            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-cyan-300 to-blue-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                SYSTEM LOGIN
            </h1>

            <form
                onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
                className="flex flex-col gap-6 w-full max-w-md bg-slate-900/50 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-[0_0_30px_rgba(34,211,238,0.1)]"
            >
                {success && (
                    <div className="bg-green-900/30 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-center font-bold text-sm shadow-[0_0_15px_rgba(74,222,128,0.2)] animate-pulse">
                        ✅ {success}
                    </div>
                )}

                {error && (
                    <div className="bg-red-900/30 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-center font-bold text-sm shadow-[0_0_15px_rgba(248,113,113,0.2)]">
                        ⚠️ {error}
                    </div>
                )}

                <NeonInput
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                />
                <NeonInput
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <div className="text-right">
                    <Link to="/forgot-password" className="text-xs text-slate-400 hover:text-cyan-400 transition-colors">
                        Forgot Password?
                    </Link>
                </div>

                <div className="mt-4">
                    <MenuButton type="submit">
                        ACCESS GRID
                    </MenuButton>
                </div>

                <div className="text-center text-slate-400 text-sm">
                    New user? <Link to="/register" className="text-cyan-400 hover:text-cyan-200 font-bold underline transition-colors">Initialize Sequence</Link>
                </div>
            </form>
        </div>
    );
};
