import {type ReactNode, useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import bgImg from "../../assets/imgs/background.png";
import {UserProfileBadge} from "../ui/UserProfileBadge";
import {useAuth} from "../../context/AuthContext";
import {AudioController} from "../audio/AudioController";
import {api} from "../../api/axios";

type PageLayoutProps = {
    children: ReactNode;
}

export const PageLayout = ({children}: PageLayoutProps) => {
    const {user, logout, activeRoom, setActiveRoom} = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const isHomePage = location.pathname === "/";
    const isOnGameBoard = location.pathname.startsWith('/online/') && location.pathname.length > 8;
    const [showWarning, setShowWarning] = useState<boolean>(false);

    const handleMenuClick = () => {
        if (isOnGameBoard && activeRoom) {
            setShowWarning(true);
        } else {
            navigate('/');
        }
    };

    const confirmAbandon = async () => {
        try {
            // Tell the server we ragequit (this fires the OPPONENT_LEFT mercure event)
            await api.post(`/api/game/${activeRoom}/leave`);
        } catch (e) {
            console.error("Failed to notify server of forfeit", e);
        }

        setActiveRoom(null);
        setShowWarning(false);
        navigate('/');
    };

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
            <div className="absolute inset-0 bg-black/20 pointer-events-none"/>

            <AudioController/>
            <UserProfileBadge user={user} onLogout={logout}/>

            {!isHomePage && (
                <button
                    onClick={handleMenuClick}
                    className="absolute top-6 left-6 p-2 text-cyan-400 hover:text-cyan-100 transition-colors flex items-center gap-2 group z-50 animate-fade-in"
                >
                    <div
                        className="p-2 rounded-full border border-cyan-500/30 group-hover:border-cyan-400 group-hover:bg-cyan-950/50 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5}
                             stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
                        </svg>
                    </div>
                    <span className="font-bold tracking-widest hidden sm:block text-sm">MENU</span>
                </button>
            )}

            <div className="relative z-10 w-full h-full">
                {children}
            </div>

            {/* --- RAGEQUIT WARNING MODAL --- */}
            {showWarning && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border-2 border-red-500 rounded-2xl p-6 w-full max-w-sm shadow-[0_0_40px_rgba(220,38,38,0.4)] text-center animate-bounce-in">
                        <h3 className="text-xl font-bold text-red-500 mb-2">ABANDON MATCH?</h3>
                        <p className="text-slate-300 mb-6 text-sm">
                            Leaving the grid now will count as a forfeit. Are you sure you want to disconnect?
                        </p>

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => setShowWarning(false)}
                                className="px-6 py-2 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors font-bold text-sm"
                            >
                                STAY
                            </button>
                            <button
                                onClick={confirmAbandon}
                                className="px-6 py-2 rounded-full bg-red-600 text-white hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all font-bold text-sm"
                            >
                                FORFEIT
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};