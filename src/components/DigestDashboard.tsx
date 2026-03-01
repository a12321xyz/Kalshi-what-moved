"use client";

import { useCallback, useEffect, useState } from "react";
import type { DigestSnapshot } from "@/lib/types";
import MoverCard from "./MoverCard";
import VolumeCard from "./VolumeCard";
import SettledCard from "./SettledCard";

function formatVolume(v: number): string {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return "just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    return `${Math.floor(min / 60)}h ago`;
}

function getInitialTheme(): string {
    if (typeof window === "undefined") return "dark";
    try {
        const stored = localStorage.getItem("whatmoved-theme");
        if (stored === "dark" || stored === "light") return stored;
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    } catch {
        return "dark";
    }
}

export default function DigestDashboard() {
    const [data, setData] = useState<DigestSnapshot | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState(getInitialTheme);

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
        try {
            const res = await fetch("/api/digest");
            if (!res.ok) throw new Error(`API ${res.status}`);
            const json: DigestSnapshot = await res.json();
            setData(json);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60_000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // ─── Top Header ───
    const header = (
        <header className="top-header">
            <div className="top-header__inner">
                <div style={{ display: "flex", alignItems: "center" }}>
                    <span className="top-header__brand">WhatMoved</span>
                    {data && (
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
                        {theme === "dark" ? "☀️" : (
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

    // ─── Loading ───
    if (loading) {
        return (
            <>
                {header}
                <div className="loading">
                    <div className="loading__spinner" />
                    <div className="loading__text">Loading market data...</div>
                </div>
            </>
        );
    }

    // ─── Error ───
    if (error || !data) {
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
                            {data.summary.avgMovePercent.toFixed(1)}¢
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
                                    <MoverCard mover={m} />
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

                {/* Recently Settled */}
                <div
                    className="section animate-in"
                    style={{ animationDelay: "0.4s" }}
                >
                    <div className="section__header">
                        <span className="section__icon">✅</span>
                        <h2 className="section__title">Recently Settled</h2>
                        <span className="section__count">
                            {data.settledMarkets.length}
                        </span>
                    </div>
                    <div className="cards-grid">
                        {data.settledMarkets.map((s, i) => (
                            <div
                                key={s.ticker}
                                className="animate-in"
                                style={{ animationDelay: `${0.05 * i}s` }}
                            >
                                <SettledCard market={s} />
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="footer">
                <p className="footer__text">
                    Data from{" "}
                    <a
                        href="https://kalshi.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer__link"
                    >
                        Kalshi
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
            </footer>
        </>
    );
}
