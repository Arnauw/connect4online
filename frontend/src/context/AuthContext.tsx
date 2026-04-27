/**
 * Authentication Context
 *
 * This is the central state management for authentication and user data.
 * It provides global access to:
 * - User authentication state (logged in/out)
 * - JWT token management with automatic refresh
 * - User settings (for logged-in users) and guest settings (for visitors)
 * - Active online game room tracking
 *
 * Local game state (vs Bot, 2P mode) is managed separately in LocalGameContext.
 *
 * Token Management Strategy:
 * 1. Tokens stored in localStorage for persistence across page refreshes
 * 2. JWT automatically decoded to extract user data
 * 3. Background timer refreshes token 10 seconds before expiry
 *
 * Usage:
 * const { user, login, logout, settings } = useAuth();
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import { api } from "../api/axios";
import axios from "axios";

/**
 * User preferences/settings structure
 * Used for both logged-in users (saved to backend)
 * and guests (saved to localStorage)
 */
export interface UserSettings {
    theme?: string;
    music?: boolean;
    sfx?: boolean;
    volume?: number;
}

/**
 * JWT Token Payload Structure
 * This is what gets decoded from the JWT access token
 */
interface JwtPayload {
    id: number;
    username: string;
    email: string;
    elo: number;
    avatar?: string;
    settings?: UserSettings;
    exp: number;
}

/**
 * Interface for the context value
 * Defines all data and functions available to components using this context
 */
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

// Create the context with null as initial value
const AuthContext = createContext<AuthContextType | null>(null);

// Default settings for new users/guests
const defaultSettings: UserSettings = {theme: 'dark-neon', music: false, sfx: true, volume: 50};

/**
 * AuthProvider Component
 * Wraps the entire app and provides authentication state to all components
 */
export const AuthProvider = ({children}: { children: ReactNode }) => {
    // ====================
    // STATE MANAGEMENT
    // ====================

    // JWT access token from localStorage
    const [token, setToken] = useState<string | null>(localStorage.getItem("token"));

    // User data decoded from JWT token
    // Initialized from localStorage token if valid
    const [user, setUser] = useState<JwtPayload | null>(() => {
        if (!token) return null;
        try {
            const decoded = jwtDecode<JwtPayload>(token);
            // Check if token is expired
            if (decoded.exp * 1000 < Date.now()) return null;
            return decoded;
        } catch {
            return null;
        }
    });

    // Settings for guests (users not logged in)
    // Stored in localStorage so preferences persist
    const [guestSettings, setGuestSettings] = useState<UserSettings>(() => {
        const saved = localStorage.getItem("guest_settings");
        return saved ? JSON.parse(saved) : defaultSettings;
    });

    // Active online game room code (e.g., "A3F7E2")
    // Persisted so user can refresh page without losing room
    const [activeRoom, setActiveRoomState] = useState<string | null>(localStorage.getItem("active_room"));

    // Current online game status (WAITING, PLAYING, FINISHED)
    // Not persisted - only for UI state management
    const [activeGameStatus, setActiveGameStatus] = useState<string | null>(null);

    // Merge user settings with defaults, or use guest settings
    const activeSettings = user?.settings ? {...defaultSettings, ...user.settings} : guestSettings;

    // ====================
    // HELPER FUNCTIONS
    // ====================

    /**
     * Update active room code
     * Syncs with localStorage for persistence
     */
    const setActiveRoom = (code: string | null) => {
        if (code) {
            localStorage.setItem("active_room", code);
        } else {
            localStorage.removeItem("active_room");
        }
        setActiveRoomState(code);
    };

    /**
     * Update guest settings
     * Persists to localStorage
     */
    const updateGuestSettings = (newSettings: UserSettings) => {
        setGuestSettings(newSettings);
        localStorage.setItem("guest_settings", JSON.stringify(newSettings));
    };

    /**
     * Login with a new token
     * Stores token in localStorage and state
     * The useEffect below will decode it and fetch user data
     */
    const login = (newToken: string) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
    };

    /**
     * Logout completely
     * Clears all tokens and user data, dispatches "auth_logout" so LocalGameContext clears game state
     */
    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("active_room");
        localStorage.removeItem("local_game_data");
        setToken(null);
        setUser(null);
        setActiveRoomState(null);
        setActiveGameStatus(null);
        window.dispatchEvent(new CustomEvent("auth_logout"));
    };

    /**
     * Update user data in-place
     * Used after profile edits, avatar changes, etc.
     */
    const updateUser = (newData: Partial<JwtPayload>) => {
        if (user) {
            setUser({...user, ...newData});
        }
    };

    // ====================
    // TOKEN MANAGEMENT
    // ====================

    /**
     * EFFECT #1: Initialize/Verify Authentication
     *
     * Runs whenever the token changes (login, refresh, logout)
     * 1. Decodes the JWT to extract user data
     * 2. Verifies token is not expired
     * 3. Calls /api/me to get fresh user data from backend
     * 4. On 401/403, logs out (token invalid or expired)
     */
    useEffect(() => {
        const initAuth = async () => {
            if (!token) return;

            let decoded: JwtPayload;
            try {
                decoded = jwtDecode<JwtPayload>(token);

                // Check if token is already expired
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
                // Success - update user data with backend response
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

    /**
     * EFFECT #2: Proactive Token Refresh Timer
     *
     * Sets a timer to refresh the token 10 seconds before it expires
     * This prevents the user from experiencing any authentication interruption
     *
     * Why 10 seconds?
     * - Gives enough time for the refresh request to complete
     * - User never experiences a 401 error during active use
     */
    useEffect(() => {
        if (!user?.exp) return;

        // Calculate milliseconds until token expires
        const timeToExpiry = (user.exp * 1000) - Date.now();

        // Only set timer if token has more than 10 seconds left
        if (timeToExpiry > 10000) {
            const timeout = setTimeout(async () => {
                console.log("Token expiring soon, proactively refreshing...");

                const refreshToken = localStorage.getItem("refresh_token");
                if (!refreshToken) {
                    logout();
                    return;
                }

                try {
                    // Request new tokens from backend
                    const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/token/refresh`, {
                        refresh_token: refreshToken
                    });

                    const { token: newToken, refresh_token: newRefreshToken } = response.data;

                    localStorage.setItem("refresh_token", newRefreshToken);
                    login(newToken);

                } catch (err) {
                    console.error("Proactive token refresh failed", err);
                    logout();
                }

            }, timeToExpiry - 10000);  // Fire 10 seconds before expiry

            // Cleanup timer if component unmounts or exp changes
            return () => clearTimeout(timeout);
        }
    }, [user?.exp]);

    // ====================
    // PROVIDE CONTEXT
    // ====================

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

/**
 * useAuth Hook
 *
 * Custom hook to access the auth context from any component
 * Throws an error if used outside of AuthProvider.
 *
 * Usage:
 * const { user, login, logout } = useAuth();
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};
