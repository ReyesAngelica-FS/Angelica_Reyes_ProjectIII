import { createContext, useEffect, useMemo, useState } from "react";

/* Safely decode a JWT payload */
function parseJwt(token) {
    try {
        const base64 = token.split(".")[1];
        if (!base64) return null;
        const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
        const json = atob(normalized);
        return JSON.parse(decodeURIComponent(escape(json)));
    } catch {
        return null;
    }
}

/**
 * Returns true if the JWT has an exp and is expired
 */
function isExpired(token) {
    const payload = parseJwt(token);
    if (!payload?.exp) return false; // treat as non-expiring if no exp present
    const nowSec = Math.floor(Date.now() / 1000);
    return payload.exp <= nowSec;
}

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
    // Initialize from localStorage but drop expired tokens immediately
    const [token, setToken] = useState(() => {
        const t = localStorage.getItem("app_jwt");
        if (!t) return null;
        if (isExpired(t)) {
        try { localStorage.removeItem("app_jwt"); } catch {}
        return null;
        }
        return t;
    });

    // Loading gate while we optionally validate with the server
    const [loading, setLoading] = useState(false);

    const loginWithToken = (jwt) => {
        try { localStorage.setItem("app_jwt", jwt); } catch {}
        setToken(jwt);
    };

    const logout = () => {
        try { localStorage.removeItem("app_jwt"); } catch {}
        setToken(null);
    };

    // Optional: server-side verify to catch revoked/invalid tokens
    useEffect(() => {
        let ignore = false;

        async function verify() {
            if (!token) return;
            if (isExpired(token)) {
                logout();
                return;
            }
            try {
                setLoading(true);
                const base = import.meta.env.VITE_API_BASE || "";
                const res = await fetch(`${base}/auth/verify`, {
                headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error("invalid");
            } catch {
                logout();
            } finally {
                if (!ignore) setLoading(false);
            }
        }

        verify();
        return () => { ignore = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    // Keep tabs/windows in sync (logout/login everywhere)
    useEffect(() => {
        const onStorage = (e) => {
        if (e.key === "app_jwt") {
                const newToken = e.newValue;
                if (!newToken || isExpired(newToken)) {
                setToken(null);
                } else {
                setToken(newToken);
                }
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const value = useMemo(
        () => ({ token, loading, loginWithToken, logout }),
        [token, loading]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
