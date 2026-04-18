/**
 * PageLayout Component
 *
 * The global shell that wraps every page in the app.
 * Rendered once via LayoutWrapper in App.tsx, persists across route changes.
 *
 * Provides:
 * - Full-screen background image (fixed, covers viewport)
 * - Semi-transparent dark overlay for readability
 * - AudioController (background music — persists across navigation)
 * - UserProfileBadge (top-right nav: login/logout/profile/settings)
 * - Privacy Policy footer link (hidden on the /privacy page itself to avoid redundancy)
 *
 * The children are rendered inside a relative z-10 div so they appear above the background.
 *
 * Props:
 * - children: The current page content (injected by React Router's <Outlet/>)
 */

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

    // Don't show the "Privacy Policy" footer link on the privacy page itself
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
            {/* Subtle dark overlay for contrast against the background image */}
            <div className="absolute inset-0 bg-black/20 pointer-events-none" />

            {/* Global audio controller — persists across page navigation */}
            <AudioController />

            {/* Top-right user badge — shows login/signup for guests, profile/logout for users */}
            <UserProfileBadge user={user} onLogout={logout} />

            {/* Page content — above background overlay */}
            <div className="relative z-10 w-full">
                {children}
            </div>

            {/* Privacy Policy link — fixed bottom-left, hidden on the privacy page itself */}
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
