import type {ReactNode} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import bgImg from "../../assets/imgs/background.png";
import { UserProfileBadge } from "../ui/UserProfileBadge";
import { useAuth } from "../../context/AuthContext";
import { AudioController } from "../audio/AudioController";

type PageLayoutProps = {
    children: ReactNode;
}

export const PageLayout = ({children}: PageLayoutProps) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const isHomePage = location.pathname === "/";

    return (
        <div
            className="min-h-screen w-full bg-slate-900 text-white overflow-hidden relative"
            style={{
                backgroundImage: `url(${bgImg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center bottom',
                backgroundAttachment: 'fixed'
            }}
        >
            {/* Dark overlay  because it looks better */}
            <div className="absolute inset-0 bg-black/20 pointer-events-none" />

            <AudioController />
            <UserProfileBadge user={user} onLogout={logout} />
            
            {!isHomePage && (
                <button
                    onClick={() => navigate('/')}
                    className="absolute top-6 left-6 p-2 text-cyan-400 hover:text-cyan-100 transition-colors flex items-center gap-2 group z-50 animate-fade-in"
                >
                    <div className="p-2 rounded-full border border-cyan-500/30 group-hover:border-cyan-400 group-hover:bg-cyan-950/50 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </div>
                    <span className="font-bold tracking-widest hidden sm:block text-sm">MENU</span>
                </button>
            )}

            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};