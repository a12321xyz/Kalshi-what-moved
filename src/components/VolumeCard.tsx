import type { VolumeLeader } from "@/lib/types";

function formatVolume(v: number): string {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
}

export default function VolumeCard({
    leader,
    rank,
}: {
    leader: VolumeLeader;
    rank: number;
}) {
    return (
        <div className="glass-card volume-card">
            <div className="volume-card__rank">{rank}</div>

            <div className="volume-card__info">
                <div className="volume-card__event">{leader.eventTitle}</div>
                <div className="volume-card__title">{leader.title}</div>
                <div className="volume-card__meta">
                    <span>Vol: {formatVolume(leader.volume24h)}</span>
                    <span>OI: {formatVolume(leader.openInterest)}</span>
                </div>
            </div>

            <div className="volume-card__price">
                <div className="volume-card__price-value">
                    {leader.currentPrice.toFixed(1)}¢
                </div>
                <div className="volume-card__price-label">current</div>
            </div>
        </div>
    );
}
