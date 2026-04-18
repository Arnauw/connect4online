import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import App from './App.tsx'
import {AuthProvider} from "./context/AuthContext.tsx";

/**
 * App entry point.
 *
 * Path normalization: When someone loads a deep URL like /online/ABC123 directly
 * (e.g. after refreshing), the server serves index.html but the path is wrong.
 * We use HashRouter (/#/route) so the server always gets "/" — but if a bare path
 * slips through, this normalizes it to "/" while preserving the hash fragment.
 */
if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
    const hash = window.location.hash || '#/';
    window.history.replaceState(null, '', '/' + hash);
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        {/* AuthProvider wraps everything so all components can access auth state */}
        <AuthProvider>
            <App/>
        </AuthProvider>
    </StrictMode>,
)
