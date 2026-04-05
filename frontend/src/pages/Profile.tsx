import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MenuButton } from "../components/ui/MenuButton";
import { Avatar } from "../components/ui/Avatar";

export const Profile = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // const getAvatarUrl = () => {
    //     const avatar = user?.avatar;
    //     if (!avatar || avatar === 'default-avatar.jpg') return null;
    //
    //     if (avatar.startsWith('http')) return avatar;
    //
    //     if (avatar.startsWith('/')) {
    //         return `${import.meta.env.VITE_API_URL}${avatar}`;
    //     }
    //
    //     return `${import.meta.env.VITE_API_URL}/uploads/avatars/${avatar}`;
    // };
    //
    // const avatarUrl = getAvatarUrl();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    if (!user) return <div className="text-center text-white mt-20">Access Denied.</div>;

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