import {useNavigate} from "react-router-dom";
import {MenuButton} from "../components/ui/MenuButton";
import logoFull from "../assets/imgs/full-logo-text.svg";
import {useAuth} from "../context/AuthContext";

export const Home = () => {
    const navigate = useNavigate();
    const {activeRoom} = useAuth();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8 relative">

            <div className="mb-4 animate-pulse-slow">
                <img
                    src={logoFull}
                    alt="Connect 4 Online"
                    className="w-64 md:w-80 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]"
                />
            </div>

            <div className="flex flex-col gap-4 w-full max-w-sm items-center z-20">

                {activeRoom && (
                    <div className="w-full mb-4 animate-pulse">
                        <MenuButton
                            onClick={() => navigate(`/online/${activeRoom}`)}
                            className="!border-red-500 !text-red-400 !shadow-[0_0_15px_red]"
                        >
                            REJOIN ACTIVE MATCH ({activeRoom})
                        </MenuButton>
                    </div>
                )}

                <MenuButton onClick={() => navigate('/local1p')}>
                    LOCAL 1-P VS BOT
                </MenuButton>

                <MenuButton onClick={() => navigate('/local2p')}>
                    LOCAL 2-P
                </MenuButton>

                <MenuButton onClick={() => navigate('/online')}>
                    PLAY ONLINE
                </MenuButton>

            </div>

            <div className="text-slate-600 text-xs tracking-widest mt-2">
                PLAY ANYWHERE, ANYTIME!
            </div>

        </div>
    );
};