/**
 * Axios API Client Configuration
 *
 * This module sets up a configured Axios instance for making HTTP requests
 * to the backend API. It handles:
 * - Automatic JWT token attachment to requests
 * - Automatic token refresh when tokens expire
 * - Centralized error handling
 *
 * Token Flow:
 * 1. Login provides: access token (short-lived) + refresh token (long-lived)
 * 2. Access token used for all API requests
 * 3. When access token expires (401), refresh token is used to get new tokens
 * 4. If refresh token fails, user is redirected to login
 */

import axios from "axios";

/**
 * Create a configured Axios instance
 * - baseURL: Points to the backend API (configured in .env file)
 * - headers: All requests send JSON by default
 */
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,  // e.g., http://localhost:8000
    headers: {
        "Content-Type": "application/json",
    },
});

/**
 * REQUEST INTERCEPTOR
 *
 * Runs before every API request is sent.
 * Automatically attaches the JWT access token from localStorage to the
 * Authorization header if it exists.
 *
 * This means you don't need to manually add the token to every API call.
 */
api.interceptors.request.use(
    (config) => {
        // Get the JWT token from localStorage
        const token = localStorage.getItem("token");

        // If token exists, add it to the Authorization header
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;  // Proceed with the request
    },
    (error) => Promise.reject(error)  // Handle request errors
);

/**
 * RESPONSE INTERCEPTOR
 *
 * Runs after every API response is received.
 * Handles automatic token refresh when the access token expires.
 *
 * Token Refresh Flow:
 * 1. Request fails with 401 Unauthorized (token expired)
 * 2. Use refresh_token to request new tokens from /api/token/refresh
 * 3. Save new tokens to localStorage
 * 4. Notify React context that tokens updated (custom event)
 * 5. Retry the original failed request with new token
 * 6. If refresh fails, redirect user to login page
 */
api.interceptors.response.use(
    // Success case - just return the response
    (response) => response,

    // Error case - handle 401 errors with token refresh
    async (error) => {
        // Special case: Don't try to refresh on login failures
        // (would cause infinite loop if credentials are wrong)
        if (error.config.url?.includes('/login_check')) {
            return Promise.reject(error);
        }

        const originalRequest = error.config;

        // Check if this is a 401 error and we haven't already retried
        // _retry flag prevents infinite retry loops
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;  // Mark that we're attempting a retry

            // Get the refresh token from localStorage
            const refreshToken = localStorage.getItem("refresh_token");

            if (refreshToken) {
                try {
                    // Request new tokens using the refresh token
                    const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/token/refresh`, {
                        refresh_token: refreshToken
                    });

                    // Extract new tokens from response
                    const { token, refresh_token: newRefreshToken } = response.data;

                    // Save new tokens to localStorage
                    localStorage.setItem("token", token);
                    localStorage.setItem("refresh_token", newRefreshToken);

                    // CRITICAL: Notify the React AuthContext that tokens were refreshed
                    // This ensures the context state stays in sync with localStorage
                    window.dispatchEvent(new CustomEvent("auth_token_refreshed", { detail: token }));

                    // Update the Authorization header of the original failed request
                    originalRequest.headers.Authorization = `Bearer ${token}`;

                    // Retry the original request with the new token
                    return api(originalRequest);

                } catch (refreshError) {
                    // Refresh token is also expired or invalid
                    console.error("Session expired.", (refreshError as Error).message);

                    localStorage.removeItem("token");
                    localStorage.removeItem("refresh_token");

                    window.location.href = "/#/login?error=session_expired";
                    return new Promise(() => {}); // swallow — page is navigating away
                }
            } else {
                // No token at all — user was never logged in
                localStorage.removeItem("token");
                window.location.href = "/#/login?error=login_required";
                return new Promise(() => {}); // swallow — page is navigating away
            }
        }

        // For all other errors, reject the promise
        return Promise.reject(error);
    }
);
