import {useState, type FormEvent, useEffect} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { MenuButton } from "../components/ui/MenuButton";
import { NeonToggle } from "../components/ui/NeonToggle";
import { NeonSlider } from "../components/ui/NeonSlider";

interface UserSettings {
    theme?: string;
    music?: boolean;
    volume?: number;
}

export const Settings = () => {
    const { user, token, updateUser } = useAuth();
    const navigate = useNavigate();
    
    const initialSettings = user?.settings || {
        theme: 'dark-neon',
        music: true,
        volume: 50,
    };

    const [settings, setSettings] = useState<UserSettings>(initialSettings);
    const [saving, setSaving] = useState<boolean>(false);
    const [success, setSuccess] = useState<string>("");

    useEffect(() => {
        if (user?.settings) {
            setSettings(user.settings);
        }
    }, [user]);

    const updateSetting = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async (e?: FormEvent) => {
        if (e) e.preventDefault();

        setSaving(true);
        setSuccess("");

        try {
            await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/me/settings`,
                settings,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            updateUser({ settings: settings });

            setSuccess("CONFIGURATION SAVED.");
        } catch (err) {
            console.error(err);
            alert("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-cyan-300 to-blue-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                SYSTEM CONFIG
            </h1>

            <form
                onSubmit={handleSave}
                className="flex flex-col gap-6 w-full max-w-md bg-slate-900/80 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-[0_0_30px_rgba(34,211,238,0.1)]"
            >
                
                <div className="space-y-4 border-b border-slate-700 pb-6">
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Audio Protocol</h3>

                    <NeonSlider
                        label="Master Volume"
                        value={settings.volume ?? 50}
                        onChange={(val) => updateSetting('volume', val)}
                    />

                    <NeonToggle
                        label="Background Music"
                        checked={settings.music ?? true}
                        onChange={(val) => updateSetting('music', val)}
                    />
                </div>

                <div className="space-y-4">
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Visuals</h3>

                    <div className="flex justify-between items-center p-2">
                        <div className="flex flex-col">
                            <span className="text-slate-300 font-bold uppercase text-sm">Theme</span>
                            <span className="text-[10px] text-slate-500 italic mt-1">
                                More themes coming soon...
                            </span>
                        </div>
                        <span className="text-cyan-400 font-mono text-sm border border-cyan-500/30 px-3 py-1 rounded">
                            {settings.theme}
                        </span>
                    </div>
                </div>

                {success && (
                    <div className="bg-green-900/30 border border-green-500/50 text-green-400 px-4 py-2 rounded text-center text-xs font-bold shadow-[0_0_10px_green] animate-pulse">
                        ✅ {success}
                    </div>
                )}

                <div className="flex flex-col gap-3 mt-4">
                    <MenuButton onClick={() => {}} type="submit">
                        {saving ? "SAVING..." : "APPLY CHANGES"}
                    </MenuButton>

                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="text-slate-500 hover:text-white text-sm underline transition-colors text-center"
                    >
                        Cancel
                    </button>
                </div>

            </form>
        </div>
    );
};