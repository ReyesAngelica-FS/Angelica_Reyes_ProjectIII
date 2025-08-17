import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId } from 'mongodb';

const app = express();
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 8080;

/* ----------------------------- MongoDB setup ----------------------------- */
const mongoClient = new MongoClient(process.env.MONGODB_URI);
await mongoClient.connect();
const db = mongoClient.db(); // defaults to DB in URI (pp3)
const Users = db.collection('users');       // {_id, spotifyId, displayName, avatar, spotifyRefreshToken?}
const Sessions = db.collection('sessions'); // {_id, userId, jti, createdAt, expiresAt}

/* --------------------------- Small helper funcs -------------------------- */
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

async function createSessionJWT(userId) {
    const jti = new ObjectId().toString();
    const token = jwt.sign({ sub: userId.toString(), jti }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
    const now = new Date();
    const exp = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await Sessions.insertOne({ userId: new ObjectId(userId), jti, createdAt: now, expiresAt: exp });
    return token;
}

async function authenticateJWT(req, res, next) {
    try {
        const bearer = req.header('Authorization')?.replace('Bearer ', '');
        const raw = req.cookies.app_jwt || bearer;
        if (!raw) return res.status(401).json({ error: 'Missing token' });

        const decoded = jwt.verify(raw, process.env.JWT_SECRET);
        const session = await Sessions.findOne({ jti: decoded.jti, userId: new ObjectId(decoded.sub) });
        if (!session) return res.status(401).json({ error: 'Session revoked' });

        req.user = { id: decoded.sub };
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

/* --------------------------------- Routes -------------------------------- */
app.get('/', (_req, res) => res.send("Welcome to Angelica's Project API 🚀"));

app.get('/health', (_req, res) =>
    res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' })
);

/* ------------------------- Spotify Authorization ------------------------- */
// Step 1: Redirect user to Spotify
app.get('/auth/login', (_req, res) => {
    res.redirect(buildSpotifyAuthURL());
});

// Step 2: Spotify calls back with ?code=
app.get('/auth/callback', async (req, res) => {
    try {
        const code = req.query.code;
        if (!code) return res.status(400).send('Missing code');
        const tokens = await exchangeCodeForTokens(code);

        // Get profile
        const me = await getSpotifyProfile(tokens.access_token);

        // Upsert user
        const existing = await Users.findOne({ spotifyId: me.id });
        let userId;
        if (existing) {
        userId = existing._id;
        await Users.updateOne(
            { _id: existing._id },
            {
            $set: {
                displayName: me.display_name || me.id,
                avatar: me.images?.[0]?.url || null,
            },
            }
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

        // Store refresh token (optional: encrypt at rest)
        if (tokens.refresh_token) {
        await Users.updateOne(
            { _id: userId },
            { $set: { spotifyRefreshToken: tokens.refresh_token } }
        );
        }

        // Create our app JWT + session
        const appJwt = await createSessionJWT(userId);

        // Set httpOnly cookie for convenience (use secure:true on HTTPS)
        res.cookie('app_jwt', appJwt, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false, // set to true in production with HTTPS
        });

        // Done — send user somewhere (for now, home)
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Auth error');
    }
});

// Example protected route
app.get('/me', authenticateJWT, async (req, res) => {
    const user = await Users.findOne(
        { _id: new ObjectId(req.user.id) },
        { projection: { spotifyRefreshToken: 0 } }
    );
    res.json({ user });
});

// Logout = wipe all sessions for the user
app.post('/auth/logout', authenticateJWT, async (req, res) => {
    await Sessions.deleteMany({ userId: new ObjectId(req.user.id) });
    res.clearCookie('app_jwt');
    res.json({ ok: true });
});

// Optional: refresh Spotify access token using stored refresh_token
app.post('/auth/refresh', authenticateJWT, async (req, res) => {
    try {
        const u = await Users.findOne({ _id: new ObjectId(req.user.id) });
        if (!u?.spotifyRefreshToken) return res.status(400).json({ error: 'No refresh token' });

        const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: u.spotifyRefreshToken,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
        });

        const r = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        });
        if (!r.ok) return res.status(400).json({ error: `Refresh failed: ${await r.text()}` });

        const data = await r.json(); // { access_token, expires_in, scope, token_type }
        res.json({ accessToken: data.access_token, expiresIn: data.expires_in });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Refresh error' });
    }
});

/* ------------------------------ 404 handler ------------------------------ */
app.use((req, res) => res.status(404).json({ error: 'Not Found', path: req.originalUrl }));

app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
});
