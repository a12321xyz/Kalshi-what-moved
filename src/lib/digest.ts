import type {
    DigestSnapshot,
    DigestSummary,
    MoverEntry,
    VolumeLeader,
    SettledMarket,
    RawMarket,
    RawEvent,
} from "@/lib/types";
import {
    fetchOpenEventsWithMarkets,
    fetchSettledEvents,
    toNumber,
    toPercent,
} from "@/lib/kalshi";

const CACHE_TTL_MS = 60_000; // 1 minute

let cache: { data: DigestSnapshot; expiresAt: number } | null = null;
let inflight: Promise<DigestSnapshot> | null = null;

function marketTitle(m: RawMarket, eventTitle: string): string {
    const sub = m.yes_sub_title || m.subtitle;
    const main = m.title || m.ticker;

    // If we have a specific option title (Rhode Island, New York, etc), use it
    if (sub) return sub;

    // If the main title is identical to the event title, it doesn't add value
    // but if it's the only thing we have, we use it.
    return main;
}

/**
 * Compute current implied probability from available price fields.
 */
function currentProb(m: RawMarket): number | null {
    // Prefer numeric last_price (cents)
    if (m.last_price != null && m.last_price >= 0) return m.last_price;

    const last = toNumber(m.last_price_dollars);
    if (last !== null && last >= 0) return toPercent(last);

    const bid = toNumber(m.yes_bid_dollars);
    const ask = toNumber(m.yes_ask_dollars);
    if (bid !== null && ask !== null) return toPercent((bid + ask) / 2);
    if (bid !== null) return toPercent(bid);
    if (ask !== null) return toPercent(ask);
    return null;
}

/* ── Movers: markets with the biggest daily price changes ── */

/**
 * Compute movers by comparing the current price to the previous day's price
 * for active markets with sufficient volume.
 */
async function computeMovers(events: RawEvent[]): Promise<MoverEntry[]> {
    const movers: MoverEntry[] = [];

    for (const event of events) {
        for (const m of event.markets ?? []) {
            if (m.status !== "open" && m.status !== "active") continue;

            const vol = m.volume_24h ?? (toNumber(m.volume_24h_fp) ?? 0);
            const curr = currentProb(m);
            if (curr === null || curr <= 0) continue;
            if (vol < 2500) continue;

            const prevRaw = toNumber(m.previous_price_dollars);
            const prev = prevRaw !== null ? toPercent(prevRaw) : null;
            
            // If we don't have a previous price, we can't calculate a daily delta
            if (prev === null) continue;

            const delta = curr - prev;

            // Include any market with at least 1 cent movement
            if (Math.abs(delta) < 1) continue;

            movers.push({
                ticker: m.ticker,
                eventTicker: m.event_ticker,
                title: marketTitle(m, event.title),
                eventTitle: event.title,
                category: event.category || "General",
                currentPrice: curr,
                previousPrice: prev,
                priceDelta: delta,
                direction: delta > 0 ? "up" : "down",
                volume24h: vol,
                closeTime: m.close_time ?? null,
                updatedTime: m.updated_time ?? null,
                status: m.status ?? "unknown",
            });
        }
    }

    movers.sort(
        (a, b) =>
            Math.abs(b.priceDelta) - Math.abs(a.priceDelta) ||
            b.volume24h - a.volume24h
    );

    return movers.slice(0, 100);
}

/* ── Volume leaders ── */

function computeVolumeLeaders(events: RawEvent[]): VolumeLeader[] {
    const leaders: VolumeLeader[] = [];

    for (const event of events) {
        for (const m of event.markets ?? []) {
            const vol = m.volume_24h ?? (toNumber(m.volume_24h_fp) ?? 0);
            if (vol <= 0) continue;

            const price = currentProb(m) ?? 50;

            leaders.push({
                ticker: m.ticker,
                eventTicker: m.event_ticker,
                title: marketTitle(m, event.title),
                eventTitle: event.title,
                category: event.category || "General",
                currentPrice: price,
                volume24h: vol,
                openInterest: toNumber(m.open_interest_fp) ?? 0,
                closeTime: m.close_time ?? null,
            });
        }
    }

    leaders.sort((a, b) => b.volume24h - a.volume24h);
    return leaders.slice(0, 15);
}

/* ── Settled markets ── */

function computeSettled(events: RawEvent[]): SettledMarket[] {
    const settled: SettledMarket[] = [];

    for (const event of events) {
        for (const m of event.markets ?? []) {
            if (m.status !== "settled" && m.status !== "finalized") continue;

            const result = m.result ?? "";
            if (!result) continue;

            const lp = toNumber(m.last_price_dollars);

            settled.push({
                ticker: m.ticker,
                eventTicker: m.event_ticker,
                title: marketTitle(m, event.title),
                eventTitle: event.title,
                category: event.category || "General",
                result: result.toLowerCase() === "yes" ? "Yes" : result.toLowerCase() === "no" ? "No" : result,
                lastPrice: lp !== null ? toPercent(lp) : 0,
                volume24h: m.volume_24h ?? (toNumber(m.volume_24h_fp) ?? 0),
            });
        }
    }

    settled.sort((a, b) => b.volume24h - a.volume24h);
    return settled.slice(0, 12);
}

/* ── Build digest snapshot ── */

async function buildFresh(): Promise<DigestSnapshot> {
    const [openEvents, settledEvents] = await Promise.all([
        fetchOpenEventsWithMarkets(),
        fetchSettledEvents(),
    ]);

    const movers = await computeMovers(openEvents);
    const volumeLeaders = computeVolumeLeaders(openEvents);
    const settledMarkets = computeSettled(settledEvents);

    let totalMarkets = 0;
    let totalVol = 0;
    for (const e of openEvents) {
        for (const m of e.markets ?? []) {
            totalMarkets++;
            totalVol += m.volume_24h ?? (toNumber(m.volume_24h_fp) ?? 0);
        }
    }

    const avgMove =
        movers.length > 0
            ? movers.reduce((s, m) => s + Math.abs(m.priceDelta), 0) / movers.length
            : 0;

    const summary: DigestSummary = {
        totalMarkets,
        totalMovers: movers.length,
        avgMoveCents: Math.round(avgMove * 10) / 10,
        totalVolume24h: totalVol,
        biggestMover: movers[0]?.title ?? null,
    };

    return {
        generatedAt: new Date().toISOString(),
        summary,
        movers,
        volumeLeaders,
        settledMarkets,
    };
}

/* ── Cached digest accessor ── */

export async function getDigest(): Promise<DigestSnapshot> {
    const now = Date.now();

    // Fresh cache
    if (cache && cache.expiresAt > now) return cache.data;

    // Stale-while-revalidate
    if (cache && cache.expiresAt <= now) {
        if (!inflight) {
            const startMs = Date.now();
            inflight = buildFresh()
                .then((d) => {
                    cache = { data: d, expiresAt: startMs + CACHE_TTL_MS };
                    return d;
                })
                .catch((err) => {
                    console.error("[digest] Background refresh failed:", err);
                    if (cache) {
                        cache = { data: cache.data, expiresAt: startMs + CACHE_TTL_MS };
                    }
                    return cache!.data;
                })
                .finally(() => {
                    inflight = null;
                });
        }
        return cache.data;
    }

    // Cold start
    if (!inflight) {
        inflight = buildFresh();
    }

    try {
        const startMs = Date.now();
        const data = await inflight;
        cache = { data, expiresAt: startMs + CACHE_TTL_MS };
        return data;
    } catch (err) {
        cache = null;
        throw err;
    } finally {
        inflight = null;
    }
}
