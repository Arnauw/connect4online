/**
 * Settings Page
 *
 * Unified settings page for both logged-in users and guests.
 *
 * For logged-in users:
 * - Shows avatar upload/delete controls
 * - Saves settings to the backend via PATCH /api/me/settings
 * - Settings are synced across devices on next login (stored in JWT payload)
 *
 * For guests:
 * - Shows a guest banner instead of avatar section
 * - Saves settings to localStorage via updateGuestSettings()
 *
 * Avatar handling:
 * - Client validates file type (JPG/PNG/WEBP) and size (max 10MB) before uploading
 * - Server then optimizes (resizes to 500px max) before saving
 * - Delete resets avatar back to "default-avatar.jpg" and removes the file from disk
 *
 * Danger Zone:
 * - Two-step confirmation: "Danger Zone" link → modal → DeleteAccountModal
 * - Calls DELETE /api/me → backend deletes user + avatar file → frontend logs out
 *
 * Avatar URL resolution (getAvatarSrc):
 * - null/default → no image (fallback SVG used in Avatar component)
 * - starts with http → absolute URL (CDN etc.)
 * - starts with / → prepend API base URL
 * - otherwise → assumed to be a filename in /uploads/avatars/
 */

import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../api/axios";
import { useAuth, type UserSettings } from "../context/AuthContext";
import { MenuButton } from "../components/ui/MenuButton";
import { NeonToggle } from "../components/ui/NeonToggle";
import { NeonSlider } from "../components/ui/NeonSlider";
import { TopNavButton } from "../components/ui/TopNavButton";
import { DeleteAccountModal } from "../components/ui/DeleteAccountModal";

