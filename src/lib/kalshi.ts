import type { EventsResponse, MarketResponse, RawMarket, TradesResponse } from "@/lib/types";

const KALSHI_BASE_URL = "https://api.elections.kalshi.com/trade-api/v2";

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 400;
// Keep well under Vercel's 60s serverless limit.
// Each paginated request gets its own 25s window via AbortController.
const TIMEOUT_MS = 25_000;

async function wait(ms: number): Promise<void> {
    await new Promise((r) => setTimeout(r, ms));
}

export async function requestKalshi<T>(
    path: string,
    query?: Record<string, string | number | boolean>
): Promise<T> {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${KALSHI_BASE_URL}${normalized}`);

    if (query) {
        for (const [k, v] of Object.entries(query)) {
            url.searchParams.set(k, String(v));
        }
    }

    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        let res: Response;
        try {
            res = await fetch(url.toString(), {
                method: "GET",
                headers: { Accept: "application/json" },
                cache: "no-store",
                signal: controller.signal,
            });
        } catch (err) {
            clearTimeout(timeout);
            if (attempt >= MAX_RETRIES) throw err;
            attempt++;
            await wait(RETRY_BASE_MS * attempt);
            continue;
        }

        clearTimeout(timeout);

        if (!res.ok) {
            if (TRANSIENT_STATUSES.has(res.status) && attempt < MAX_RETRIES) {
                attempt++;
                await wait(RETRY_BASE_MS * attempt);
                continue;
            }
            throw new Error(`Kalshi ${res.status} for ${url.pathname}`);
        }

        return (await res.json()) as T;
    }

    throw new Error(`Kalshi failed after retries for ${url.pathname}`);
}

/**
 * Fetch open events with nested markets.
 *
 * Probe results (2025-05-03): Kalshi has ~6,000+ open events / 44,000+ markets.
 * 30 pages takes ~26s avg. We fetch up to 25 pages (~5,000 events) which covers
 * the full active dataset and fits comfortably in the 50s budget (Vercel 60s - 10s).
 */
export async function fetchOpenEventsWithMarkets(): Promise<EventsResponse["events"]> {
    const PAGE_LIMIT = 200;
    const MAX_PAGES = 25; // 25 × 200 = 5,000 events — covers full active dataset in ~22s

    const all: EventsResponse["events"] = [];
    let cursor: string | undefined;

    const functionStartTime = Date.now();
    const TIME_BUDGET_MS = 40_000; // Strict 40s budget to prevent Vercel/client timeouts

    for (let page = 0; page < MAX_PAGES; page++) {
        if (Date.now() - functionStartTime > TIME_BUDGET_MS) {
            console.warn(`[kalshi] Time budget of ${TIME_BUDGET_MS}ms exceeded. Stopping at page ${page}.`);
            break;
        }

        const params: Record<string, string | number | boolean> = {
            status: "open",
            with_nested_markets: true,
            limit: PAGE_LIMIT,
        };
        if (cursor) params.cursor = cursor;

        const t0 = Date.now();
        const res = await requestKalshi<EventsResponse>("/events", params);
        const elapsed = Date.now() - t0;

        if (page === 0) {
            console.log(`[kalshi] First page fetched in ${elapsed}ms (${res.events.length} events)`);
        } else {
            console.log(`[kalshi] Page ${page + 1} fetched in ${elapsed}ms`);
        }

        all.push(...res.events);

        // Stop if there are no more pages
        if (!res.cursor || res.events.length < PAGE_LIMIT) break;
        cursor = res.cursor;
    }

    console.log(`[kalshi] Total events fetched: ${all.length}`);
    return all;
}

export async function fetchSettledEvents(): Promise<EventsResponse["events"]> {
    const res = await requestKalshi<EventsResponse>("/events", {
        status: "settled",
        with_nested_markets: true,
        limit: 50,
    });
    return res.events;
}

export async function fetchMarketDetail(ticker: string): Promise<RawMarket> {
    const res = await requestKalshi<MarketResponse>(
        `/markets/${encodeURIComponent(ticker)}`
    );
    return res.market;
}

export async function fetchRecentTrades(
    ticker: string,
    limit = 20
): Promise<TradesResponse["trades"]> {
    try {
        const res = await requestKalshi<TradesResponse>("/markets/trades", {
            ticker,
            limit,
        });
        return res.trades ?? [];
    } catch (err) {
        console.warn(`[kalshi] Failed to fetch trades for ${ticker}:`, (err as Error).message);
        return [];
    }
}

/* ── Helpers ── */

export function toNumber(v: string | number | null | undefined): number | null {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

export function toPercent(dollarPrice: number): number {
    return Math.min(100, Math.max(0, dollarPrice * 100));
}
