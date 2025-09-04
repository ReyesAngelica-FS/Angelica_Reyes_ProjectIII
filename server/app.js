import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import spotifyRoutes from "./routes/spotify.js";

const app = express();

// Allow your Vite client
const FRONTEND = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({ origin: FRONTEND, credentials: true }));

// Body parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Simple root + health
app.get("/", (_req, res) => res.send("Welcome to Angelica's Project API 🚀"));
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Routes
app.use(authRoutes);     // /auth/login, /auth/callback, /auth/verify
app.use(spotifyRoutes);  // /me, /genres, /shows/*, /episodes/*

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Not found", path: req.originalUrl });
});

// Error handler
app.use((err, _req, res, _next) => {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({
        error: err.message || "Server error",
        details: err.body,
    });
});

export default app;
