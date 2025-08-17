import express from 'express';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

function buildSpotifyAuthURL() {
    const params = new URLSearchParams({
        client_id: process.env.SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        scope: process.env.SPOTIFY_SCOPES || 'user-read-email user-read-private',
    });
    return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForTokens(code) {
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
    });

    const r = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });
    if (!r.ok) throw new Error(`Token exchange failed: ${r.status} ${await r.text()}`);
    return r.json(); // { access_token, refresh_token, expires_in, scope, token_type }
}

async function getSpotifyProfile(accessToken) {
    const r = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) throw new Error(`/v1/me failed: ${r.status} ${await r.text()}`);
    return r.json();
}

async function saveSpotifyAccessToken(Users, userId, accessToken, expiresInSeconds) {
  const expiresAt = new Date(Date.now() + (expiresInSeconds - 30) * 1000); // safety buffer
    await Users.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { spotifyAccessToken: accessToken, spotifyAccessTokenExpiresAt: expiresAt } }
    );
}

async function createSessionJWT(Sessions, userId) {
    const jti = new ObjectId().toString();
    const token = jwt.sign({ sub: userId.toString(), jti }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    const now = new Date();
    const exp = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await Sessions.insertOne({ userId: new ObjectId(userId), jti, createdAt: now, expiresAt: exp });

    return token;
}

export default function createAuthRouter({ Users, Sessions }) {
    const router = express.Router();

    // Start login
    router.get('/login', (_req, res) => {
        res.redirect(buildSpotifyAuthURL());
    });

    // OAuth callback
    router.get('/callback', async (req, res) => {
        try {
        const code = req.query.code;
        if (!code) return res.status(400).send('Missing code');

        const tokens = await exchangeCodeForTokens(code);
        const me = await getSpotifyProfile(tokens.access_token);

        // Upsert user
        const existing = await Users.findOne({ spotifyId: me.id });
        let userId;
        if (existing) {
            userId = existing._id;
            await Users.updateOne(
            { _id: existing._id },
            { $set: { displayName: me.display_name || me.id, avatar: me.images?.[0]?.url || null } }
            );
        } else {
            const r = await Users.insertOne({
            spotifyId: me.id,
            displayName: me.display_name || me.id,
            avatar: me.images?.[0]?.url || null,
            createdAt: new Date(),
            });
            userId = r.insertedId;
        }

        // Persist refresh token & cache access token
        if (tokens.refresh_token) {
            await Users.updateOne({ _id: userId }, { $set: { spotifyRefreshToken: tokens.refresh_token } });
        }
        await saveSpotifyAccessToken(Users, userId, tokens.access_token, tokens.expires_in);

        // Issue app JWT + session
        const appJwt = await createSessionJWT(Sessions, userId);
        res.cookie('app_jwt', appJwt, { httpOnly: true, sameSite: 'lax', secure: false });

        res.redirect('/');
        } catch (err) {
        console.error(err);
        res.status(500).send('Auth error');
        }
    });

    // Auth status: true/false + needsSpotifyLogin
    router.get('/status', async (req, res) => {
        try {
        const bearer = req.header('Authorization')?.replace('Bearer ', '');
        const raw = req.cookies?.app_jwt || bearer;
        if (!raw) return res.json({ authenticated: false, needsSpotifyLogin: true });

        let decoded;
        try {
            decoded = jwt.verify(raw, process.env.JWT_SECRET);
        } catch {
            return res.json({ authenticated: false, needsSpotifyLogin: true });
        }

        const session = await Sessions.findOne({ jti: decoded.jti, userId: new ObjectId(decoded.sub) });
        if (!session) return res.json({ authenticated: false, needsSpotifyLogin: true });

        const user = await Users.findOne({ _id: new ObjectId(decoded.sub) }, { projection: { spotifyRefreshToken: 1 } });
        const needsSpotifyLogin = !user?.spotifyRefreshToken;

        res.json({ authenticated: true, needsSpotifyLogin, userId: decoded.sub, sessionJti: decoded.jti });
        } catch {
        res.json({ authenticated: false, needsSpotifyLogin: true });
        }
    });

    // Rotate app JWT (renew)
    router.post('/renew', async (req, res) => {
        try {
        const bearer = req.header('Authorization')?.replace('Bearer ', '');
        const raw = req.cookies?.app_jwt || bearer;
        if (!raw) return res.status(401).json({ error: 'Missing token' });

        const decoded = jwt.verify(raw, process.env.JWT_SECRET);
        await Sessions.deleteOne({ jti: decoded.jti, userId: new ObjectId(decoded.sub) }).catch(() => {});
        const newJwt = await createSessionJWT(Sessions, decoded.sub);

        res.cookie('app_jwt', newJwt, { httpOnly: true, sameSite: 'lax', secure: false });
        res.json({ ok: true });
        } catch (e) {
        res.status(401).json({ error: 'Cannot renew token' });
        }
    });

    // Logout
    router.post('/logout', async (req, res) => {
        try {
        const bearer = req.header('Authorization')?.replace('Bearer ', '');
        const raw = req.cookies?.app_jwt || bearer;
        if (!raw) return res.json({ ok: true });

        const decoded = jwt.verify(raw, process.env.JWT_SECRET);
        await Sessions.deleteMany({ userId: new ObjectId(decoded.sub) });
        res.clearCookie('app_jwt');
        res.json({ ok: true });
        } catch {
        res.json({ ok: true });
        }
    });

    // Manual refresh (optional test endpoint)
    router.post('/refresh', async (req, res) => {
        try {
        const bearer = req.header('Authorization')?.replace('Bearer ', '');
        const raw = req.cookies?.app_jwt || bearer;
        if (!raw) return res.status(401).json({ error: 'Missing token' });

        const decoded = jwt.verify(raw, process.env.JWT_SECRET);
        const user = await Users.findOne({ _id: new ObjectId(decoded.sub) });
        if (!user?.spotifyRefreshToken) return res.status(400).json({ error: 'No refresh token' });

        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: user.spotifyRefreshToken,
            client_id: process.env.SPOTIFY_CLIENT_ID,
            client_secret: process.env.SPOTIFY_CLIENT_SECRET,
        });

        const r = await fetch(SPOTIFY_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });
        if (!r.ok) return res.status(400).json({ error: `Refresh failed: ${await r.text()}` });

        const data = await r.json(); // { access_token, expires_in, ... }
        // Cache new access token
        await saveSpotifyAccessToken(Users, decoded.sub, data.access_token, data.expires_in);
        res.json({ accessToken: data.access_token, expiresIn: data.expires_in });
        } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Refresh error' });
        }
    });

    return router;
}
