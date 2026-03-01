import type { SettledMarket } from "@/lib/types";

export default function SettledCard({ market }: { market: SettledMarket }) {
    const isYes = market.result === "Yes";

    return (
        <div className="glass-card settled-card">
            <div className="settled-card__event">{market.eventTitle}</div>
            <div className="settled-card__title">{market.title}</div>
            <span
                className={`settled-card__result ${isYes ? "settled-card__result--yes" : "settled-card__result--no"
                    }`}
            >
                {isYes ? "✓" : "✕"} Settled: {market.result}
            </span>
        </div>
    );
}
