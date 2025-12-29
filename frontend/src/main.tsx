import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import App from './App.tsx'
import {AuthProvider} from "./context/AuthContext.tsx";


// This part is to deal with the fact that /random will still go to homepage without changing the url to /
if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
    const hash = window.location.hash || '#/';
    window.history.replaceState(null, '', '/' + hash);
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AuthProvider>
            <App/>
        </AuthProvider>
    </StrictMode>,
)
