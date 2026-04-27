/**
 * App - Root Router
 *
 * Defines the entire client-side routing tree using React Router.
 * Uses HashRouter so all navigation happens via the URL hash (#/route),
 * which means the server always receives "/" — no server-side routing config needed.
 *
 * Route structure:
 * - All routes are wrapped in LayoutWrapper (applies PageLayout: background, nav bar, audio)
 * - Most routes are public (no auth required)
 * - /profile is protected — redirects to /login if no token
 * - Catch-all (*) redirects unknown URLs back to home
 */

import './App.css'
import {HashRouter, Navigate, Outlet, Route, Routes} from "react-router-dom";
import {Toaster} from "react-hot-toast";
import {Home} from "./pages/Home.tsx";
import {LocalGame1P} from "./pages/LocalGame1P.tsx";
import {LocalGame2P} from "./pages/LocalGame2P.tsx";
import {OnlineLobby} from "./pages/OnlineLobby.tsx";
import {PageLayout} from "./components/layout/PageLayout.tsx";
import {Login} from "./pages/Login.tsx";
import {Register} from "./pages/Register.tsx";
import {Profile} from "./pages/Profile.tsx";
import {ForgotPassword} from "./pages/ForgotPassword.tsx";
import {ResetPassword} from "./pages/ResetPassword.tsx";
import {Settings} from "./pages/Settings.tsx";
import {ProtectedRoute} from "./components/auth/ProtectedRoute.tsx";
import {OnlineGame} from "./pages/OnlineGame.tsx";
import {PrivacyPolicy} from "./pages/PrivacyPolicy.tsx";

/** Wraps all routes in the shared PageLayout (background image, audio, nav badge) */
const LayoutWrapper = () => {
    return (
        <PageLayout>
            <Outlet/>
        </PageLayout>
    );
};

function App() {
    return (
        <>
            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#1e293b',
                        color: '#f1f5f9',
                        border: '1px solid #334155',
                        borderRadius: '0.75rem',
                        boxShadow: '0 0 20px rgba(34, 211, 238, 0.2)',
                    },
                    success: {
                        iconTheme: { primary: '#22d3ee', secondary: '#1e293b' },
                    },
                    error: {
                        iconTheme: { primary: '#ef4444', secondary: '#1e293b' },
                    },
                }}
            />

            <HashRouter>
                <Routes>
                    <Route element={<LayoutWrapper/>}>
                        {/* Public routes */}
                        <Route path="/" element={<Home/>}/>
                        <Route path="/local1p" element={<LocalGame1P/>}/>
                        <Route path="/local2p" element={<LocalGame2P/>}/>
                        <Route path="/online" element={<OnlineLobby/>}/>
                        <Route path="/online/:roomCode" element={<OnlineGame/>} />
                        <Route path="/login" element={<Login/>}/>
                        <Route path="/register" element={<Register/>}/>
                        <Route path="/forgot-password" element={<ForgotPassword/>}/>
                        <Route path="/reset-password" element={<ResetPassword/>}/>
                        <Route path="/settings" element={<Settings/>} />
                        <Route path="/privacy" element={<PrivacyPolicy/>} />
                        <Route path="*" element={<Navigate to="/" replace />} />

                        {/* Protected routes - require valid JWT token */}
                        <Route element={<ProtectedRoute/>}>
                            <Route path="/profile" element={<Profile/>}/>
                        </Route>

                    </Route>
                </Routes>
            </HashRouter>
        </>
    );
};

export default App
