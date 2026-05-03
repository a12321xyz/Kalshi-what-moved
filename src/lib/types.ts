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
    last_price?: number;
    last_price_dollars?: string;
    previous_price_dollars?: string;
    previous_yes_bid_dollars?: string;
    previous_yes_ask_dollars?: string;
    yes_bid?: number;
    yes_bid_dollars?: string;
    yes_ask?: number;
    yes_ask_dollars?: string;
    no_bid_dollars?: string;
    no_ask_dollars?: string;
    volume_24h?: number;
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

export interface RawTrade {
    trade_id: string;
    ticker: string;
    yes_price: number;
    yes_price_dollars?: string;
    no_price: number;
    no_price_dollars?: string;
    count: number;
    count_fp?: string;
    taker_side: string;
    created_time: string;
}

export interface TradesResponse {
    trades: RawTrade[];
    cursor?: string;
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

export interface DigestSummary {
    totalMarkets: number;
    totalMovers: number;
    avgMoveCents: number;
    totalVolume24h: number;
    biggestMover: string | null;
}

export interface DigestSnapshot {
    generatedAt: string;
    summary: DigestSummary;
    movers: MoverEntry[];
    volumeLeaders: VolumeLeader[];
}
