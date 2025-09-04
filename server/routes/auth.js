import { Router } from "express";
import jwt from "jsonwebtoken";
import { setSpotifyTokens } from "../tokenStore.js";

const router = Router();

const {
    SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET,
    SPOTIFY_REDIRECT_URI,   // e.g. http://127.0.0.1:8080/auth/callback
    FRONTEND_URL,           // e.g. http://localhost:5173
    JWT_SECRET,
    JWT_EXPIRES_IN = "7d",
} = process.env;

// Step 1: send user to Spotify
router.get("/auth/login", (_req, res) => {
    const SCOPES = [
        "user-read-email",
        "user-read-private",
    ].join(" ");

    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: "code",
        redirect_uri: SPOTIFY_REDIRECT_URI,
        scope: SCOPES,
    });

    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

// Step 2: Spotify redirects back to server with ?code=
router.get("/auth/callback", async (req, res, next) => {
    try {
        const { code, error } = req.query;
        if (error) {
        return res.redirect(
            `${FRONTEND_URL}/callback?error=${encodeURIComponent(error)}`
        );
        }
        if (!code) return res.status(400).send("Missing code");

        // Exchange code for tokens
        const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        });
        const basic = Buffer
        .from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)
        .toString("base64");

        const tokRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            Authorization: `Basic ${basic}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        });
        const tok = await tokRes.json();
        if (!tokRes.ok) {
        return res.redirect(
            `${FRONTEND_URL}/callback?error=${encodeURIComponent(tok.error_description || "token_exchange_failed")}`
        );
        }

        // Identify user
        const meRes = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${tok.access_token}` },
        });
        const me = await meRes.json();
        if (!meRes.ok || !me?.id) {
        return res.redirect(
            `${FRONTEND_URL}/callback?error=${encodeURIComponent("profile_lookup_failed")}`
        );
        }

        // Store Spotify tokens (in-memory for class)
        setSpotifyTokens(me.id, {
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token,
        expiresIn: tok.expires_in, // seconds
        });

        // Mint app JWT (sub = Spotify user id)
        const appJwt = jwt.sign({ sub: me.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        // IMPORTANT: redirect to frontend **/callback** (NOT /auth/callback)
        return res.redirect(`${FRONTEND_URL}/callback?token=${encodeURIComponent(appJwt)}`);
    } catch (e) {
        next(e);
    }
});

// Optional: client uses this to validate its JWT
router.get("/auth/verify", (req, res) => {
    try {
        const hdr = req.headers.authorization || "";
        const [, token] = hdr.split(" ");
        if (!token) return res.status(401).json({ ok: false, error: "missing" });
        jwt.verify(token, JWT_SECRET);
        return res.json({ ok: true });
    } catch {
        return res.status(401).json({ ok: false, error: "invalid" });
    }
});

export default router;
