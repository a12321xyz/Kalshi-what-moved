/**
 * Format a numeric volume as a compact dollar string.
 */
export function formatVolume(v: number): string {
    if (!Number.isFinite(v) || v < 0) return "--";
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${Math.round(v).toLocaleString()}`;
}
