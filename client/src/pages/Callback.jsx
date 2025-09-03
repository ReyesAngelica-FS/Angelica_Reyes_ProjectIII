import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth.js";

// Helper: read a param from either ?search or #hash
function readParam(name, search, hash) {
    const qs = new URLSearchParams(search);
    if (qs.has(name)) return qs.get(name);
    if (hash) {
        const hs = new URLSearchParams(hash.replace(/^#/, ""));
        if (hs.has(name)) return hs.get(name);
    }
    return null;
}

export default function Callback() {
    const { loginWithToken } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const token = readParam("token", location.search, location.hash);
        const error = readParam("error", location.search, location.hash);

        if (error) {
        console.error("OAuth error:", error);
        navigate("/login", { replace: true });
        return;
        }

        if (token) {
        loginWithToken(token);
        navigate("/search", { replace: true });
        } else {
        // No token provided → back to login
        navigate("/login", { replace: true });
        }
    }, [location.search, location.hash, loginWithToken, navigate]);

    // Tiny inline status (optional)
    return (
        <div className="center">
        <div className="sub">Signing you in…</div>
        </div>
    );
}
