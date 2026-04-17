import { type ReactNode } from "react";
import { MenuButton } from "./MenuButton";

interface DeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string | ReactNode;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    variant?: "danger" | "warning";
}

export const DeleteAccountModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isLoading = false,
    variant = "danger"
}: DeleteAccountModalProps) => {
    if (!isOpen) return null;

    const borderColor = variant === "danger" ? "border-red-500/50" : "border-yellow-500/50";
    const glowColor = variant === "danger" ? "shadow-[0_0_30px_rgba(239,68,68,0.3)]" : "shadow-[0_0_30px_rgba(234,179,8,0.3)]";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className={`bg-slate-900 border-2 ${borderColor} ${glowColor} rounded-2xl p-6 max-w-md w-full space-y-6 animate-scaleIn`}>
                {/* Title */}
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 text-center">
                    {title}
                </h2>

                {/* Message */}
                <div className="text-slate-300 text-sm text-center leading-relaxed">
                    {message}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    <MenuButton
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="bg-red-600 hover:bg-red-700 border-red-500"
                    >
                        {isLoading ? "Processing..." : confirmText}
                    </MenuButton>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="text-slate-400 hover:text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
};
