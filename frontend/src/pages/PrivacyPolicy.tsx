import { useNavigate } from "react-router-dom";
import { TopNavButton } from "../components/ui/TopNavButton";

export const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-start min-h-screen p-6 pb-20 gap-8">
            <TopNavButton label="BACK" onClick={() => navigate(-1)} />

            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] mt-12">
                PRIVACY POLICY (GDPR)
            </h1>

            <div className="w-full max-w-4xl bg-slate-900/80 p-6 md:p-10 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-[0_0_30px_rgba(34,211,238,0.1)] text-slate-300 space-y-6 text-sm md:text-base leading-relaxed">
                
                <section>
                    <h2 className="text-xl font-bold text-cyan-400 mb-2">1. Introduction</h2>
                    <p>
                        Welcome to Connect4Online. We are committed to protecting your privacy and ensuring that your personal data is handled in compliance with the General Data Protection Regulation (GDPR). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our application.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-cyan-400 mb-2">2. Data Controller</h2>
                    <p>
                        For the purposes of the GDPR, Connect4Online acts as the Data Controller for the personal data collected through this application. If you have any questions regarding this policy or your privacy, you can contact us at our designated support channels.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-cyan-400 mb-2">3. Data We Collect</h2>
                    <p>We may collect the following types of personal information when you register or interact with the game:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-4 text-slate-400">
                        <li><strong>Account Data:</strong> Username, email address, and encrypted password.</li>
                        <li><strong>Profile Data:</strong> Avatar images and user preferences (e.g., volume, theme).</li>
                        <li><strong>Technical Data:</strong> IP addresses (temporarily for matchmaking/online play), browser type, and device information.</li>
                        <li><strong>Game Data:</strong> Match history, win/loss records, and online statuses.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-cyan-400 mb-2">4. Legal Basis and Purpose of Processing</h2>
                    <p>We process your personal data under the following lawful bases:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-4 text-slate-400">
                        <li><strong>Contractual Necessity:</strong> To provide you with the Connect4Online service, including account creation, multiplayer matchmaking, and saving your preferences.</li>
                        <li><strong>Legitimate Interests:</strong> To maintain the security of our application, prevent fraud, and improve the user experience.</li>
                        <li><strong>Consent:</strong> Where applicable, for storing optional data like non-essential cookies.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-cyan-400 mb-2">5. Data Retention</h2>
                    <p>
                        We retain your personal data only for as long as your account is active or as needed to provide you with the services. If you request account deletion, we will erase your personal data from our active databases, subject to any legal obligations requiring us to retain specific information.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-cyan-400 mb-2">6. Your Rights Under GDPR</h2>
                    <p>As a resident of the European Economic Area (EEA), you have the following rights concerning your personal data:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-4 text-slate-400">
                        <li><strong>Right to Access:</strong> You can request copies of your personal data.</li>
                        <li><strong>Right to Rectification:</strong> You can request that we correct any information you believe is inaccurate.</li>
                        <li><strong>Right to Erasure (Right to be Forgotten):</strong> You have the right to request the deletion of your personal data.</li>
                        <li><strong>Right to Restrict Processing:</strong> You can request that we limit the processing of your data.</li>
                        <li><strong>Right to Data Portability:</strong> You can request that we transfer your data to another organization or directly to you.</li>
                        <li><strong>Right to Object:</strong> You can object to our processing of your personal data.</li>
                    </ul>
                    <p className="mt-2">To exercise any of these rights, please contact our support team or manage your data directly from your Profile settings.</p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-cyan-400 mb-2">7. Cookies and Local Storage</h2>
                    <p>
                        We use strictly necessary cookies and browser local storage to manage user sessions (e.g., JWT authentication tokens) and store local game preferences (volume, themes). Because these are essential for the operation of the service, they do not require explicit consent under GDPR, but we maintain full transparency about their use.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-cyan-400 mb-2">8. Third-Party Data Sharing</h2>
                    <p>
                        We do not sell, trade, or rent your personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification information regarding visitors and users with our business partners and trusted affiliates.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-cyan-400 mb-2">9. Changes to This Privacy Policy</h2>
                    <p>
                        Connect4Online has the discretion to update this privacy policy at any time. When we do, we will revise the updated date at the bottom of this page. We encourage Users to frequently check this page for any changes to stay informed about how we are helping to protect the personal information we collect.
                    </p>
                </section>
                
                <div className="pt-6 border-t border-slate-700 text-sm text-slate-500 text-center">
                    Last Updated: {new Date("2026-04-10").toLocaleDateString()}
                </div>
            </div>
        </div>
    );
};
