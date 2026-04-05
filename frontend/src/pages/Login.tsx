import {useState, useEffect} from "react";
import {useNavigate, Link, useLocation, useSearchParams} from "react-router-dom";
import {api} from "../api/axios";
import {NeonInput} from "../components/ui/NeonInput";
import {MenuButton} from "../components/ui/MenuButton";
import {useAuth} from "../context/AuthContext";

export const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {login} = useAuth();
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<string>("");

    useEffect(() => {
        if (location.state && location.state.successMessage) {
            setSuccess(location.state.successMessage);
            // Clear the state so it doesn't persist on refresh
            window.history.replaceState({}, document.title);
        }
        const verified = searchParams.get("verified");
        const errorParam = searchParams.get("error");

        if (verified === "true") {
            setSuccess("ACCESS GRANTED: Neural Link Verified. You may now login.");
        }

        if (errorParam === "invalid_token") {
            setError("VERIFICATION FAILED: Link expired or invalid.");
        }

        if (errorParam === "session_expired") {
            setError("SESSION EXPIRED: Please re-authenticate.");
        }
    }, [location, searchParams]);

    const handleSubmit = async () => {
        setError("");
        setSuccess("");

        try {
            const response = await api.post(
                `${import.meta.env.VITE_API_URL}/api/login_check`,
                {
                    email,
                    password
                });

            localStorage.setItem("refresh_token", response.data.refresh_token);

            login(response.data.token);
            navigate("/");

        } catch (err: any) {
            console.error("Login Error:", err);

            if (err.response) {
                const serverMessage = err.response.data?.message;

                if (serverMessage) {
                    setError(`ACCESS DENIED: ${serverMessage}`);
                } else if (err.response.status === 401) {
                    setError("ACCESS DENIED: Invalid credentials.");
                } else {
                    setError(`System Error (${err.response.status}). Please retry.`);
                }
            } else if (err.request) {
                setError("CONNECTION FAILED: Server unreachable.");
            } else {
                setError("Unknown Error.");
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">

            <button
                onClick={() => navigate(-1)}
                className="absolute top-6 left-6 p-2 text-cyan-400 hover:text-cyan-100 transition-colors flex items-center gap-2 group z-50 animate-fade-in"
            >
                <div className="p-2 rounded-full border border-cyan-500/30 group-hover:border-cyan-400 group-hover:bg-cyan-950/50 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </div>
                <span className="font-bold tracking-widest hidden sm:block text-sm">BACK</span>
            </button>

            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-cyan-300 to-blue-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                SYSTEM LOGIN
            </h1>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                }}
                className="flex flex-col gap-6 w-full max-w-md bg-slate-900/50 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-[0_0_30px_rgba(34,211,238,0.1)]"
            >
                {success && (
                    <div
                        className="bg-green-900/30 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-center font-bold text-sm shadow-[0_0_15px_rgba(74,222,128,0.2)] animate-pulse">
                        ✅ {success}
                    </div>
                )}

                {error && (
                    <div
                        className="bg-red-900/30 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-center font-bold text-sm shadow-[0_0_15px_rgba(248,113,113,0.2)]">
                        ⚠️ {error}
                    </div>
                )}

                <NeonInput
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <NeonInput
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <div className="text-right">
                    <Link to="/forgot-password"
                          className="text-xs text-slate-400 hover:text-cyan-400 transition-colors">
                        Forgot Password?
                    </Link>
                </div>

                <div className="mt-4">
                    <MenuButton type="submit">
                        ACCESS GRID
                    </MenuButton>
                </div>

                <div className="text-center text-slate-400 text-sm">
                    New user? <Link to="/register"
                                    className="text-cyan-400 hover:text-cyan-200 font-bold underline transition-colors">Initialize
                    Sequence</Link>
                </div>
            </form>
        </div>
    );
};