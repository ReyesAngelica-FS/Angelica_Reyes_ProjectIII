// client/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => ({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Auth + API endpoints (map anything your server exposes)
      "/auth": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
      "/me": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
      "/search": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
      "/genres": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
      "/shows": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
      "/episodes": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
      // catch-all if you also use /api/*
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
    },
  },
}));
