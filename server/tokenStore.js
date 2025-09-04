// server/tokenStore.js
// In-memory store of Spotify tokens keyed by the Spotify user id.
// NOTE: This resets whenever the server restarts. For production, persist in a DB.

export const tokenStore = new Map();
/*
    tokenStore value shape:
    {
    accessToken: string,
    refreshToken: string | undefined,
    expiresAt: number   // epoch ms
    }
*/

/** Save tokens for a user. `expiresIn` is seconds from Spotify token response. */
export function setSpotifyTokens(spotifyUserId, { accessToken, refreshToken, expiresIn }) {
  const expiresAt = Date.now() + (Number(expiresIn || 3600) * 1000);
    tokenStore.set(spotifyUserId, { accessToken, refreshToken, expiresAt });
}

/** Get raw token record or null. */
export function getTokens(spotifyUserId) {
    return tokenStore.get(spotifyUserId) || null;
}

/** Remove a user's tokens (e.g., on logout). */
export function clearTokens(spotifyUserId) {
    tokenStore.delete(spotifyUserId);
}

/**
 * Get a valid access token for the user.
 * If it's close to expiry and we have a refresh token, refresh it.
 * Returns `null` if we have no record for the user.
 */
export async function getValidAccessToken(spotifyUserId) {
    const rec = tokenStore.get(spotifyUserId);
    if (!rec) return null;

    // If not expiring within 60s, use current token
    const bufferMs = 60_000;
    if (rec.expiresAt && Date.now() < rec.expiresAt - bufferMs) {
        return rec.accessToken;
    }

    // No refresh token? Return what we have (may 401 upstream)
    if (!rec.refreshToken) return rec.accessToken;

    // Try to refresh
    const updated = await refreshTokens(spotifyUserId, rec.refreshToken);
    return updated.accessToken;
}

/** Internal: refresh via Spotify /api/token using refresh_token */
async function refreshTokens(spotifyUserId, refreshToken) {
    const params = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
    });

    const basic = Buffer
        .from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`)
        .toString("base64");

    const resp = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
    });

    const tok = await resp.json();
    if (!resp.ok) {
        const err = new Error("Spotify refresh failed");
        err.status = resp.status;
        err.body = tok;
        throw err;
    }

    // Update store
    const record = tokenStore.get(spotifyUserId) || {};
    record.accessToken = tok.access_token;
    // Spotify may return a new refresh_token; keep the old one if not provided
    record.refreshToken = tok.refresh_token || record.refreshToken;
    record.expiresAt = Date.now() + (Number(tok.expires_in || 3600) * 1000);
    tokenStore.set(spotifyUserId, record);
    return record;
}
