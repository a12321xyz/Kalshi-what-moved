import type {
    DigestSnapshot,
    DigestSummary,
    MoverEntry,
    VolumeLeader,
    RawMarket,
    RawEvent,
} from "@/lib/types";
import {
    fetchOpenEventsWithMarkets,
    toNumber,
    toPercent,
} from "@/lib/kalshi";

function marketTitle(m: RawMarket, eventTitle: string): string {
    const sub = m.yes_sub_title || m.subtitle;
    const main = m.title || m.ticker;

    // If the subtitle exists and is different from the event title, use it.
    // Often sub is "Yes" or "No" or a candidate name.
    if (sub && sub.toLowerCase() !== eventTitle.toLowerCase()) {
        return sub;
    }

    // If the main title is different from the event title, use it.
    if (main && main.toLowerCase() !== eventTitle.toLowerCase()) {
        return main;
    }

    // Fallback to the subtitle if it exists (even if it's "Yes"/"No"), 
    // or finally the main title/ticker.
    return sub || main;
}

/**
 * Compute current implied probability (in cents, 0–100 scale).
 *
 * Field guide:
 *  - `last_price`        — integer cents (0–100), already on the right scale
 *  - `last_price_dollars` — decimal string in dollars (e.g. "0.63" → 63¢)
 *  - `yes_bid/ask_dollars` — same dollar format, use midpoint as fallback
 */
function currentProb(m: RawMarket): number | null {
    // last_price is in cents; must be > 0 (0 = worthless/no price)
    if (m.last_price != null && m.last_price > 0) return m.last_price;

    const last = toNumber(m.last_price_dollars);
    if (last !== null && last > 0) return toPercent(last);

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
    const moversByCategory: Record<string, MoverEntry[]> = {};

    for (const event of events) {
        const category = event.category || "General";
        for (const m of event.markets ?? []) {
            if (m.status !== "open" && m.status !== "active") continue;

            const vol = toNumber(m.volume_24h_fp) ?? m.volume_24h ?? 0;
            const curr = currentProb(m);
            if (curr === null || curr <= 0) continue;
            
            // Increased threshold to $25,000 as requested
            if (vol < 25000) continue;

            const prevRaw = toNumber(m.previous_price_dollars);
            const prev = prevRaw !== null ? toPercent(prevRaw) : null;
            if (prev === null) continue;

            const delta = curr - prev;
            if (Math.abs(delta) < 1) continue;

            if (!moversByCategory[category]) moversByCategory[category] = [];
            
            moversByCategory[category].push({
                ticker: m.ticker,
                eventTicker: m.event_ticker,
                title: marketTitle(m, event.title),
                eventTitle: event.title,
                category,
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

    const finalMovers: MoverEntry[] = [];
    for (const category in moversByCategory) {
        const catMovers = moversByCategory[category];
        // Sort by absolute price movement
        catMovers.sort((a, b) => Math.abs(b.priceDelta) - Math.abs(a.priceDelta));
        // Take top 10 of each category
        finalMovers.push(...catMovers.slice(0, 10));
    }

    // Finally sort all resulting movers by absolute delta for general relevance
    return finalMovers.sort((a, b) => Math.abs(b.priceDelta) - Math.abs(a.priceDelta));
}

/* ── Volume leaders ── */

function computeVolumeLeaders(events: RawEvent[]): VolumeLeader[] {
    const leaders: VolumeLeader[] = [];

    for (const event of events) {
        for (const m of event.markets ?? []) {
            // volume_24h_fp is a dollar-denominated string (e.g. "271.27" = $271)
            const vol = toNumber(m.volume_24h_fp) ?? m.volume_24h ?? 0;
            // Only include markets with > $25,000 daily volume
            if (vol < 25000) continue;

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
    return leaders.slice(0, 50);
}

/* ── Build digest snapshot ── */

async function buildFresh(): Promise<DigestSnapshot> {
    console.log("[digest] Starting fresh build...");
    const openEvents = await fetchOpenEventsWithMarkets();

    console.log(`[digest] Fetched ${openEvents.length} open events.`);

    const movers = await computeMovers(openEvents);
    console.log(`[digest] Computed ${movers.length} movers.`);

    const volumeLeaders = computeVolumeLeaders(openEvents);
    console.log(`[digest] Computed ${volumeLeaders.length} volume leaders.`);

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
    };
}

/* ── Cached digest accessor ── */

export async function getDigest(): Promise<DigestSnapshot> {
    // Rely on Vercel's CDN-level Cache-Control for SWR.
    // Internal global variable caching is unreliable on serverless lambdas
    // because background promises are suspended after the response is sent.
    return buildFresh();
}
