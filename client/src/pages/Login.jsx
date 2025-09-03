// client/src/pages/Login.jsx
import { Navigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import SpotifyMark from "../components/SpotifyMark.jsx";
import { useAuth } from "../auth/useAuth.js";

export default function Login() {
    const { token } = useAuth();

    // If already authenticated, skip login page
    if (token) return <Navigate to="/search" replace />;

    const loginUrl = import.meta.env.VITE_SPOTIFY_LOGIN_URL || "/auth/login";
    const handleConnect = () => {
        window.location.href = loginUrl; // kicks off OAuth via your backend
    };

    return (
        <>
        <TopBar />
        <div className="center">
            <div className="login-card">
            <div style={{ display: "grid", placeItems: "center", gap: 10 }}>
                <SpotifyMark size={44} />
                <div className="login-title">Please Login</div>
                <div className="sub">
                To search shows and episodes, connect your Spotify account.
                </div>
            </div>
            <div style={{ display: "grid", placeItems: "center", marginTop: 6 }}>
                <button onClick={handleConnect} aria-label="Login with Spotify">
                Connect with Spotify
                </button>
            </div>
            </div>
        </div>
        </>
    );
}
