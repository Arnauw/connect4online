import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MenuButton } from "../components/ui/MenuButton";

export const Profile = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const getAvatarUrl = () => {
        const avatar = user?.avatar;
        if (!avatar || avatar === 'default-avatar.jpg') return null;
        
        if (avatar.startsWith('http')) return avatar;
        
        if (avatar.startsWith('/')) {
            return `${import.meta.env.VITE_API_URL}${avatar}`;
        }
        
        return `${import.meta.env.VITE_API_URL}/uploads/avatars/${avatar}`;
    };

    const avatarUrl = getAvatarUrl();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    if (!user) return <div className="text-center text-white mt-20">Access Denied.</div>;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">
            <h1 className="text-4xl font-extrabold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                USER PROFILE
            </h1>

            <div className="bg-slate-900/80 p-8 rounded-2xl border-2 border-cyan-500/30 w-full max-w-md shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                <div className="flex flex-col gap-4 text-center">
                    
                    <div className="w-24 h-24 bg-slate-700 rounded-full mx-auto mb-4 border-2 border-cyan-400 shadow-[0_0_15px_cyan] flex items-center justify-center overflow-hidden">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-cyan-200/70">
                                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                            </svg>
                        )}
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

            <button onClick={() => navigate("/")} className="text-slate-500 hover:text-white underline">
                &larr; Back to Main Menu
            </button>
        </div>
    );
};