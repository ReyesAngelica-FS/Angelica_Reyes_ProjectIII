import axios from "axios";

const http = axios.create({
    baseURL: import.meta.env.VITE_API_BASE || "",
    timeout: 15000,
    headers: { "Content-Type": "application/json" },
    });

    // Attach JWT (from localStorage) to every request
    http.interceptors.request.use((config) => {
        const jwt = localStorage.getItem("app_jwt");
        if (jwt) {
            config.headers.Authorization = `Bearer ${jwt}`;
        } else {
            delete config.headers.Authorization;
        }
        return config;
    });

    // If the token is invalid/expired, clear it and send user to /login
    http.interceptors.response.use(
    (res) => res,
    (err) => {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
        try { localStorage.removeItem("app_jwt"); } catch {}
            if (typeof window !== "undefined" && window.location.pathname !== "/login") {
                window.location.replace("/login");
            }
        }
        return Promise.reject(err);
    }
);

export default http;
