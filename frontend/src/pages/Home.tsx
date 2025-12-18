import { useNavigate } from "react-router-dom";
import { MenuButton } from "../components/ui/MenuButton";
import logoFull from "../assets/imgs/full-logo-text.svg"; // Adjust path if needed

export const Home = () => {
    const navigate = useNavigate();

    return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">
                
                <div className="mb-4 animate-pulse-slow">
                    <img
                        src={logoFull}
                        alt="Connect 4 Online"
                        className="w-64 md:w-80 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]"
                    />
                </div>
                
                <div className="flex flex-col gap-4 w-full max-w-sm items-center z-20">

                    <MenuButton onClick={() => navigate('/local1p')}>
                        Local 1-P vs BOT
                    </MenuButton>

                    <MenuButton onClick={() => navigate('/local2p')}>
                        Local 2-P
                    </MenuButton>

                    <MenuButton onClick={() => navigate('/online')}>
                        Create an Online Room
                    </MenuButton>

                    <MenuButton onClick={() => navigate('/online')}>
                        Join an Online Match
                    </MenuButton>

                    <MenuButton onClick={() => navigate('/online')}>
                        Quick Online Match
                    </MenuButton>

                    {/* Spacer */}
                    <div className="h-4" />

                    <MenuButton secondary onClick={() => console.log("Login clicked")}>
                        Log in / Sign in
                    </MenuButton>

                </div>

                <div className="text-slate-400 text-sm tracking-widest mt-2">
                    PLAY ANYWHERE, ANYTIME!
                </div>
            </div>
    );
};