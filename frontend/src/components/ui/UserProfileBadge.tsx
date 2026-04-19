/**
 * UserProfileBadge Component
 *
 * The top-right navigation badge rendered globally in PageLayout.
 * Shows different UI depending on whether the user is logged in.
 *
 * Logged-out view:
 * - Settings gear icon
 * - "LOG IN" and "SIGN UP" buttons
 *
 * Logged-in view:
 * - Username + ELO display
 * - Logout icon (shows confirmation modal on click)
 * - Clickable avatar circle → navigates to /profile
 * - Settings button below the badge
 *
 * Logout flow:
 * - Clicking logout opens a confirmation modal (not immediate)
 * - confirmLogout calls onLogout prop (which calls AuthContext.logout())
 * - Then navigates to home
 *
 * Props:
 * - user:     Current user object or null (null = guest/logged out)
 * - onLogout: Logout handler from AuthContext
 */

import {useState} from "react";
import {useNavigate} from "react-router-dom";
import { Avatar } from "./Avatar";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import clickSfx from "../../assets/sounds/sfx/click.ogg";

interface UserProfile {
    username: string;
    elo: number;
    avatar?: string;
}

interface UserProfileBadgeProps {
    user: UserProfile | null;
    onLogout: () => void;
}

export const UserProfileBadge = ({user, onLogout}: UserProfileBadgeProps) => {
    const navigate = useNavigate();
    const playSound = useSoundEffect();
    const [showModal, setShowModal] = useState(false);

    const handleLogoutClick = () => { playSound(clickSfx); setShowModal(true); };
    const confirmLogout = () => { playSound(clickSfx); setShowModal(false); onLogout(); navigate('/'); };
    const handleSettingsClick = () => { playSound(clickSfx); navigate('/settings'); };
    const handleProfileClick = () => { playSound(clickSfx); navigate('/profile'); };
    const handleLoginClick = () => { playSound(clickSfx); navigate('/login'); };
    const handleSignUpClick = () => { playSound(clickSfx); navigate('/register'); };

    // Guest / logged-out view
    if (!user) {
        return (
            <div className="absolute top-6 right-6 z-50 animate-fade-in flex items-center gap-3">

                <button
                    onClick={handleSettingsClick}
                    title="Settings"
                    className="p-2 rounded-full border border-slate-600 text-slate-400 hover:text-cyan-400 hover:border-cyan-400 transition-all bg-slate-900/50 backdrop-blur-md"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                </button>

                <button
                    onClick={handleLoginClick}
                    className="px-5 py-2 rounded-full border border-cyan-400 text-cyan-400 font-bold text-sm hover:bg-cyan-400/10 hover:shadow-[0_0_10px_rgba(34,211,238,0.4)] transition-all backdrop-blur-md"
                >
                    LOG IN
                </button>
                <button
                    onClick={handleSignUpClick}
                    className="px-5 py-2 rounded-full bg-cyan-600 text-white font-bold text-sm shadow-[0_0_15px_rgba(8,145,178,0.5)] hover:bg-cyan-500 hover:scale-105 transition-all"
                >
                    SIGN UP
                </button>
            </div>
        );
    }

    // Logged-in view
    return (
        <>
            <div className="absolute top-6 right-6 flex flex-col items-end gap-3 z-50 animate-fade-in">

                {/* Main pill: logout icon + username/ELO + avatar */}
                <div className="flex items-center gap-4 bg-slate-900/80 p-2 pr-4 pl-6 rounded-full border border-slate-700 shadow-lg backdrop-blur-md">

                    {/* Logout icon — opens confirmation modal */}
                    <button
                        onClick={handleLogoutClick}
                        title="Logout"
                        className="text-slate-400 hover:text-red-400 transition-colors p-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/>
                        </svg>
                    </button>

                    {/* Username + ELO */}
                    <div className="flex flex-col items-end leading-tight">
                        <span className="text-white font-bold tracking-wide text-sm">{user.username}</span>
                        <span className="text-xs text-cyan-400 font-mono">ELO: {user.elo}</span>
                    </div>

                    {/* Avatar — click to go to Profile page */}
                    <div onClick={handleProfileClick} className="cursor-pointer hover:scale-105 transition-transform">
                        <Avatar
                            avatarStr={user.avatar}
                            className="w-10 h-10 rounded-full border-2 border-cyan-400 shadow-[0_0_10px_cyan]"
                        />
                    </div>
                </div>

                {/* Settings button below the pill */}
                <button
                    onClick={handleSettingsClick}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-600 bg-slate-900/60 text-xs text-slate-300 hover:border-cyan-400 hover:text-cyan-400 transition-all hover:shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    Settings
                </button>
            </div>

            {/* Logout confirmation modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-[0_0_40px_rgba(248,113,113,0.3)] text-center animate-bounce-in">
                        <h3 className="text-xl font-bold text-white mb-2">DISCONNECT?</h3>
                        <p className="text-slate-400 mb-6 text-sm">
                            You are about to terminate your session.
                        </p>

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-6 py-2 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors font-bold text-sm"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="px-6 py-2 rounded-full bg-red-600 text-white hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all font-bold text-sm"
                            >
                                LOGOUT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
