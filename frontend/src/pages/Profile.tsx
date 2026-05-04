import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MenuButton } from "../components/ui/MenuButton";
import { Avatar } from "../components/ui/Avatar";
import { TopNavButton } from "../components/ui/TopNavButton";

export const Profile = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    if (!user) return <div className="text-center text-white mt-20">Access Denied.</div>;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">

            <TopNavButton label="BACK" onClick={() => navigate(-1)} />

            <h1 className="text-4xl font-extrabold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                USER PROFILE
            </h1>

            <div className="bg-slate-900/80 p-8 rounded-2xl border-2 border-cyan-500/30 w-full max-w-md shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                <div className="flex flex-col gap-4 text-center">

                    <div className="mx-auto mb-4">
                        <Avatar
                            avatarStr={user.avatar}
                            className="w-24 h-24 rounded-full border-2 border-cyan-400 shadow-[0_0_15px_cyan]"
                            fallbackSize="w-12 h-12"
                        />
                    </div>

                    <h2 className="text-3xl font-bold text-cyan-400">{user.username}</h2>
                    <div className="text-slate-400">{user.email}</div>

                    <div className="flex justify-between items-center bg-slate-800 p-4 rounded-lg mt-4 border border-slate-600">
                        <span className="text-slate-300 font-bold uppercase tracking-widest">Rank (ELO)</span>
                        <span className="text-2xl font-black text-yellow-400 drop-shadow-[0_0_5px_yellow]">{user.elo}</span>
                    </div>
                </div>

                <div className="mt-8 flex flex-col gap-4">
                    <MenuButton secondary onClick={() => navigate('/settings')}>
                        Settings
                    </MenuButton>
                    <MenuButton onClick={handleLogout}>
                        LOGOUT
                    </MenuButton>
                </div>
            </div>
        </div>
    );
};
