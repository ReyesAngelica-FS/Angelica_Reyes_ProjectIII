import jwt from "jsonwebtoken";
import { getValidAccessToken } from "../tokenStore.js";

/**
 * Verifies the app JWT (from Authorization: Bearer <token>)
 * and attaches a fresh Spotify access token to req.user.
 */
export default async function authenticateJWT(req, res, next) {
    try {
        const auth = req.headers.authorization || "";
        const [scheme, token] = auth.split(" ");

        if (!token || (scheme || "").toLowerCase() !== "bearer") {
        return res.status(401).json({ error: "Missing or malformed Authorization header" });
        }

        // Verify app JWT
        const { sub } = jwt.verify(token, process.env.JWT_SECRET); // sub = Spotify user id

        // Get (and refresh if needed) the user's Spotify access token
        const spotifyAccessToken = await getValidAccessToken(sub);
        if (!spotifyAccessToken) {
        return res.status(401).json({ error: "No Spotify tokens for user. Please log in again." });
        }

        // Attach to request for downstream routes
        req.user = { id: sub, spotifyAccessToken };
        return next();
    } catch (err) {
        // JWT expired or invalid, or token refresh failed
        if (err?.name === "TokenExpiredError") {
        return res.status(401).json({ error: "JWT expired" });
        }
        return res.status(401).json({ error: "Invalid token" });
    }
}
