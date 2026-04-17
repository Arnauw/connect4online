import type {ReactNode} from "react";
import { Link, useLocation } from "react-router-dom";
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
    
    const isPrivacyPage = location.pathname === '/privacy';

    return (
        <div
            className="min-h-screen w-full bg-slate-900 text-white overflow-x-hidden relative flex flex-col"
            style={{
                backgroundImage: `url(${bgImg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center bottom',
                backgroundAttachment: 'fixed'
            }}
        >
            <div className="absolute inset-0 bg-black/20 pointer-events-none" />
            <AudioController />
            <UserProfileBadge user={user} onLogout={logout} />

            {/* The rest of the page injects here */}
            <div className="relative z-10 w-full">
                {children}
            </div>

            {!isPrivacyPage && (
                <footer className="fixed bottom-4 left-4 z-50 text-slate-500 text-xs">
                    <Link to="/privacy" className="hover:text-cyan-400 transition-colors drop-shadow-md">
                        Privacy Policy (GDPR)
                    </Link>
                </footer>
            )}
        </div>
    );
};