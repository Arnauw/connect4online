import { type ChangeEvent, type FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { NeonInput } from "../components/ui/NeonInput";
import { MenuButton } from "../components/ui/MenuButton";

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

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e?: FormEvent) => {
        if (e) e.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/register`, formData);
            console.log("Registration Success:", response.data);
            navigate("/login", {
                state: {successMessage: "Identity initialized. ACCESS LOCKED. Check your email inbox to activate neural link."}
            });

        } catch (err: any) {
            console.error("Full Error Object:", err);

            if (err.response) {
                console.error("Server Data:", err.response.data);
                console.error("Server Status:", err.response.status);

                if (err.response.data && err.response.data.error) {
                    setError(err.response.data.error);
                } else {
                    setError(`Server Error (${err.response.status}). Check console for details.`);
                }
            } else if (err.request) {
                setError("No response from server. Is the backend running?");
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-600 drop-shadow-[0_0_10px_rgba(232,121,249,0.5)]">
                NEW PLAYER
            </h1>

            <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-6 w-full max-w-md bg-slate-900/50 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-[0_0_30px_rgba(168,85,247,0.15)]"
            >
                <NeonInput
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                />
                <NeonInput
                    label="Username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                />
                <NeonInput
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                />

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