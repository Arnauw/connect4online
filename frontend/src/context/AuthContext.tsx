/**
 * Authentication Context
 *
 * This is the central state management for authentication and user data.
 * It provides global access to:
 * - User authentication state (logged in/out)
 * - JWT token management with automatic refresh
 * - User settings (for logged-in users) and guest settings (for visitors)
 * - Active online game room tracking
 * - Local game state persistence (vs Bot, 2P mode)
 *
 * Token Management Strategy:
 * 1. Tokens stored in localStorage for persistence across page refreshes
 * 2. JWT automatically decoded to extract user data
 * 3. Three mechanisms keep tokens fresh:
 *    a) axios interceptor (handles 401 errors)
 *    b) Background timer (refreshes 10 seconds before expiry)
 *    c) Event listener (syncs with axios interceptor)
 *
 * Usage:
 * const { user, login, logout, settings } = useAuth();
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import { Connect4 } from "../logic/Connect4";
import { api } from "../api/axios";
import axios from "axios";

/**
 * Structure for local game state (vs Bot or 2 Player)
 * Persisted to localStorage so games survive page refresh
 */
export interface LocalGameData {
    game: Connect4;                      // The Connect4 game instance with board state
    score: { p1: number; p2: number };   // Player scores for the session
    vsBot: boolean;                      // Whether playing against bot or another human
}

/**
 * User preferences/settings structure
 * Used for both logged-in users (saved to backend)
 * and guests (saved to localStorage)
 */
export interface UserSettings {
    theme?: string;    // UI theme (e.g., 'dark-neon')
    music?: boolean;   // Background music on/off
    sfx?: boolean;     // Sound effects on/off
    volume?: number;   // Volume level 0-100
}

/**
 * JWT Token Payload Structure
 * This is what gets decoded from the JWT access token
 */
interface JwtPayload {
    id: number;              // User's database ID
    username: string;        // User's display name
    email: string;           // User's email address
    elo: number;             // User's ELO rating (for online play)
    avatar?: string;         // Avatar code (e.g., "🎮", "👾", "🤖")
    settings?: UserSettings; // User's saved settings
    exp: number;             // Token expiration timestamp (Unix time in seconds)
}

/**
 * Interface for the context value
 * Defines all data and functions available to components using this context
 */
interface AuthContextType {
    user: JwtPayload | null;                             // Current user data (null if logged out)
    token: string | null;                                // JWT access token
    settings: UserSettings;                              // Active settings (user's or guest's)
    activeRoom: string | null;                           // Active online game room code
    setActiveRoom: (code: string | null) => void;        // Update active room
    login: (token: string) => void;                      // Login with a new token
    logout: () => void;                                  // Logout and clear all data
    updateUser: (newData: Partial<JwtPayload>) => void;  // Update user data (e.g., after profile edit)
    updateGuestSettings: (newSettings: UserSettings) => void;  // Update guest settings
    activeGameStatus: string | null;                     // Current online game status (PLAYING/FINISHED)
    setActiveGameStatus: (status: string | null) => void;  // Update game status
    localGameData: LocalGameData | null;                 // Current local game state
    setLocalGameData: (data: LocalGameData | null) => void;  // Update local game state
}

// Create the context with null as initial value
const AuthContext = createContext<AuthContextType | null>(null);

// Default settings for new users/guests
const defaultSettings: UserSettings = {theme: 'dark-neon', music: true, sfx: true, volume: 50};

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

    // Local game state (vs Bot, 2 Player mode)
    // Persisted so games survive page refresh (F5)
    const [localGameData, setLocalGameData] = useState<LocalGameData | null>(() => {
        const saved = localStorage.getItem("local_game_data");
        if (!saved) return null;
        try {
            const parsed = JSON.parse(saved);
            // Re-hydrate the Connect4 class instance
            // (JSON.parse doesn't restore class methods)
            const game = new Connect4();
            Object.assign(game, parsed.game);
            return { ...parsed, game };
        } catch (e) {
            console.error("Failed to load local game data", e);
            return null;
        }
    });

    // Merge user settings with defaults, or use guest settings
    const activeSettings = user?.settings ? {...defaultSettings, ...user.settings} : guestSettings;

    // ====================
    // PERSISTENCE EFFECTS
    // ====================

    /**
     * Persist local game data to localStorage
     * Allows games to survive page refreshes
     */
    useEffect(() => {
        if (localGameData) {
            localStorage.setItem("local_game_data", JSON.stringify(localGameData));
        } else {
            localStorage.removeItem("local_game_data");
        }
    }, [localGameData]);

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
     * Clears all tokens, user data, and game state
     */
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
     * 4. If token expired, axios interceptor will auto-refresh
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
                // Verify token with backend and get fresh user data
                // If token is expired, axios interceptor will catch 401
                // and automatically refresh using refresh_token
                const response = await api.get('/api/me');

                // Success - update user data with backend response
                setUser({...decoded, ...response.data});

            } catch (error: any) {
                // Failed completely (couldn't refresh or verify)
                console.log("Server verification failed or session expired", error);
                if (error.response?.status === 401 || error.response?.status === 403) {
                    logout();
                }
            }
        };

        initAuth();
    }, [token]);  // Run when token changes

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

                    // Save both new tokens to localStorage
                    localStorage.setItem("token", newToken);
                    localStorage.setItem("refresh_token", newRefreshToken);

                    // Notify the app that tokens were refreshed
                    // This triggers EFFECT #3 below to update React state
                    window.dispatchEvent(new CustomEvent("auth_token_refreshed", { detail: newToken }));

                } catch (err) {
                    console.error("Proactive token refresh failed", err);
                    logout();
                }

            }, timeToExpiry - 10000);  // Fire 10 seconds before expiry

            // Cleanup timer if component unmounts or exp changes
            return () => clearTimeout(timeout);
        }
    }, [user?.exp]);

    /**
     * EFFECT #3: Listen for Axios Interceptor Token Refresh
     *
     * When the axios interceptor refreshes tokens (after a 401 error),
     * it fires a custom event. This effect listens for that event and
     * updates the React state to keep everything in sync.
     *
     * This creates a two-way sync:
     * - axios.ts can refresh tokens (in response to 401)
     * - AuthContext stays updated with new tokens
     */
    useEffect(() => {
        const handleTokenRefresh = (e: any) => {
            // Update token state, which triggers EFFECT #1 above
            // to decode and verify the new token
            setToken(e.detail);
        };

        // Listen for custom event fired by axios interceptor
        window.addEventListener("auth_token_refreshed", handleTokenRefresh as EventListener);

        // Cleanup listener on unmount
        return () => {
            window.removeEventListener("auth_token_refreshed", handleTokenRefresh as EventListener);
        };
    }, []);

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
            localGameData,
            setLocalGameData,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * useAuth Hook
 *
 * Custom hook to access the auth context from any component
 * Throws an error if used outside of AuthProvider
 *
 * Usage:
 * const { user, login, logout } = useAuth();
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};
