import { useEffect, useState } from "react";
import TopBar from "../components/TopBar.jsx";
import Header from "../components/Header.jsx";
import http from "../api/http.js";

export default function SearchPodcasts() {
    const [q, setQ] = useState("");
    const [genres, setGenres] = useState([]);
    const [shows, setShows] = useState([]);
    const [episodes, setEpisodes] = useState([]);
    const [selectedShow, setSelectedShow] = useState(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    // Load genres once
    useEffect(() => {
        (async () => {
        try {
            const { data } = await http.get("/genres");
            setGenres(data.genres ?? []);
        } catch {
            /* ignore */
        }
        })();
    }, []);

    // Search shows
    const runShowSearch = async (e) => {
        e?.preventDefault?.();
        setErr("");
        setSelectedShow(null);
        setEpisodes([]);
        if (!q.trim()) return;

        setLoading(true);
        try {
        const { data } = await http.get("/shows/search", {
            params: { q, limit: 12, market: "US" },
        });
        setShows(data?.shows?.items ?? []);
        } catch {
        setErr("Couldn't load shows.");
        setShows([]);
        } finally {
        setLoading(false);
        }
    };

    // Click a genre chip to search
    const searchByGenre = (name) => {
        setQ(name);
        runShowSearch();
    };

    // Load episodes for a given show
    const loadEpisodes = async (show) => {
        setLoading(true);
        setErr("");
        setSelectedShow(show);
        try {
        const { data } = await http.get(`/shows/${show.id}/episodes`, {
            params: { market: "US", limit: 12 },
        });
        setEpisodes(data?.items ?? []);
        } catch {
        setErr("Couldn't load episodes.");
        setEpisodes([]);
        } finally {
        setLoading(false);
        }
    };

    return (
        <>
        <TopBar
            showSearch
            value={q}
            onChange={setQ}
            onSubmit={runShowSearch}
            placeholder="Search for shows…"
        />
        <Header title="Podcasts" />

        <div className="wrap">
            {/* Genres */}
            {genres.length > 0 && (
            <div className="section">
                <h3>Genres</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {genres.slice(0, 24).map((g) => (
                    <button key={g} onClick={() => searchByGenre(g)} aria-label={`Search ${g}`}>
                    {g}
                    </button>
                ))}
                </div>
            </div>
            )}

            {/* Shows */}
            <div className="section">
            <h3>Shows →</h3>
            {err && <p className="sub">{err}</p>}
            {!q && shows.length === 0 && !loading && (
                <p className="sub">Start by typing a query or pick a genre.</p>
            )}
            {q && !loading && shows.length === 0 && (
                <p className="sub">No shows for “{q}”.</p>
            )}
            {loading && <p>Loading…</p>}

            <ul className="grid">
                {shows.map((s) => {
                const img = s.images?.[0]?.url;
                const url = s.external_urls?.spotify;
                return (
                    <li key={s.id} className="card">
                    {img ? <img className="thumb" alt={s.name} src={img} /> : <div className="thumb" />}
                    <div className="meta">
                        <div className="title">{s.name}</div>
                        <div className="kicker">{s.publisher}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <button onClick={() => loadEpisodes(s)}>Episodes</button>
                        {url && (
                            <a href={url} target="_blank" rel="noopener noreferrer">
                            Open in Spotify ↗
                            </a>
                        )}
                        </div>
                    </div>
                    </li>
                );
                })}
            </ul>
            </div>

            {/* Episodes for the selected show */}
            {selectedShow && (
            <div className="section">
                <h3>Episodes — {selectedShow.name} →</h3>
                {loading && episodes.length === 0 && <p>Loading…</p>}
                {!loading && episodes.length === 0 && <p className="sub">No episodes found.</p>}
                <ul className="grid">
                {episodes.map((ep) => {
                    const img = ep.images?.[0]?.url;
                    const url = ep.external_urls?.spotify;
                    return (
                    <li key={ep.id} className="card">
                        {img ? <img className="thumb" alt={ep.name} src={img} /> : <div className="thumb" />}
                        <div className="meta">
                        <div className="title">{ep.name}</div>
                        <div className="kicker">
                            {new Date(ep.release_date ?? Date.now()).toLocaleDateString()}
                        </div>
                        {url && (
                            <div style={{ marginTop: 8 }}>
                            <a href={url} target="_blank" rel="noopener noreferrer">
                                Open in Spotify ↗
                            </a>
                            </div>
                        )}
                        </div>
                    </li>
                    );
                })}
                </ul>
            </div>
            )}
        </div>
        </>
    );
}
