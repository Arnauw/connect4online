import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import { api } from "../api/axios";

export interface UserSettings {
    theme?: string;
    music?: boolean;
    sfx?: boolean;
    volume?: number;
}

interface JwtPayload {
    id: number;
    username: string;
    email: string;
    elo: number;
    avatar?: string;
    settings?: UserSettings;
    exp: number;
}

interface AuthContextType {
    user: JwtPayload | null;
    token: string | null;
    settings: UserSettings;
    activeRoom: string | null;
    setActiveRoom: (code: string | null) => void;
    login: (token: string) => void;
    logout: () => void;
    updateUser: (newData: Partial<JwtPayload>) => void;
    updateGuestSettings: (newSettings: UserSettings) => void;
    activeGameStatus: string | null;
    setActiveGameStatus: (status: string | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const defaultSettings: UserSettings = {theme: 'dark-neon', music: false, sfx: true, volume: 50};

export const AuthProvider = ({children}: { children: ReactNode }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem("token"));

    const [user, setUser] = useState<JwtPayload | null>(() => {
        if (!token) return null;
        try {
            const decoded = jwtDecode<JwtPayload>(token);
            if (decoded.exp * 1000 < Date.now()) return null;
            return decoded;
        } catch {
            return null;
        }
    });

    const [guestSettings, setGuestSettings] = useState<UserSettings>(() => {
        const saved = localStorage.getItem("guest_settings");
        return saved ? JSON.parse(saved) : defaultSettings;
    });

    const [activeRoom, setActiveRoomState] = useState<string | null>(localStorage.getItem("active_room"));

    const [activeGameStatus, setActiveGameStatus] = useState<string | null>(null);

    const activeSettings = user?.settings ? {...defaultSettings, ...user.settings} : guestSettings;

    const setActiveRoom = (code: string | null) => {
        if (code) {
            localStorage.setItem("active_room", code);
        } else {
            localStorage.removeItem("active_room");
        }
        setActiveRoomState(code);
    };

    const updateGuestSettings = (newSettings: UserSettings) => {
        setGuestSettings(newSettings);
        localStorage.setItem("guest_settings", JSON.stringify(newSettings));
    };

    const login = (newToken: string) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("active_room");
        localStorage.removeItem("local_game_data");
        setToken(null);
        setUser(null);
        setActiveRoomState(null);
        setActiveGameStatus(null);
        // LocalGameContext listens for this event to clear its state
        window.dispatchEvent(new CustomEvent("auth_logout"));
    };

    const updateUser = (newData: Partial<JwtPayload>) => {
        if (user) {
            setUser({...user, ...newData});
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            if (!token) return;

            let decoded: JwtPayload;
            try {
                decoded = jwtDecode<JwtPayload>(token);
                if (decoded.exp * 1000 < Date.now()) {
                    logout();
                    return;
                }
            } catch (error) {
                console.error("Invalid token format", error);
                logout();
                return;
            }

            try {
                const response = await api.get('/api/me');
                setUser({...decoded, ...response.data});
            } catch (error: any) {
                console.log("Server verification failed or session expired", error);
                if (error.response?.status === 401 || error.response?.status === 403) {
                    logout();
                }
            }
        };
        initAuth();
    }, [token]);

    return (
        <AuthContext.Provider value={{
            user,
            token,
            settings: activeSettings,
            login,
            logout,
            updateUser,
            updateGuestSettings,
            activeRoom,
            setActiveRoom,
            activeGameStatus,
            setActiveGameStatus,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};
