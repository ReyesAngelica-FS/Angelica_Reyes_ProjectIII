export default function Login() {
    const connect = () => {
        // Kicks off Spotify OAuth via your backend
        window.location.href = import.meta.env.VITE_SPOTIFY_LOGIN_URL;
    };
    
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
                    <h1>Welcome</h1>
                    <p>Authorize your Spotify account to continue.</p>
                    <button onClick={connect} style={{ padding: "0.75rem 1rem", marginTop: 12 }}>
                        Connect with Spotify
                    </button>
                </div>
            </main>
        );
}
