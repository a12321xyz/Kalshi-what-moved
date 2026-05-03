import type { VolumeLeader } from "@/lib/types";
import { formatVolume, safeFixed, cleanEventTicker } from "@/lib/format";

export default function VolumeCard({ leader, rank }: { leader: VolumeLeader; rank: number }) {
    const price = safeFixed(leader.currentPrice);
    const isTop3 = rank <= 3;
    
    return (
        <a
            href={`https://kalshi.com/markets/${cleanEventTicker(leader.eventTicker)}?ticker=${leader.ticker}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`glass-card volume-card ${isTop3 ? "volume-card--featured" : ""}`}
            aria-label={`Rank ${rank}: ${leader.title}, volume ${formatVolume(leader.volume24h)}, current price ${price} cents`}
        >
            <span className="volume-card__rank-badge">
                #{rank}
            </span>

            <div className="volume-card__top">
                <div className="volume-card__event" title={leader.eventTitle}>
                    {leader.eventTitle}
                </div>
                <div className="volume-card__title" title={leader.title}>
                    {leader.title}
                </div>
            </div>

            <div className="volume-card__bottom">
                <div className="volume-card__metrics">
                    <div className="volume-card__metric">
                        <span className="volume-card__metric-label">Vol</span>
                        <span className="volume-card__metric-value">{formatVolume(leader.volume24h)}</span>
                    </div>
                    <div className="volume-card__metric">
                        <span className="volume-card__metric-label">OI</span>
                        <span className="volume-card__metric-value">{formatVolume(leader.openInterest)}</span>
                    </div>
                </div>
                
                <div className="volume-card__price">
                    <span className="volume-card__current">{price}¢</span>
                </div>
            </div>

            <div className="volume-card__footer">
                <span className="card__category">{leader.category}</span>
                <span className="card__link-hint">View on Kalshi →</span>
            </div>
        </a>
    );
}
