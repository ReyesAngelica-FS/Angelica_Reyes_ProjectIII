import { Router } from "express";
import authenticateJWT from "../middleware/authenticateJWT.js";

const router = Router();

// Small helpers
const spFetch = (token, url) =>
    fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    async function proxyJson(res, r) {
    const data = await r.json().catch(() => ({}));
    return res.status(r.status).json(data);
}

/**
 * GET /me
 * Current user's Spotify profile (used by Header)
 */
router.get("/me", authenticateJWT, async (req, res) => {
    const r = await spFetch(req.user.spotifyAccessToken, "https://api.spotify.com/v1/me");
    return proxyJson(res, r);
});

/**
 * GET /genres
 * Spotify "available genre seeds" (useful for chips/filters)
 * Response: { genres: string[] }
 */
router.get("/genres", authenticateJWT, async (req, res) => {
    const r = await spFetch(
        req.user.spotifyAccessToken,
        "https://api.spotify.com/v1/recommendations/available-genre-seeds"
    );
    return proxyJson(res, r);
});

/**
 * GET /shows/search?q=QUERY&limit=12&offset=0&market=US
 * Search podcast shows
 * Response shape includes { shows: { items: [...] } }
 */
router.get("/shows/search", authenticateJWT, async (req, res) => {
    const { q, limit = 12, offset = 0, market = "US" } = req.query;
    if (!q) return res.status(400).json({ error: "q is required" });

    const params = new URLSearchParams({
        q: String(q),
        type: "show",
        limit: String(Math.max(1, Math.min(50, Number(limit) || 12))),
        offset: String(Math.max(0, Number(offset) || 0)),
        market: String(market || "US"),
    });

    const r = await spFetch(
        req.user.spotifyAccessToken,
        `https://api.spotify.com/v1/search?${params.toString()}`
    );
    return proxyJson(res, r);
});

/**
 * GET /shows/:id?market=US
 * Show details
 */
router.get("/shows/:id", authenticateJWT, async (req, res) => {
    const { market = "US" } = req.query;
    const r = await spFetch(
        req.user.spotifyAccessToken,
        `https://api.spotify.com/v1/shows/${encodeURIComponent(req.params.id)}?market=${encodeURIComponent(
        market
        )}`
    );
    return proxyJson(res, r);
});

/**
 * GET /shows/:id/episodes?limit=20&offset=0&market=US
 * Episodes for a show
 * Response: { items: Episode[] }
 */
router.get("/shows/:id/episodes", authenticateJWT, async (req, res) => {
    const { market = "US", limit = 20, offset = 0 } = req.query;
    const params = new URLSearchParams({
        market: String(market || "US"),
        limit: String(Math.max(1, Math.min(50, Number(limit) || 20))),
        offset: String(Math.max(0, Number(offset) || 0)),
    });

    const r = await spFetch(
        req.user.spotifyAccessToken,
        `https://api.spotify.com/v1/shows/${encodeURIComponent(req.params.id)}/episodes?${params.toString()}`
    );
    return proxyJson(res, r);
});

/**
 * GET /episodes/:id?market=US
 * Single episode details
 */
router.get("/episodes/:id", authenticateJWT, async (req, res) => {
    const { market = "US" } = req.query;
    const r = await spFetch(
        req.user.spotifyAccessToken,
        `https://api.spotify.com/v1/episodes/${encodeURIComponent(req.params.id)}?market=${encodeURIComponent(
        market
        )}`
    );
    return proxyJson(res, r);
});

export default router;
