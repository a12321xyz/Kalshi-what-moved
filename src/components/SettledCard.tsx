import type { SettledMarket } from "@/lib/types";

export default function SettledCard({ market }: { market: SettledMarket }) {
    const isYes = market.result === "Yes";
    const showEventTitle = market.eventTitle !== market.title;
    const lastPriceAvailable = typeof market.lastPrice === "number" && !isNaN(market.lastPrice);

    return (
        <a
            href={`https://kalshi.com/markets/${market.ticker}`}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card settled-card"
            aria-label={`${market.title}: Settled ${market.result}, last price ${market.lastPrice} cents`}
        >
            {showEventTitle && (
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
                {lastPriceAvailable && (
                    <span className="settled-card__last-price">
                        Last: {market.lastPrice.toFixed(0)}¢
                    </span>
                )}
                <span className="card__category">{market.category}</span>
            </div>
        </a>
    );
}
