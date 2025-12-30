import {createContext, useContext, useState, useEffect, type ReactNode} from "react";
import {jwtDecode} from "jwt-decode";

interface JwtPayload {
    id: number;
    username: string;
    email: string;
    elo: number;
    avatar?: string;
    settings?: {
        theme?: string;
        music?: boolean;
        volume?: number;
    };
    exp: number;
}

interface AuthContextType {
    user: JwtPayload | null;
    token: string | null;
    login: (token: string) => void;
    logout: () => void;
    updateUser: (newData: Partial<JwtPayload>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({children}: { children: ReactNode }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
    const [user, setUser] = useState<JwtPayload | null>(null);

    const login = (newToken: string) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    };

    const updateUser = (newData: Partial<JwtPayload>) => {
        if (user) {
            setUser({ ...user, ...newData });
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
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/me`, {
                    headers: {Authorization: `Bearer ${token}`}
                });

                if (response.ok) {
                    const userData = await response.json();
                    setUser({...decoded, ...userData});
                } else if (response.status === 401 || response.status === 403) {
                    logout();
                }
            } catch (error) {
                console.log("Server verification failed (network error?)", error);
            }
        };

        initAuth();
    }, [token]);


    return (
        <AuthContext.Provider value={{user, token, login, logout, updateUser}}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};