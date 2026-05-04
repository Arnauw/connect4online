import { MenuButton } from "./MenuButton";

interface DeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
}

export const DeleteAccountModal = ({ isOpen, onClose, onConfirm, isLoading = false }: DeleteAccountModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border-2 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)] rounded-2xl p-6 max-w-md w-full space-y-6 animate-scaleIn">

                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 text-center">
                    ⚠️ Delete Account
                </h2>

                <div className="text-slate-300 text-sm text-center leading-relaxed">
                    <p className="font-bold text-red-400 mb-2">ARE YOU ABSOLUTELY SURE?</p>
                    <p className="mb-2">This operation is permanent and irreversible.</p>
                    <p className="text-xs text-slate-400">
                        All your data, including game history, statistics, and settings will be permanently deleted.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <MenuButton
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="bg-red-600 hover:bg-red-700 border-red-500"
                    >
                        {isLoading ? "Deleting..." : "YES, DELETE MY ACCOUNT"}
                    </MenuButton>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="text-slate-400 hover:text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        No, Keep My Account
                    </button>
                </div>
            </div>
        </div>
    );
};
