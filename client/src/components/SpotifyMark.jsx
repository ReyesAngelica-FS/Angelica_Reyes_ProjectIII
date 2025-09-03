// client/src/components/SpotifyMark.jsx
export default function SpotifyMark({ size = 28, color = "var(--green)" }) {
    // Uses currentColor for the circle so it follows the 'color' style (pumpkin by default)
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 168 168"
            role="img"
            aria-label="Spotify"
            style={{ color }}              // pumpkin orange via CSS var
        >
            <circle cx="84" cy="84" r="84" fill="currentColor" />
            {/* Sound-wave cuts use the page background to 'knock out' the lines */}
            <path
            fill="var(--bg)"
            d="M120.5 113.6a6 6 0 0 1-8.2 2c-22.5-13.8-50.9-16.9-84.7-9.4a6 6 0 1 1-2.5-11.7
                c36.7-8 68-4.4 93 11.1a6 6 0 0 1 2.4 8zM128.6 91a7 7 0 0 1-9.6 2.3
                c-25.8-15.7-65.2-20.4-95.7-11.4a7 7 0 1 1-3.9-13.4
                c34-10 77-4.8 106.7 13.2a7 7 0 0 1 2.5 9.3zM129.6 67.4a7.8 7.8 0 0 1-10.6 2.7
                C85.7 53 41.4 49.3 19 55.8a7.8 7.8 0 1 1-4.3-15
                C41.2 33.4 89 37.7 121 56.8a7.8 7.8 0 0 1 2.6 10.6z"
            />
        </svg>
    );
}
