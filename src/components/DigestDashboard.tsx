"use client";

import { useCallback, useEffect, useState } from "react";
import type { DigestSnapshot } from "@/lib/types";
import { formatVolume, safeFixed } from "@/lib/format";
import MoverCard from "./MoverCard";
import VolumeCard from "./VolumeCard";

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 0) return "just now";
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return "just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    return `${Math.floor(min / 60)}h ago`;
}

/* ── Skeleton placeholders ── */

function SkeletonStatCards() {
    return (
        <div className="stats animate-in" style={{ animationDelay: "0.1s" }}>
            {[0, 1, 2, 3].map((i) => (
                <div key={i} className="stat-card skeleton-card">
                    <div className="skeleton skeleton--value" />
                    <div className="skeleton skeleton--label" />
                </div>
            ))}
        </div>
    );
}

function SkeletonCards({ count }: { count: number }) {
    return (
        <div className="cards-grid">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="glass-card skeleton-card">
                    <div className="skeleton skeleton--line-short" />
                    <div className="skeleton skeleton--line-long" />
                    <div className="skeleton skeleton--line-medium" style={{ marginTop: 12 }} />
                </div>
            ))}
        </div>
    );
}

/* ── Scroll-to-top button ── */

function ScrollToTop() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        function onScroll() {
            setVisible(window.scrollY > 400);
        }
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    if (!visible) return null;

    return (
        <button
            className="scroll-top"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Scroll to top"
            title="Back to top"
        >
            ↑
        </button>
    );
}

/* ── Main Dashboard ── */

