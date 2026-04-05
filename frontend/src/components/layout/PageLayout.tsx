import type {ReactNode} from "react";
import bgImg from "../../assets/imgs/background.png";
import { UserProfileBadge } from "../ui/UserProfileBadge";
import { useAuth } from "../../context/AuthContext";
import { AudioController } from "../audio/AudioController";

type PageLayoutProps = {
    children: ReactNode;
}

export const PageLayout = ({children}: PageLayoutProps) => {
    const { user, logout } = useAuth();

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
            <div className="absolute inset-0 bg-black/20 pointer-events-none" />
            <AudioController />
            <UserProfileBadge user={user} onLogout={logout} />

            {/* The rest of the page injects here */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};