export const Settings = () => {
    const { user, token, settings: activeSettings, updateUser, updateGuestSettings } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Local copy of settings for the form — synced from context on load
    const [localSettings, setLocalSettings] = useState<UserSettings>(activeSettings);
    const [saving, setSaving] = useState<boolean>(false);
    const [imgError, setImgError] = useState(false);          // Avatar image failed to load
    const [uploading, setUploading] = useState<boolean>(false);
    const [uploadError, setUploadError] = useState<string>("");
    const [avatarSuccess, setAvatarSuccess] = useState<boolean>(false);
    const [deleting, setDeleting] = useState<boolean>(false);  // Deleting avatar
    const [showDangerZone, setShowDangerZone] = useState<boolean>(false);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
    const [deletingAccount, setDeletingAccount] = useState<boolean>(false);

    // Keep form in sync if context settings change externally (e.g. after API response on mount)
    useEffect(() => {
        setLocalSettings(activeSettings);
        setImgError(false);
    }, [activeSettings]);

    const updateSetting = (key: string, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    /** Open native file picker when avatar is clicked */
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    /** Handle avatar file selection: validate locally, then upload */
    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];

        // Client-side size check (server also checks, but this gives faster feedback)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            setUploadError("File too large. Maximum size is 10MB.");
            toast.error("File too large. Maximum size is 10MB.");
            return;
        }

        // Client-side MIME type check
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setUploadError("Invalid file type. Please upload JPG, PNG, or WEBP.");
            toast.error("Invalid file type. Please upload JPG, PNG, or WEBP.");
            return;
        }

        const formData = new FormData();
        formData.append("avatar", file);

        setUploadError("");
        setUploading(true);

        try {
            const response = await api.post("/api/me/avatar", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setImgError(false);
            updateUser({ avatar: response.data.avatarUrl });  // Update AuthContext immediately
            setAvatarSuccess(true);
            toast.success("Avatar uploaded successfully!");

            setTimeout(() => setAvatarSuccess(false), 3000);
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || "Failed to upload avatar. Please try again.";
            setUploadError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setUploading(false);
            // Reset so user can upload the same file again if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRetryUpload = () => {
        setUploadError("");
        fileInputRef.current?.click();
    };

    /** Delete the custom avatar and reset to default */
    const handleDeleteAvatar = async () => {
        if (!user) return;

        setDeleting(true);
        setUploadError("");
        setAvatarSuccess(false);

        try {
            await api.delete("/api/me/avatar");
            updateUser({ avatar: "default-avatar.jpg" });
            toast.success("Avatar deleted successfully!");
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to delete avatar. Please try again.");
        } finally {
            setDeleting(false);
        }
    };

    /** Permanently delete the user's account */
    const handleDeleteAccount = async () => {
        if (!user) return;

        setDeletingAccount(true);

        try {
            await api.delete("/api/me");
            toast.success("Account deleted successfully");

            localStorage.removeItem("token");
            setShowDeleteModal(false);
            navigate("/");
            window.location.reload();  // Force full state reset
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to delete account. Please try again.");
            setDeletingAccount(false);
        }
    };

    /** Save settings — to backend for logged-in users, localStorage for guests */
    const handleSave = async (e?: FormEvent) => {
        if (e) e.preventDefault();

        setSaving(true);

        try {
            if (user && token) {
                await api.patch("/api/me/settings", localSettings);
                updateUser({ settings: localSettings });  // Update context so UI reflects immediately
                toast.success("Settings saved to server!");
            } else {
                updateGuestSettings(localSettings);
                toast.success("Settings saved locally!");
            }
        } catch (err) {
            toast.error("Failed to save settings. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    /** Resolve avatar filename to a full URL, or null if using default */
    const getAvatarSrc = () => {
        if (!user?.avatar || user.avatar === "default-avatar.jpg") return null;
        if (user.avatar.startsWith('http')) return user.avatar;
        if (user.avatar.startsWith('/')) return `${import.meta.env.VITE_API_URL}${user.avatar}`;
        return `${import.meta.env.VITE_API_URL}/uploads/avatars/${user.avatar}`;
    };

    const avatarSrc = getAvatarSrc();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">

            <TopNavButton label="BACK" onClick={() => navigate(-1)} />

            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                SYSTEM CONFIG
            </h1>

            <form
                onSubmit={handleSave}
                className="flex flex-col gap-6 w-full max-w-md bg-slate-900/80 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-[0_0_30px_rgba(34,211,238,0.1)]"
            >
                {/* AVATAR SECTION — only shown to logged-in users */}
                {user && (
                    <div className="flex flex-col items-center gap-4 pb-6 border-b border-slate-700">
                        {/* Clickable avatar circle with upload/uploading/success states */}
                        <div
                            onClick={uploading ? undefined : handleAvatarClick}
                            className={`relative w-24 h-24 rounded-full border-2 ${
                                uploading ? 'border-yellow-400' : uploadError ? 'border-red-500' : avatarSuccess ? 'border-green-400' : 'border-cyan-400'
                            } ${uploading ? 'cursor-wait' : 'cursor-pointer'} overflow-hidden group hover:scale-105 transition-transform shadow-[0_0_15px_cyan]`}
                        >
                            {avatarSrc && !imgError ? (
                                <img
                                    src={avatarSrc}
                                    alt="Avatar"
                                    className={`w-full h-full object-cover ${uploading ? 'opacity-50' : ''}`}
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className={`w-full h-full bg-slate-900 flex items-center justify-center ${uploading ? 'opacity-50' : ''}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-cyan-200/70">
                                        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}

                            {uploading && (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                    <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}

                            {avatarSuccess && !uploading && (
                                <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center animate-pulse">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-green-400">
                                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}

                            {!uploading && !avatarSuccess && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs font-bold text-white tracking-widest">EDIT</span>
                                </div>
                            )}
                        </div>

                        {/* Hidden file input — triggered by clicking avatar circle above */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*"
                            disabled={uploading}
                        />

                        <div className="flex flex-col items-center gap-2 w-full">
                            <span className="text-slate-400 text-[10px] text-center whitespace-nowrap">
                                {uploading ? 'Uploading...' : 'Tap to update (Max 10MB • JPG/PNG/WEBP)'}
                            </span>

                            {avatarSrc && !uploading && !deleting && (
                                <button
                                    type="button"
                                    onClick={handleDeleteAvatar}
                                    className="text-red-400 hover:text-red-300 text-xs font-bold transition-colors mt-1 flex items-center gap-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                    </svg>
                                    Delete Avatar
                                </button>
                            )}

                            {deleting && (
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-yellow-400 text-xs font-bold">Deleting...</span>
                                </div>
                            )}

                            {uploadError && (
                                <div className="flex flex-col items-center gap-2 mt-2">
                                    <p className="text-red-400 text-xs text-center">{uploadError}</p>
                                    <button
                                        type="button"
                                        onClick={handleRetryUpload}
                                        className="text-cyan-400 hover:text-cyan-300 text-xs underline font-bold transition-colors"
                                    >
                                        Retry Upload
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Guest banner — shown instead of avatar section */}
                {!user && (
                    <div className="bg-slate-800/50 p-4 rounded-lg text-center border border-slate-700">
                        <p className="text-slate-400 text-xs">You are configuring local Guest preferences. Log in to sync settings across devices.</p>
                    </div>
                )}

                {/* AUDIO SETTINGS */}
                <div className="space-y-4 border-b border-slate-700 pb-6">
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Audio Protocol</h3>
                    <NeonSlider
                        label="Master Volume"
                        value={localSettings.volume ?? 50}
                        onChange={(val) => updateSetting('volume', val)}
                    />
                    <NeonToggle
                        label="Background Music"
                        checked={localSettings.music ?? false}
                        onChange={(val) => updateSetting('music', val)}
                    />
                    <NeonToggle
                        label="Sound Effects (SFX)"
                        checked={localSettings.sfx ?? true}
                        onChange={(val) => updateSetting('sfx', val)}
                    />
                </div>

                {/* VISUALS SETTINGS */}
                <div className="space-y-4">
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Visuals</h3>
                    <div className="flex justify-between items-center p-2">
                        <div className="flex flex-col">
                            <span className="text-slate-300 font-bold uppercase text-sm">Theme</span>
                            <span className="text-[10px] text-slate-500 italic mt-1">
                                More themes coming later...
                            </span>
                        </div>
                        <span className="text-cyan-400 font-mono text-sm border border-cyan-500/30 px-3 py-1 rounded">
                            {localSettings.theme}
                        </span>
                    </div>
                </div>

                {/* SAVE / CANCEL */}
                <div className="flex flex-col gap-3 mt-4">
                    <MenuButton type="submit">
                        {saving ? "SAVING..." : "APPLY CHANGES"}
                    </MenuButton>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="text-slate-500 hover:text-white text-sm underline transition-colors text-center"
                    >
                        Cancel
                    </button>
                </div>

                {/* DANGER ZONE link — only for logged-in users */}
                {user && (
                    <div className="pt-4 border-t border-slate-700">
                        <button
                            type="button"
                            onClick={() => setShowDangerZone(true)}
                            className="text-red-400 hover:text-red-300 text-xs underline transition-colors text-center w-full"
                        >
                            ⚠️ Danger Zone
                        </button>
                    </div>
                )}

            </form>

            {/* DANGER ZONE MODAL — first confirmation step */}
            {showDangerZone && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-slate-900 border-2 border-red-900/50 shadow-[0_0_30px_rgba(239,68,68,0.3)] rounded-2xl p-6 max-w-md w-full space-y-6 animate-scaleIn">
                        <button
                            onClick={() => setShowDangerZone(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                        </button>

                        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 text-center pt-2">
                            ⚠️ DANGER ZONE
                        </h2>

                        <div className="bg-red-950/20 p-4 rounded-lg border border-red-900/50">
                            <p className="text-slate-300 text-sm text-center leading-relaxed">
                                Permanently delete your account and all associated data. This action cannot be undone.
                            </p>
                        </div>

                        {/* Advance to second confirmation step (DeleteAccountModal) */}
                        <button
                            type="button"
                            onClick={() => { setShowDangerZone(false); setShowDeleteModal(true); }}
                            className="w-full bg-red-900/30 hover:bg-red-900/50 border-2 border-red-500/50 text-red-400 font-bold py-3 px-4 rounded-lg transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] text-sm"
                        >
                            DELETE ACCOUNT
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowDangerZone(false)}
                            className="w-full text-slate-400 hover:text-white text-sm transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* DELETE ACCOUNT MODAL — final confirmation step */}
            <DeleteAccountModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteAccount}
                title="⚠️ Delete Account"
                message={
                    <>
                        <p className="font-bold text-red-400 mb-2">ARE YOU ABSOLUTELY SURE?</p>
                        <p className="mb-2">This operation is permanent and irreversible.</p>
                        <p className="text-xs text-slate-400">
                            All your data, including game history, statistics, and settings will be permanently deleted.
                        </p>
                    </>
                }
                confirmText="YES, DELETE MY ACCOUNT"
                cancelText="No, Keep My Account"
                isLoading={deletingAccount}
                variant="danger"
            />
        </div>
    );
};
