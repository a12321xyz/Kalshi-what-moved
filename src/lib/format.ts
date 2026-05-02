/**
 * Format a numeric volume as a compact dollar string.
 */
export function formatVolume(v: number): string {
    if (!Number.isFinite(v) || v < 0) return "--";
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${Math.round(v).toLocaleString()}`;
}

export function safeFixed(v: unknown, digits = 1): string {
    if (typeof v !== "number" || !Number.isFinite(v)) return "--";
    return v.toFixed(digits);
}

/**
 * Strips date/series suffixes from Kalshi tickers for URL paths.
 * E.g. "KXUSACOMPANYSTAKE-27JAN01" -> "kxusacompanystake"
 */
export function cleanEventTicker(ticker: string): string {
    if (!ticker) return "";
    // Match the base before the last hyphen if it looks like a date or number
    // Kalshi event URLs generally use the base part.
    // e.g. KXMETGALA -> kxmetgala
    // e.g. KXUSACOMPANYSTAKE-27JAN01 -> kxusacompanystake
    const parts = ticker.split("-");
    if (parts.length > 1) {
        const last = parts[parts.length - 1];
        // If the last part has numbers (date/series), strip it
        if (/\d/.test(last)) {
            return parts.slice(0, -1).join("-").toLowerCase();
        }
    }
    return ticker.toLowerCase();
}
