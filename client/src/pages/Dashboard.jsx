import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth.js";
import http from "../api/http.js";

export default function Dashboard() {
    const { logout } = useAuth();
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        let ignore = false;
        (async () => {
        // Your backend should proxy Spotify /me or return your own user doc
        const { data } = await http.get("/me");
        if (!ignore) setProfile(data);
        })();
        return () => { ignore = true; };
    }, []);

    return (
        <section style={{ padding: 24 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>Dashboard</h2>
            <button onClick={logout}>Logout</button>
        </header>

        <pre style={{ marginTop: 16 }}>{JSON.stringify(profile, null, 2)}</pre>
        </section>
    );
}
