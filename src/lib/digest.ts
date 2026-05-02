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
    fetchRecentTrades,
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

/* ── Movers: markets with the biggest trade-price changes ── */

interface CandidateMarket {
    market: RawMarket;
    eventTitle: string;
    category: string;
    currentCents: number;
    volume24h: number;
}

/**
 * Compute movers by fetching recent trades for the most liquid markets
 * and comparing the oldest trade price to the latest trade price.
 */
async function computeMovers(events: RawEvent[]): Promise<MoverEntry[]> {
    // Step 1: collect the most liquid active markets
    const candidates: CandidateMarket[] = [];

    for (const event of events) {
        for (const m of event.markets ?? []) {
            if (m.status !== "open" && m.status !== "active") continue;

            const vol = m.volume_24h ?? (toNumber(m.volume_24h_fp) ?? 0);
            const curr = currentProb(m);
            if (curr === null || curr <= 0) continue;
            if (vol <= 0) continue;

            candidates.push({
                market: m,
                eventTitle: event.title,
                category: event.category || "General",
                currentCents: curr,
                volume24h: vol,
            });
        }
    }

    // Sort by volume descending, take top 50 most liquid
    candidates.sort((a, b) => b.volume24h - a.volume24h);
    const topCandidates = candidates.slice(0, 50);

    if (topCandidates.length === 0) return [];

    // Step 2: fetch recent trades for each in parallel (batched)
    const BATCH_SIZE = 10;
    const movers: MoverEntry[] = [];

    for (let i = 0; i < topCandidates.length; i += BATCH_SIZE) {
        const batch = topCandidates.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
            batch.map(async (c) => {
                const trades = await fetchRecentTrades(c.market.ticker, 20);
                return { candidate: c, trades };
            })
        );

        for (const { candidate, trades } of results) {
            if (trades.length < 2) continue;

            const sorted = [...trades].sort(
                (a, b) => new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
            );
            const oldestPrice = sorted[0].yes_price;
            const newestPrice = sorted[sorted.length - 1].yes_price;

            if (newestPrice <= 0 && oldestPrice <= 0) continue;

            const delta = newestPrice - oldestPrice;

            // Include any market with at least 1¢ movement
            if (Math.abs(delta) < 1) continue;

            movers.push({
                ticker: candidate.market.ticker,
                eventTicker: candidate.market.event_ticker,
                title: marketTitle(candidate.market),
                eventTitle: candidate.eventTitle,
                category: candidate.category,
                currentPrice: newestPrice,
                previousPrice: oldestPrice,
                priceDelta: delta,
                direction: delta > 0 ? "up" : "down",
                volume24h: candidate.volume24h,
                closeTime: candidate.market.close_time ?? null,
                updatedTime: candidate.market.updated_time ?? null,
                status: candidate.market.status ?? "unknown",
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
            const vol = m.volume_24h ?? (toNumber(m.volume_24h_fp) ?? 0);
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
