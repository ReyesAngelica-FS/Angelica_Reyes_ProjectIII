import { createContext, useEffect, useMemo, useState } from "react";

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem("app_jwt"));
    const [loading, setLoading] = useState(false);

    const loginWithToken = (jwt) => {
        localStorage.setItem("app_jwt", jwt);
        setToken(jwt);
    };

    const logout = () => {
        localStorage.removeItem("app_jwt");
        setToken(null);
    };

    // validate token with backend on mount
    useEffect(() => {
        let ignore = false;
        const validate = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const res = await fetch(`${import.meta.env.VITE_API_BASE}/auth/verify`, {
            headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("invalid token");
        } catch {
            logout();
        } finally {
            if (!ignore) setLoading(false);
        }
        };
        validate();
        return () => { ignore = true; };
    }, [token]);

    const value = useMemo(
        () => ({ token, loading, loginWithToken, logout }),
        [token, loading]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
