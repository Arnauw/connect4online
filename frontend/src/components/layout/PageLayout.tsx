// import bgImg from "../../assets/imgs/background.png";
import bgImgLandscape from "../../assets/imgs/background-landscape.png";
import type {ReactNode} from "react";

type PageLayoutProps = {
    children: ReactNode;
}

export const PageLayout = ({children}: PageLayoutProps) => {
    return (
        <div
            className="min-h-screen w-full bg-slate-900 text-white overflow-hidden relative"
            style={{
                backgroundImage: `url(${bgImgLandscape})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center bottom',
                backgroundAttachment: 'fixed'
            }}
        >
            {/* Dark Overlay to be sure text is readable */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />

            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};