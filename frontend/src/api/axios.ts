/**
 * Axios API Client Configuration
 *
 * This module sets up a configured Axios instance for making HTTP requests
 * to the backend API. It handles:
 * - Automatic JWT token attachment to requests
 * - Centralized base URL configuration
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
        // Proceed with the request
        return config;
    },
    // Handle request errors
    (error) => Promise.reject(error)
);

