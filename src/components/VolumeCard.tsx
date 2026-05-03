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
            className={`glass-card mover-card volume-card ${isTop3 ? "mover-card--featured" : ""}`}
            aria-label={`Rank ${rank}: ${leader.title}, volume ${formatVolume(leader.volume24h)}, current price ${price} cents`}
        >
            <div className="mover-card__top">
                <div>
                    <div className="mover-card__event" title={leader.eventTitle}>
                        {leader.eventTitle}
                    </div>
                    <div className="mover-card__title" title={leader.title}>
                        {leader.title}
                    </div>
                </div>
                <div className="mover-card__delta mover-card__delta--up" style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', borderColor: 'rgba(var(--primary-rgb), 0.2)' }}>
                    #{rank}
                </div>
            </div>

            <div className="mover-card__bottom">
                <div className="mover-card__price">
                    <span className="mover-card__current" aria-label={`Current price: ${price} cents`}>
                        {price}¢
                    </span>
                    <span className="mover-card__price-label" style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginLeft: '4px' }}>current</span>
                </div>
                <div className="mover-card__volume">
                    Vol: {formatVolume(leader.volume24h)}
                </div>
            </div>

            <div className="mover-card__footer">
                <span className="card__category">{leader.category}</span>
                <span className="card__link-hint">View on Kalshi →</span>
            </div>

            <div className="mover-card__bar" aria-hidden="true">
                <div
                    className="mover-card__bar-fill mover-card__bar-fill--up"
                    style={{ 
                        width: `${Math.max(5, 100 - (rank * 3))}%`,
                        background: 'linear-gradient(90deg, var(--primary), rgba(var(--primary-rgb), 0.3))' 
                    }}
                />
            </div>
        </a>
    );
}
