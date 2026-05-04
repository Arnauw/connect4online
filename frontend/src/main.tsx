import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import App from './App.tsx'
import {AuthProvider} from "./context/AuthContext.tsx";
import {LocalGameContext} from "./context/LocalGameContext.tsx";

// HashRouter requires "/" as the pathname; normalize bare deep paths on direct load
if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
    const hash = window.location.hash || '#/';
    window.history.replaceState(null, '', '/' + hash);
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AuthProvider>
            <LocalGameContext>
                <App/>
            </LocalGameContext>
        </AuthProvider>
    </StrictMode>,
)
