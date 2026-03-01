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

function marketTitle(m: RawMarket): string {
    return m.title || m.yes_sub_title || m.ticker;
}

/**
 * Compute current implied probability from available price fields.
 */
function currentProb(m: RawMarket): number | null {
    const last = toNumber(m.last_price_dollars);
    if (last !== null && last > 0) return toPercent(last);

    const bid = toNumber(m.yes_bid_dollars);
    const ask = toNumber(m.yes_ask_dollars);
    if (bid !== null && ask !== null) return toPercent((bid + ask) / 2);
    if (bid !== null) return toPercent(bid);
    if (ask !== null) return toPercent(ask);
    return null;
}

/**
 * Compute previous implied probability from available previous-price fields.
 */
function previousProb(m: RawMarket): number | null {
    const prev = toNumber(m.previous_price_dollars);
    if (prev !== null && prev > 0) return toPercent(prev);

    const prevBid = toNumber(m.previous_yes_bid_dollars);
    const prevAsk = toNumber(m.previous_yes_ask_dollars);
    if (prevBid !== null && prevAsk !== null) return toPercent((prevBid + prevAsk) / 2);
    if (prevBid !== null) return toPercent(prevBid);
    if (prevAsk !== null) return toPercent(prevAsk);
    return null;
}

/* ── Movers: markets with the biggest price changes ── */

function computeMovers(events: RawEvent[]): MoverEntry[] {
    const movers: MoverEntry[] = [];

    for (const event of events) {
        for (const m of event.markets ?? []) {
            if (m.status !== "open") continue;

            const curr = currentProb(m);
            const prev = previousProb(m);

            if (curr === null || prev === null) continue;

            const delta = curr - prev;

            // Only include markets with meaningful movement (>= 0.5 cent)
            if (Math.abs(delta) < 0.5) continue;

            movers.push({
                ticker: m.ticker,
                eventTicker: m.event_ticker,
                title: marketTitle(m),
                eventTitle: event.title,
                category: event.category || "General",
                currentPrice: curr,
                previousPrice: prev,
                priceDelta: delta,
                direction: delta > 0 ? "up" : "down",
                volume24h: toNumber(m.volume_24h_fp) ?? 0,
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

    return movers.slice(0, 20);
}

/* ── Volume leaders ── */

function computeVolumeLeaders(events: RawEvent[]): VolumeLeader[] {
    const leaders: VolumeLeader[] = [];

    for (const event of events) {
        for (const m of event.markets ?? []) {
            const vol = toNumber(m.volume_24h_fp) ?? 0;
            if (vol <= 0) continue;

            const price = currentProb(m) ?? 50;

            leaders.push({
                ticker: m.ticker,
                eventTicker: m.event_ticker,
                title: marketTitle(m),
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
                title: marketTitle(m),
                eventTitle: event.title,
                category: event.category || "General",
                result: result === "yes" ? "Yes" : result === "no" ? "No" : result,
                lastPrice: lp !== null ? toPercent(lp) : 0,
                volume24h: toNumber(m.volume_24h_fp) ?? 0,
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

    const movers = computeMovers(openEvents);
    const volumeLeaders = computeVolumeLeaders(openEvents);
    const settledMarkets = computeSettled(settledEvents);

    let totalMarkets = 0;
    let totalVol = 0;
    for (const e of openEvents) {
        for (const m of e.markets ?? []) {
            totalMarkets++;
            totalVol += toNumber(m.volume_24h_fp) ?? 0;
        }
    }

    const avgMove =
        movers.length > 0
            ? movers.reduce((s, m) => s + Math.abs(m.priceDelta), 0) / movers.length
            : 0;

    const summary: DigestSummary = {
        totalMarkets,
        totalMovers: movers.length,
        avgMovePercent: Math.round(avgMove * 10) / 10,
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
            inflight = buildFresh()
                .then((d) => {
                    cache = { data: d, expiresAt: Date.now() + CACHE_TTL_MS };
                    return d;
                })
                .catch((err) => {
                    console.error("[digest] Background refresh failed:", err);
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
        const data = await inflight;
        cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
        return data;
    } catch (err) {
        cache = null;
        throw err;
    } finally {
        inflight = null;
    }
}
