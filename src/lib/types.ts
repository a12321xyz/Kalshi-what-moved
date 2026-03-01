/* ── Raw Kalshi API shapes ── */

export interface RawMarket {
    ticker: string;
    event_ticker: string;
    title?: string;
    subtitle?: string;
    yes_sub_title?: string;
    no_sub_title?: string;
    status?: string;
    category?: string;
    close_time?: string;
    open_time?: string;
    updated_time?: string;
    last_price_dollars?: string;
    previous_price_dollars?: string;
    previous_yes_bid_dollars?: string;
    previous_yes_ask_dollars?: string;
    yes_bid_dollars?: string;
    yes_ask_dollars?: string;
    no_bid_dollars?: string;
    no_ask_dollars?: string;
    volume_24h_fp?: string;
    open_interest_fp?: string;
    liquidity_dollars?: string;
    rules_primary?: string;
    rules_secondary?: string;
    result?: string;
}

export interface RawEvent {
    event_ticker: string;
    title: string;
    sub_title?: string;
    category?: string;
    markets?: RawMarket[];
}

export interface EventsResponse {
    events: RawEvent[];
    cursor?: string;
}

export interface MarketsResponse {
    markets: RawMarket[];
    cursor?: string;
}

export interface MarketResponse {
    market: RawMarket;
}

/* ── App domain types ── */

export interface MoverEntry {
    ticker: string;
    eventTicker: string;
    title: string;
    eventTitle: string;
    category: string;
    currentPrice: number;
    previousPrice: number;
    priceDelta: number;
    direction: "up" | "down";
    volume24h: number;
    closeTime: string | null;
    updatedTime: string | null;
    status: string;
}

export interface VolumeLeader {
    ticker: string;
    eventTicker: string;
    title: string;
    eventTitle: string;
    category: string;
    currentPrice: number;
    volume24h: number;
    openInterest: number;
    closeTime: string | null;
}

export interface SettledMarket {
    ticker: string;
    eventTicker: string;
    title: string;
    eventTitle: string;
    category: string;
    result: string;
    lastPrice: number;
    volume24h: number;
}

export interface DigestSummary {
    totalMarkets: number;
    totalMovers: number;
    avgMovePercent: number;
    totalVolume24h: number;
    biggestMover: string | null;
}

export interface DigestSnapshot {
    generatedAt: string;
    summary: DigestSummary;
    movers: MoverEntry[];
    volumeLeaders: VolumeLeader[];
    settledMarkets: SettledMarket[];
}
