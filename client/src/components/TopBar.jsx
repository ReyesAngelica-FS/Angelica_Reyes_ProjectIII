import SpotifyMark from "./SpotifyMark.jsx";

export default function TopBar({
    showSearch = false,
    value = "",
    onChange,
    onSubmit,
    placeholder = "Search for shows…",
    right = null, // optional slot for actions (e.g., avatar, logout)
    }) {
    const handleSubmit = (e) => {
        e?.preventDefault?.();
        onSubmit?.(e);
    };

    return (
        <div className="topbar">
        <div className="topbar__inner">
            {/* Brand */}
            <div className="brand" aria-label="App brand">
            <SpotifyMark size={28} />
            <span>Spotify</span>
            </div>

            {/* Centered search */}
            <div className="searchwrap">
            {showSearch && (
                <form className="search" role="search" onSubmit={handleSubmit}>
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path
                    d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                    stroke="#073618"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    />
                </svg>
                <input
                    type="search"
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    placeholder={placeholder}
                    aria-label="Search"
                />
                </form>
            )}
            </div>

            {/* Optional right-side content */}
            <div aria-hidden={!right}>{right}</div>
        </div>
        </div>
    );
}
