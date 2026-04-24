/**
 * ProtectedRoute Component
 *
 * React Router guard for routes that require authentication.
 * Wraps child routes with <Outlet/> — if no token is present, redirects to /login.
 *
 * Used in App.tsx to protect routes like /profile.
 * Any user who is not logged in and tries to access a protected route
 * will be redirected to /login (the original destination URL is not preserved).
 */

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export const ProtectedRoute = () => {
    const { token } = useAuth();

    // No token = not authenticated → redirect to login
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Token present → render the protected child route
    return <Outlet />;
};
