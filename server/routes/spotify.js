import express from 'express';
import { ObjectId } from 'mongodb';

async function getValidSpotifyAccessToken(Users, userId) {
    const user = await Users.findOne({ _id: new ObjectId(userId) });
    const now = new Date();

    if (user?.spotifyAccessToken && user?.spotifyAccessTokenExpiresAt && now < user.spotifyAccessTokenExpiresAt) {
        return user.spotifyAccessToken;
    }
    if (!user?.spotifyRefreshToken) throw new Error('No Spotify refresh token on file');

    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: user.spotifyRefreshToken,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
    });

    const r = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });
    if (!r.ok) throw new Error(`Spotify refresh failed: ${r.status} ${await r.text()}`);
    const data = await r.json(); // { access_token, expires_in }

    const expiresAt = new Date(Date.now() + (data.expires_in - 30) * 1000);
    await Users.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { spotifyAccessToken: data.access_token, spotifyAccessTokenExpiresAt: expiresAt } }
    );

    return data.access_token;
}

async function spotifyFetch(Users, userId, path, query = {}) {
    const accessToken = await getValidSpotifyAccessToken(Users, userId);
    const url = new URL(`https://api.spotify.com${path}`);
    Object.entries(query).forEach(([k, v]) => { if (v !== undefined) url.searchParams.set(k, v); });

    const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!r.ok) {
        const text = await r.text();
        throw new Error(`Spotify API error ${r.status}: ${text}`);
    }
    return r.json();
}

export default function createSpotifyRouter({ Users }) {
    const router = express.Router();

    // Current Spotify profile
    router.get('/me/profile', async (req, res) => {
        try {
        const data = await spotifyFetch(Users, req.user.id, '/v1/me');
        res.json(data);
        } catch (e) {
        res.status(500).json({ error: e.message });
        }
    });

    // Top tracks
    router.get('/me/top-tracks', async (req, res) => {
        try {
        const { limit = 10, time_range = 'short_term' } = req.query;
        const data = await spotifyFetch(Users, req.user.id, '/v1/me/top/tracks', { limit, time_range });
        res.json(data);
        } catch (e) {
        res.status(500).json({ error: e.message });
        }
    });

    // Playlists
    router.get('/me/playlists', async (req, res) => {
        try {
        const { limit = 20 } = req.query;
        const data = await spotifyFetch(Users, req.user.id, '/v1/me/playlists', { limit });
        res.json(data);
        } catch (e) {
        res.status(500).json({ error: e.message });
        }
    });

    // Search
    router.get('/search', async (req, res) => {
        try {
        const { q, type = 'track', limit = 10, market = 'US' } = req.query;
        if (!q) return res.status(400).json({ error: 'Missing query param q' });
        const data = await spotifyFetch(Users, req.user.id, '/v1/search', { q, type, limit, market });
        res.json(data);
        } catch (e) {
        res.status(500).json({ error: e.message });
        }
    });

    return router;
}
