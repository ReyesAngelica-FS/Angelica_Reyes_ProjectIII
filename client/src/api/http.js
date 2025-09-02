import axios from "axios";

const http = axios.create({
    baseURL: import.meta.env.VITE_API_BASE || "",
});

// Attach JWT on every request if present
http.interceptors.request.use((config) => {
    const jwt = localStorage.getItem("app_jwt");
    if (jwt) config.headers.Authorization = `Bearer ${jwt}`;
    return config;
});

export default http;
