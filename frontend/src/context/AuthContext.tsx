import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import { Connect4 } from "../logic/Connect4";
import { api } from "../api/axios";
import axios from "axios";

export interface LocalGameData {
    game: Connect4;
    score: { p1: number; p2: number };
    vsBot: boolean;
}

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
    localGameData: LocalGameData | null;
    setLocalGameData: (data: LocalGameData | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const defaultSettings: UserSettings = {theme: 'dark-neon', music: true, sfx: true, volume: 50};

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
    const[localGameData, setLocalGameData] = useState<LocalGameData | null>(null);
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
        setToken(null);
        setUser(null);
        setActiveRoomState(null);
        setActiveGameStatus(null);
        setLocalGameData(null);
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
                // If it's already dead on arrival, log out immediately
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
                // 👇 UPGRADED TO USE AXIOS API INSTANCE 👇
                // If the token is expired, the interceptor will catch the 401
                // and automatically try to use the refresh token!
                const response = await api.get('/api/me');

                // If Axios succeeds (either first try, or after interceptor refresh)
                setUser({...decoded, ...response.data});

            } catch (error: any) {
                // If Axios fails completely (Interceptor couldn't refresh)
                console.log("Server verification failed or session expired", error);
                if (error.response?.status === 401 || error.response?.status === 403) {
                    logout();
                }
            }
        };

        initAuth();
    }, [token]);


// ---------------------------------------------------------
    // 2. THE BACKGROUND REFRESH TIMER
    // Wakes up 10 seconds before expiry and forces a token refresh
    // ---------------------------------------------------------
    useEffect(() => {
        if (!user?.exp) return;

        const timeToExpiry = (user.exp * 1000) - Date.now();

        if (timeToExpiry > 10000) {
            const timeout = setTimeout(async () => {
                console.log("Token expiring soon, explicitly requesting new token...");

                const refreshToken = localStorage.getItem("refresh_token");
                if (!refreshToken) {
                    logout();
                    return;
                }

                try {
                    // Directly ask the backend to exchange the refresh token for a new JWT
                    const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/token/refresh`, {
                        refresh_token: refreshToken
                    });

                    const { token: newToken, refresh_token: newRefreshToken } = response.data;

                    // Save both new tokens
                    localStorage.setItem("token", newToken);
                    localStorage.setItem("refresh_token", newRefreshToken);

                    // Fire the event so React updates its state (which triggers Effect #1)
                    window.dispatchEvent(new CustomEvent("auth_token_refreshed", { detail: newToken }));

                } catch (err) {
                    console.error("Silent refresh failed (refresh token expired?)", err);
                    logout();
                }

            }, timeToExpiry - 10000);

            return () => clearTimeout(timeout);
        }
    }, [user?.exp]); // Only depends on exp to avoid infinite loops

    // 3. LISTEN TO THE INTERCEPTOR
    // When Axios gets a new token in the background, it tells React here.
    // ---------------------------------------------------------
    useEffect(() => {
        const handleTokenRefresh = (e: any) => {
            // This updates the 'token' state, which re-triggers the initAuth (Effect #1)
            setToken(e.detail);
        };

        window.addEventListener("auth_token_refreshed", handleTokenRefresh as EventListener);

        return () => {
            window.removeEventListener("auth_token_refreshed", handleTokenRefresh as EventListener);
        };
    },[]);

    return (
        <AuthContext.Provider value={{
            user, token, settings: activeSettings, login, logout, updateUser, updateGuestSettings, activeRoom,
            setActiveRoom, activeGameStatus, setActiveGameStatus, localGameData, setLocalGameData,
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