import type { MoverEntry } from "@/lib/types";
import { formatVolume, safeFixed } from "@/lib/format";

export default function MoverCard({ mover, rank }: { mover: MoverEntry; rank: number }) {
    const isUp = mover.direction === "up";
    const sign = isUp ? "+" : "";
    const isTop3 = rank <= 3;
    const delta = typeof mover.priceDelta === "number" && Number.isFinite(mover.priceDelta) ? mover.priceDelta : 0;

    return (
        <a
            href={`https://kalshi.com/markets/${mover.eventTicker.toLowerCase()}?ticker=${mover.ticker}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`glass-card mover-card ${isUp ? "mover-card--up" : "mover-card--down"} ${isTop3 ? "mover-card--featured" : ""}`}
            aria-label={`${mover.title}: ${sign}${safeFixed(mover.priceDelta)} cents, current price ${safeFixed(mover.currentPrice)} cents`}
        >
            {isTop3 && (
                <span className="mover-card__rank-badge">
                    {rank === 1 ? "🏆" : rank === 2 ? "🥈" : "🥉"}
                </span>
            )}

            <div className="mover-card__top">
                <div>
                    <div className="mover-card__event" title={mover.eventTitle}>
                        {mover.eventTitle}
                    </div>
                    <div className="mover-card__title" title={mover.title}>
                        {mover.title}
                    </div>
                </div>
                <div className={`mover-card__delta ${isUp ? "mover-card__delta--up" : "mover-card__delta--down"}`}>
                    {sign}{safeFixed(mover.priceDelta)}¢
                </div>
            </div>

            <div className="mover-card__bottom">
                <div className="mover-card__price">
                    <span className="mover-card__current" aria-label={`Current price: ${safeFixed(mover.currentPrice)} cents`}>
                        {safeFixed(mover.currentPrice)}¢
                    </span>
                    <span className="mover-card__arrow" aria-hidden="true">←</span>
                    <span className="mover-card__prev" aria-label={`Previous price: ${safeFixed(mover.previousPrice)} cents`}>
                        {safeFixed(mover.previousPrice)}¢
                    </span>
                </div>
                <div className="mover-card__volume">
                    Vol: {formatVolume(mover.volume24h)}
                </div>
            </div>

            <div className="mover-card__footer">
                <span className="card__category">{mover.category}</span>
                <span className="card__link-hint">View on Kalshi →</span>
            </div>

            <div className="mover-card__bar" aria-hidden="true">
                <div
                    className={`mover-card__bar-fill ${isUp ? "mover-card__bar-fill--up" : "mover-card__bar-fill--down"}`}
                    style={{ width: `${Math.min(Math.abs(delta) * 2, 100)}%` }}
                />
            </div>
        </a>
    );
}