export default function DigestDashboard() {
    const [data, setData] = useState<DigestSnapshot | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState("dark");
    const [dismissedError, setDismissedError] = useState(false);
    const [slowLoad, setSlowLoad] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Resolve actual theme on mount (avoids SSR hydration mismatch)
    useEffect(() => {
        setMounted(true);
        try {
            const stored = localStorage.getItem("whatmoved-theme");
            if (stored === "dark" || stored === "light") {
                setTheme(stored);
            } else if (!window.matchMedia("(prefers-color-scheme: dark)").matches) {
                setTheme("light");
            }
        } catch { /* use default */ }
    }, []);

    // Theme management
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((t) => {
            const next = t === "dark" ? "light" : "dark";
            try {
                localStorage.setItem("whatmoved-theme", next);
            } catch { }
            return next;
        });
    }, []);

    // Data fetching
    const fetchData = useCallback(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 55_000);
        try {
            const res = await fetch("/api/digest", { signal: controller.signal });
            if (!res.ok) throw new Error(`API ${res.status}`);
            const json: DigestSnapshot = await res.json();
            setData(json);
            setError(null);
            setDismissedError(false);
            setSlowLoad(false);
        } catch (err) {
            const message = (err instanceof Error && err.name === "AbortError")
                ? "Request timed out — Kalshi API may be slow. Trying again soon."
                : err instanceof Error ? err.message : "Failed to load data";
            setError(message);
            setDismissedError(false);
        } finally {
            clearTimeout(timer);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Slow-load hint: show a message if the first load takes > 8s
        const slowTimer = setTimeout(() => setSlowLoad(true), 8_000);
        fetchData().finally(() => clearTimeout(slowTimer));

        // Poll every 60 seconds for fresh data
        const interval = setInterval(fetchData, 60_000);
        return () => {
            clearInterval(interval);
            clearTimeout(slowTimer);
        };
        // fetchData is stable (wrapped in useCallback with no deps)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Top Header ───
    const header = (
        <header className="top-header">
            <div className="top-header__inner">
                <div style={{ display: "flex", alignItems: "center" }}>
                    <span className="top-header__brand">WhatMoved</span>
                    {data && mounted && (
                        <span className="top-header__badge">
                            <span className="top-header__badge-dot" />
                            Updated {timeAgo(data.generatedAt)}
                        </span>
                    )}
                </div>

                <div className="top-header__right">
                    <button
                        className="top-header__theme-btn"
                        onClick={toggleTheme}
                        aria-label={
                            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
                        }
                        title={theme === "dark" ? "Light mode" : "Dark mode"}
                    >
                        {!mounted ? null : theme === "dark" ? "☀️" : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>

                    <a
                        href="https://x.com/a12321xyz"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="top-header__profile-link"
                        aria-label="a12321xyz on X"
                        title="Follow on X"
                    >
                        <img
                            src="/images/profile.png"
                            alt="Amar"
                            className="top-header__avatar"
                        />
                        <span>
                            <span className="top-header__name">Amar</span>
                            <br />
                            <span className="top-header__handle">@a12321xyz</span>
                        </span>
                    </a>
                </div>
            </div>
        </header>
    );

    // ─── Loading (Skeleton) ───
    if (loading) {
        return (
            <>
                {header}
                <main className="container" style={{ paddingBottom: 40 }}>
                    <div className="hero animate-in">
                        <h1 className="hero__title">
                            <span className="hero__title-accent">What Moved</span> Today
                        </h1>
                        <p className="hero__tagline">
                            Daily prediction market movers — powered by Kalshi
                        </p>
                    </div>
                    <SkeletonStatCards />
                    <div className="section animate-in" style={{ animationDelay: "0.2s" }}>
                        <div className="section__header">
                            <span className="section__icon">🔥</span>
                            <h2 className="section__title">Top Movers</h2>
                        </div>
                        <SkeletonCards count={6} />
                    </div>
                    <div className="section animate-in" style={{ animationDelay: "0.3s" }}>
                        <div className="section__header">
                            <span className="section__icon">📊</span>
                            <h2 className="section__title">Volume Leaders</h2>
                        </div>
                        <SkeletonCards count={3} />
                    </div>

                    {slowLoad && (
                        <div className="loading-hint animate-in">
                            <div className="loading-hint__spinner" />
                            <span>Fetching live Kalshi data — this may take a moment on first load&hellip;</span>
                        </div>
                    )}
                </main>
            </>
        );
    }

    const showErrorBanner = !!error && !!data && !dismissedError;

    // ─── Full-screen error (no data available at all) ───
    if (!data) {
        return (
            <>
                {header}
                <div className="error">
                    <div className="error__icon">⚠️</div>
                    <div className="error__title">Unable to Load Data</div>
                    <div className="error__message">{error ?? "Unknown error"}</div>
                    <button className="error__retry" onClick={fetchData}>
                        Try Again
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            {header}

            <main className="container" style={{ paddingBottom: 40 }}>
                {showErrorBanner && (
                    <div className="error-banner animate-in">
                        <span>⚠️ Refresh failed — showing cached data</span>
                        <button
                            className="error-banner__dismiss"
                            onClick={() => { setDismissedError(true); setError(null); }}
                            aria-label="Dismiss error"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Hero */}
                <div className="hero animate-in">
                    <h1 className="hero__title">
                        <span className="hero__title-accent">What Moved</span> Today
                    </h1>
                    <p className="hero__tagline">
                        Daily prediction market movers — powered by Kalshi
                    </p>
                </div>

                {/* Summary Stats */}
                <div
                    className="stats animate-in"
                    style={{ animationDelay: "0.1s" }}
                >
                    <div className="stat-card">
                        <div className="stat-card__value">
                            {data.summary.totalMovers}
                        </div>
                        <div className="stat-card__label">Markets Moved</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__value">
                            {safeFixed(data.summary.avgMoveCents)}¢
                        </div>
                        <div className="stat-card__label">Avg. Move</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__value">
                            {formatVolume(data.summary.totalVolume24h)}
                        </div>
                        <div className="stat-card__label">24h Volume</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__value">
                            {data.summary.totalMarkets.toLocaleString()}
                        </div>
                        <div className="stat-card__label">Total Markets</div>
                    </div>
                </div>

                {/* Top Movers */}
                <div
                    className="section animate-in"
                    style={{ animationDelay: "0.2s" }}
                >
                    <div className="section__header">
                        <span className="section__icon">🔥</span>
                        <h2 className="section__title">Top Movers</h2>
                        <span className="section__count">{data.movers.length}</span>
                    </div>
                    {data.movers.length > 0 ? (
                        <div className="cards-grid">
                            {data.movers.map((m, i) => (
                                <div
                                    key={m.ticker}
                                    className="animate-in"
                                    style={{ animationDelay: `${0.05 * i}s` }}
                                >
                                    <MoverCard mover={m} rank={i + 1} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty">No significant movers right now.</div>
                    )}
                </div>

                {/* Volume Leaders */}
                <div
                    className="section animate-in"
                    style={{ animationDelay: "0.3s" }}
                >
                    <div className="section__header">
                        <span className="section__icon">📊</span>
                        <h2 className="section__title">Volume Leaders</h2>
                        <span className="section__count">
                            {data.volumeLeaders.length}
                        </span>
                    </div>
                    <div className="cards-grid">
                        {data.volumeLeaders.map((v, i) => (
                            <div
                                key={v.ticker}
                                className="animate-in"
                                style={{ animationDelay: `${0.05 * i}s` }}
                            >
                                <VolumeCard leader={v} rank={i + 1} />
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="footer">
                <div className="footer__inner">
                    <p className="footer__brand">WhatMoved</p>
                    <p className="footer__desc">
                        Daily snapshot of the biggest prediction market movers and volume leaders. Data refreshes every 60 seconds.
                    </p>
                    <p className="footer__links">
                        Data from{" "}
                        <a
                            href="https://kalshi.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="footer__link"
                        >
                            Kalshi
                        </a>{" "}
                        · Powered by the{" "}
                        <a
                            href="https://trading-api.readme.io/reference/getevents"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="footer__link"
                        >
                            Kalshi API
                        </a>{" "}
                        · Built by{" "}
                        <a
                            href="https://x.com/a12321xyz"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="footer__link"
                        >
                            @a12321xyz
                        </a>
                    </p>
                    <p className="footer__disclaimer">
                        Not financial advice. For informational purposes only.
                    </p>
                </div>
            </footer>

            <ScrollToTop />
        </>
    );
}
