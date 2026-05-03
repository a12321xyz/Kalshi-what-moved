import type { VolumeLeader } from "@/lib/types";
import { formatVolume, safeFixed, cleanEventTicker } from "@/lib/format";

export default function VolumeRow({ leader, rank }: { leader: VolumeLeader; rank: number }) {
    return (
        <a
            href={`https://kalshi.com/markets/${cleanEventTicker(leader.eventTicker)}?ticker=${leader.ticker}`}
            target="_blank"
            rel="noopener noreferrer"
            className="volume-row"
        >
            <div className="volume-row__rank">#{rank}</div>
            <div className="volume-row__info">
                <div className="volume-row__title" title={leader.title}>
                    {leader.title}
                </div>
                <div className="volume-row__event" title={leader.eventTitle}>
                    {leader.eventTitle}
                </div>
            </div>
            <div className="volume-row__stats">
                <div className="volume-row__price">{safeFixed(leader.currentPrice)}¢</div>
                <div className="volume-row__vol">{formatVolume(leader.volume24h)}</div>
            </div>
        </a>
    );
}
