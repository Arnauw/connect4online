import './App.css'
import {HashRouter, Navigate, Outlet, Route, Routes} from "react-router-dom";
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
import {ProtectedRoute} from "./components/layout/ProtectedRoute.tsx";
import {OnlineBoard} from "./pages/OnlineBoard.tsx";
import {PrivacyPolicy} from "./pages/PrivacyPolicy.tsx";

const LayoutWrapper = () => {
    return (
        <PageLayout>
            <Outlet/>
        </PageLayout>
    );
};

function App() {

    return (
        <HashRouter>
            <Routes>
                <Route element={<LayoutWrapper/>}>
                    <Route path="/" element={<Home/>}/>
                    <Route path="/local1p" element={<LocalGame1P/>}/>
                    <Route path="/local2p" element={<LocalGame2P/>}/>
                    <Route path="/online" element={<OnlineLobby/>}/>
                    <Route path="/online/:roomCode" element={<OnlineBoard/>} />
                    <Route path="/login" element={<Login/>}/>
                    <Route path="/register" element={<Register/>}/>
                    <Route path="/forgot-password" element={<ForgotPassword/>}/>
                    <Route path="/reset-password" element={<ResetPassword/>}/>
                    <Route path="/settings" element={<Settings/>} />
                    <Route path="/privacy" element={<PrivacyPolicy/>} />
                    <Route path="*" element={<Navigate to="/" replace />} />

                    <Route element={<ProtectedRoute/>}>
                        <Route path="/profile" element={<Profile/>}/>
                    </Route>
                </Route>
            </Routes>
        </HashRouter>
    );
};

export default App

