import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth.js";
import http from "../api/http.js";

function Initials({ name = "User" }) {
    const letters = name
        .split(" ")
        .map((p) => p[0]?.toUpperCase())
        .slice(0, 2)
        .join("");
    return (
        <div
        style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "var(--green)",
            color: "#2b0f02",
            fontWeight: 900,
            fontSize: 12,
        }}
        aria-hidden
        >
        {letters || "🎃"}
        </div>
    );
}

export default function Header({ title = "Dashboard", right = null }) {
    const { logout } = useAuth();
    const [me, setMe] = useState(null);

    useEffect(() => {
        let ignore = false;
        (async () => {
        try {
            const { data } = await http.get("/me"); // your backend should return Spotify profile or user doc
            if (!ignore) setMe(data);
        } catch {
            // ignore failures; header still renders
        }
        })();
        return () => {
        ignore = true;
        };
    }, []);

    const avatarUrl =
        me?.images?.[0]?.url || me?.avatar || me?.picture || null;
    const displayName =
        me?.display_name || me?.name || me?.id || "You";

    return (
        <header
        style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 16px",
            background: "var(--panel)",
            borderBottom: "1px solid var(--border)",
            borderTop: "1px solid var(--border)",
        }}
        >
        {/* Left: Title */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 900 }}>{title}</h2>
            <span style={{ color: "var(--muted)", fontSize: ".9rem" }}>
            Welcome, {displayName}
            </span>
        </div>

        {/* Right: optional actions + profile + logout */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {right}
            {avatarUrl ? (
            <img
                src={avatarUrl}
                alt={`${displayName} avatar`}
                width={32}
                height={32}
                style={{ borderRadius: "50%", objectFit: "cover" }}
            />
            ) : (
            <Initials name={displayName} />
            )}
            <button onClick={logout} aria-label="Log out">
            Logout
            </button>
        </div>
        </header>
    );
}
