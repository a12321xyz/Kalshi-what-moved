import type { VolumeLeader } from "@/lib/types";
import { formatVolume, safeFixed } from "@/lib/format";

export default function VolumeCard({
    leader,
    rank,
}: {
    leader: VolumeLeader;
    rank: number;
}) {
    const price = safeFixed(leader.currentPrice);
    return (
        <a
            href={`https://kalshi.com/markets/${leader.eventTicker}?ticker=${leader.ticker}`}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card volume-card"
            aria-label={`Rank ${rank}: ${leader.title}, volume ${formatVolume(leader.volume24h)}, current price ${price} cents`}
        >
            <div className="volume-card__rank">{rank}</div>

            <div className="volume-card__info">
                <div className="volume-card__event" title={leader.eventTitle}>
                    {leader.eventTitle}
                </div>
                <div className="volume-card__title" title={leader.title}>
                    {leader.title}
                </div>
                <div className="volume-card__meta">
                    <span>Vol: {formatVolume(leader.volume24h)}</span>
                    <span>OI: {formatVolume(leader.openInterest)}</span>
                    <span className="card__category">{leader.category}</span>
                </div>
            </div>

            <div className="volume-card__price">
                <div className="volume-card__price-value" aria-label={`Current price: ${price} cents`}>
                    {price}¢
                </div>
                <div className="volume-card__price-label">current</div>
            </div>
        </a>
    );
}
