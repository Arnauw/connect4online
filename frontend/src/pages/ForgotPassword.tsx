        import { useState } from "react";
        import { useNavigate, Link } from "react-router-dom";
        import { api } from "../api/axios";
        import { NeonInput } from "../components/ui/NeonInput";
        import { MenuButton } from "../components/ui/MenuButton";

        export const ForgotPassword = () => {
            const navigate = useNavigate();
            const [email, setEmail] = useState<string>("");
            const [message, setMessage] = useState<string>("");
            const [error, setError] = useState<string>("");
            const [loading, setLoading] = useState<boolean>(false);

            const handleSubmit = async () => {
                setError("");
                setMessage("");
                setLoading(true);

                try {
                    await api.post(`${import.meta.env.VITE_API_URL}/api/reset-password/request`, { email });
                    setMessage("If an account matches that email, a recovery link has been sent.");
                } catch (err: any) {
                    console.error(err);
                    setError("Communication Error. Please try again later.");
                } finally {
                    setLoading(false);
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

                    <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-cyan-300 to-blue-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] text-center">
                        ACCOUNT RECOVERY
                    </h1>

                    <div className="flex flex-col gap-6 w-full max-w-md bg-slate-900/50 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-[0_0_30px_rgba(34,211,238,0.1)]">

                        <p className="text-slate-400 text-sm text-center">
                            Enter your email address. We will send you a secure link to reset your credentials.
                        </p>

                        {message && (
                            <div className="bg-green-900/30 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-center font-bold text-sm shadow-[0_0_15px_rgba(74,222,128,0.2)]">
                                ✅ {message}
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-900/30 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-center font-bold text-sm">
                                ⚠️ {error}
                            </div>
                        )}

                        {!message && (
                            <>
                                <NeonInput
                                    label="Email Address"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="pilot@connect4.online"
                                />

                                <div className="mt-4">
                                    <MenuButton onClick={handleSubmit}>
                                        {loading ? "SENDING..." : "SEND LINK"}
                                    </MenuButton>
                                </div>
                            </>
                        )}

                        <div className="text-center">
                            <Link to="/login" className="text-slate-500 hover:text-white text-sm underline transition-colors">
                                &larr; Back to Login
                            </Link>
                        </div>
                    </div>
                </div>
            );
        };