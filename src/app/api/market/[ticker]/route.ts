import { NextResponse } from "next/server";
import { fetchMarketDetail, toNumber, toPercent } from "@/lib/kalshi";

export const dynamic = "force-dynamic";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ ticker: string }> }
) {
    const { ticker } = await params;

    try {
        const m = await fetchMarketDetail(ticker);
        const last = toNumber(m.last_price_dollars);
        const prev = toNumber(m.previous_price_dollars);

        return NextResponse.json({
            ticker: m.ticker,
            eventTicker: m.event_ticker,
            title: m.title ?? m.ticker,
            status: m.status ?? "unknown",
            currentPrice: last !== null ? toPercent(last) : null,
            previousPrice: prev !== null ? toPercent(prev) : null,
            volume24h: toNumber(m.volume_24h_fp) ?? 0,
            openInterest: toNumber(m.open_interest_fp) ?? 0,
            closeTime: m.close_time ?? null,
            result: m.result ?? null,
            rulesPrimary: m.rules_primary ?? "",
        });
    } catch (err) {
        console.error(`[api/market/${ticker}]`, err);
        return NextResponse.json(
            { error: "Market not found" },
            { status: 404 }
        );
    }
}
