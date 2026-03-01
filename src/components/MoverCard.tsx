import type { MoverEntry } from "@/lib/types";

function formatVolume(v: number): string {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
}

export default function MoverCard({ mover }: { mover: MoverEntry }) {
    const isUp = mover.direction === "up";
    const sign = isUp ? "+" : "";

    return (
        <div className={`glass-card mover-card ${isUp ? "mover-card--up" : "mover-card--down"}`}>
            <div className="mover-card__top">
                <div>
                    <div className="mover-card__event">{mover.eventTitle}</div>
                    <div className="mover-card__title">{mover.title}</div>
                </div>
                <div className={`mover-card__delta ${isUp ? "mover-card__delta--up" : "mover-card__delta--down"}`}>
                    {sign}{mover.priceDelta.toFixed(1)}¢
                </div>
            </div>

            <div className="mover-card__bottom">
                <div className="mover-card__price">
                    <span className="mover-card__current">{mover.currentPrice.toFixed(1)}¢</span>
                    <span className="mover-card__arrow">←</span>
                    <span className="mover-card__prev">{mover.previousPrice.toFixed(1)}¢</span>
                </div>
                <div className="mover-card__volume">
                    Vol: {formatVolume(mover.volume24h)}
                </div>
            </div>

            <div className="mover-card__bar">
                <div
                    className={`mover-card__bar-fill ${isUp ? "mover-card__bar-fill--up" : "mover-card__bar-fill--down"}`}
                    style={{ width: `${Math.min(Math.abs(mover.priceDelta) * 2, 100)}%` }}
                />
            </div>
        </div>
    );
}
