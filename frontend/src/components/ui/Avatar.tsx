export const getAvatarUrl = (avatarFileName?: string | null) => {
    if (!avatarFileName || avatarFileName === 'default-avatar.jpg') return null;
    if (avatarFileName.startsWith('http')) return avatarFileName;
    if (avatarFileName.startsWith('/')) return `${import.meta.env.VITE_API_URL}${avatarFileName}`;
    return `${import.meta.env.VITE_API_URL}/uploads/avatars/${avatarFileName}`;
};

interface AvatarProps {
    avatarStr?: string | null;
    className?: string;
    fallbackSize?: string;
}

export const Avatar = ({ avatarStr, className = "w-10 h-10", fallbackSize = "w-6 h-6" }: AvatarProps) => {
    const url = getAvatarUrl(avatarStr);

    return (
        <div className={`flex items-center justify-center overflow-hidden bg-slate-900 shrink-0 ${className}`}>
            {url ? (
                <img src={url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`text-cyan-200/70 ${fallbackSize}`}>
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                </svg>
            )}
        </div>
    );
};
