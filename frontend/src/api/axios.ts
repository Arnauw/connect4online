import axios from "axios";

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,

    async (error) => {
        if (error.config.url?.includes('/login_check')) {
            return Promise.reject(error);
        }

        const originalRequest = error.config;

        // _retry prevents infinite retry loops on repeated 401s
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = localStorage.getItem("refresh_token");

            if (refreshToken) {
                try {
                    const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/token/refresh`, {
                        refresh_token: refreshToken
                    });

                    const { token, refresh_token: newRefreshToken } = response.data;

                    localStorage.setItem("token", token);
                    localStorage.setItem("refresh_token", newRefreshToken);

                    // Sync AuthContext state with the new token
                    window.dispatchEvent(new CustomEvent("auth_token_refreshed", { detail: token }));

                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);

                } catch (refreshError) {
                    console.error("Session expired.", (refreshError as Error).message);

                    localStorage.removeItem("token");
                    localStorage.removeItem("refresh_token");

                    window.location.href = "/#/login?error=session_expired";
                    return new Promise(() => {}); // swallow it, the page is navigating away
                }
            } else {
                localStorage.removeItem("token");
                window.location.href = "/#/login?error=login_required";
                return new Promise(() => {}); // swallow it, the page is navigating away
            }
        }

        return Promise.reject(error);
    }
);
