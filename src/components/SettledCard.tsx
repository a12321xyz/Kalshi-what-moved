import type { SettledMarket } from "@/lib/types";
import { safeFixed, cleanEventTicker } from "@/lib/format";

export default function SettledCard({ market }: { market: SettledMarket }) {
    const isYes = market.result === "Yes";

    return (
        <a
            href={`https://kalshi.com/markets/${cleanEventTicker(market.eventTicker)}?ticker=${market.ticker}`}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card settled-card"
            aria-label={`${market.title}: Settled ${market.result}, last price ${safeFixed(market.lastPrice, 0)} cents`}
        >
            {market.eventTitle !== market.title && (
                <div className="settled-card__event" title={market.eventTitle}>
                    {market.eventTitle}
                </div>
            )}
            <div className="settled-card__title" title={market.title}>
                {market.title}
            </div>

            <div className="settled-card__footer">
                <span
                    className={`settled-card__result ${isYes ? "settled-card__result--yes" : "settled-card__result--no"}`}
                >
                    {isYes ? "✓" : "✕"} {market.result}
                </span>
                <span className="settled-card__last-price">
                    Last: {safeFixed(market.lastPrice, 0)}¢
                </span>
                <span className="card__category">{market.category}</span>
            </div>
        </a>
    );
}
