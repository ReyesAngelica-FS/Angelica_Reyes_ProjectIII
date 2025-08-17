import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// ---- sanity pings ----
app.get('/', (_req, res) => res.send("Welcome to Angelica's Project API 🚀"));
app.get('/health', (_req, res) =>
    res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' })
);

// ---- Spotify Auth (minimal) ----
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

function buildSpotifyAuthURL() {
    const params = new URLSearchParams({
        client_id: process.env.SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI, // http://127.0.0.1:8080/auth/callback
        scope: process.env.SPOTIFY_SCOPES || 'user-read-email user-read-private'
    });
    return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

// 1) start login
app.get('/auth/login', (_req, res) => {
    console.log('→ /auth/login');
    res.redirect(buildSpotifyAuthURL());
});

// 2) oauth callback
app.get('/auth/callback', async (req, res) => {
    try {
        console.log('→ /auth/callback', req.query);
        const code = req.query.code;
        if (!code) return res.status(400).send('Missing code');

        const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET
        });

        const tokenResp = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
        });

        if (!tokenResp.ok) {
        const text = await tokenResp.text();
        console.error('Token exchange failed:', tokenResp.status, text);
        return res.status(400).send('Token exchange failed');
        }

        const tokens = await tokenResp.json();
        const meResp = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        const me = await meResp.json();

        res.send(`
        <h1>Signed in with Spotify ✅</h1>
        <p>User: ${me.display_name || me.id}</p>
        <pre>${JSON.stringify({ scopes: tokens.scope, expires_in: tokens.expires_in }, null, 2)}</pre>
        <a href="/">Back home</a>
        `);
    } catch (err) {
        console.error(err);
        res.status(500).send('Auth error');
    }
});

// 404 + error handlers (optional)
app.use((req, res) => res.status(404).json({ error: 'Not Found', path: req.originalUrl }));

app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
});
