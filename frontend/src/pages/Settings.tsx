import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/axios";
import { useAuth, type UserSettings } from "../context/AuthContext";
import { MenuButton } from "../components/ui/MenuButton";
import { NeonToggle } from "../components/ui/NeonToggle";
import { NeonSlider } from "../components/ui/NeonSlider";

export const Settings = () => {
    // 1. We grab `settings` (which is already the correct User or Guest data)
    // and `updateGuestSettings` for the fallback.
    const { user, token, settings: activeSettings, updateUser, updateGuestSettings } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 2. Local form state initialized directly from the Context settings
    const[localSettings, setLocalSettings] = useState<UserSettings>(activeSettings);
    const [saving, setSaving] = useState<boolean>(false);
    const [success, setSuccess] = useState<string>("");
    const[imgError, setImgError] = useState(false);

    // 3. Keep local form in sync if the Context settings change (e.g. API finishes loading)
    useEffect(() => {
        setLocalSettings(activeSettings);
        setImgError(false);
    }, [activeSettings]);

    const updateSetting = (key: string, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    // --- AVATAR LOGIC (Unchanged, but hidden for Guests below) ---
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const formData = new FormData();
        formData.append("avatar", file);

        setSuccess("");

        try {
            const response = await api.post(
                "/api/me/avatar",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            setImgError(false);
            updateUser({ avatar: response.data.avatarUrl });
            setSuccess("AVATAR UPLOADED.");
        } catch (err) {
            console.error(err);
            alert("Failed to upload avatar.");
        }
    };

    // --- SAVE LOGIC (Handles both User and Guest) ---
    const handleSave = async (e?: FormEvent) => {
        if (e) e.preventDefault();

        setSaving(true);
        setSuccess("");

        try {
            if (user && token) {
                // LOGGED IN: Save to Database
                await api.patch(
                    "/api/me/settings",
                    localSettings
                );
                // Update context immediately so UI reacts
                updateUser({ settings: localSettings });
                setSuccess("CONFIGURATION SAVED TO SERVER.");
            } else {
                // GUEST: Save to Browser Storage
                updateGuestSettings(localSettings);
                setSuccess("LOCAL PREFERENCES SAVED.");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    const getAvatarSrc = () => {
        if (!user?.avatar || user.avatar === "default-avatar.jpg") return null;
        if (user.avatar.startsWith('http')) return user.avatar;
        if (user.avatar.startsWith('/')) return `${import.meta.env.VITE_API_URL}${user.avatar}`;
        return `${import.meta.env.VITE_API_URL}/uploads/avatars/${user.avatar}`;
    };

    const avatarSrc = getAvatarSrc();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">

            <button
                onClick={() => navigate(-1)}
                className="absolute top-6 left-6 p-2 text-cyan-400 hover:text-cyan-100 transition-colors flex items-center gap-2 group z-50 animate-fade-in"
            >
                <div className="p-2 rounded-full border border-cyan-500/30 group-hover:border-cyan-400 group-hover:bg-cyan-950/50 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </div>
                <span className="font-bold tracking-widest hidden sm:block text-sm">BACK</span>
            </button>

            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                SYSTEM CONFIG
            </h1>

            <form
                onSubmit={handleSave}
                className="flex flex-col gap-6 w-full max-w-md bg-slate-900/80 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-[0_0_30px_rgba(34,211,238,0.1)]"
            >
                {/* --- AVATAR SECTION (ONLY SHOW IF LOGGED IN) --- */}
                {user && (
                    <div className="flex flex-col items-center gap-4 pb-6 border-b border-slate-700">
                        <div
                            onClick={handleAvatarClick}
                            className="relative w-24 h-24 rounded-full border-2 border-cyan-400 cursor-pointer overflow-hidden group hover:scale-105 transition-transform shadow-[0_0_15px_cyan]"
                        >
                            {avatarSrc && !imgError ? (
                                <img
                                    src={avatarSrc}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-cyan-200/70">
                                        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}

                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs font-bold text-white tracking-widest">EDIT</span>
                            </div>
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*"
                        />

                        <span className="text-slate-400 text-[10px] text-center max-w-[200px]">
                            Tap to update (Max 10MB • JPG/PNG)
                        </span>
                    </div>
                )}

                {/* If Guest, show a small banner instead of Avatar */}
                {!user && (
                    <div className="bg-slate-800/50 p-4 rounded-lg text-center border border-slate-700">
                        <p className="text-slate-400 text-xs">You are configuring local Guest preferences. Log in to sync settings across devices.</p>
                    </div>
                )}

                {/* --- AUDIO SECTION --- */}
                <div className="space-y-4 border-b border-slate-700 pb-6">
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Audio Protocol</h3>

                    <NeonSlider
                        label="Master Volume"
                        value={localSettings.volume ?? 50}
                        onChange={(val) => updateSetting('volume', val)}
                    />

                    <NeonToggle
                        label="Background Music"
                        checked={localSettings.music ?? true}
                        onChange={(val) => updateSetting('music', val)}
                    />

                    <NeonToggle
                        label="Sound Effects (SFX)"
                        checked={localSettings.sfx ?? true}
                        onChange={(val) => updateSetting('sfx', val)}
                    />
                </div>

                {/* --- VISUALS SECTION --- */}
                <div className="space-y-4">
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Visuals</h3>

                    <div className="flex justify-between items-center p-2">
                        <div className="flex flex-col">
                            <span className="text-slate-300 font-bold uppercase text-sm">Theme</span>
                            <span className="text-[10px] text-slate-500 italic mt-1">
                                More themes incoming via OTA update...
                            </span>
                        </div>
                        <span className="text-cyan-400 font-mono text-sm border border-cyan-500/30 px-3 py-1 rounded">
                            {localSettings.theme}
                        </span>
                    </div>
                </div>

                {/* --- SUCCESS MESSAGE --- */}
                {success && (
                    <div className="bg-green-900/30 border border-green-500/50 text-green-400 px-4 py-2 rounded text-center text-xs font-bold shadow-[0_0_10px_green] animate-pulse">
                        ✅ {success}
                    </div>
                )}

                {/* --- ACTIONS --- */}
                <div className="flex flex-col gap-3 mt-4">
                    <MenuButton type="submit">
                        {saving ? "SAVING..." : "APPLY CHANGES"}
                    </MenuButton>

                    <button
                        type="button"
                        onClick={() => navigate(-1)} // <--- CHANGED FROM '/' TO -1
                        className="text-slate-500 hover:text-white text-sm underline transition-colors text-center"
                    >
                        Cancel
                    </button>
                </div>

            </form>
        </div>
    );
};