
import { fetchOpenEventsWithMarkets, toNumber, toPercent } from "../src/lib/kalshi";

function currentProb(m: any): number | null {
    if (m.last_price != null && m.last_price >= 0) return m.last_price;
    const last = toNumber(m.last_price_dollars);
    if (last !== null && last >= 0) return toPercent(last);
    return null;
}

async function analyze() {
    try {
        console.log("Fetching open events...");
        const events = await fetchOpenEventsWithMarkets();
        console.log(`Found ${events.length} events.`);

        let totalMarkets = 0;
        let volGt5000 = 0;
        
        for (const event of events) {
            for (const m of event.markets ?? []) {
                totalMarkets++;
                const vol = m.volume_24h ?? (toNumber(m.volume_24h_fp) ?? 0);
                if (vol >= 5000) volGt5000++;
            }
        }

        console.log(`Total Markets: ${totalMarkets}`);
        console.log(`Markets with Volume >= 5000: ${volGt5000}`);

    } catch (err) {
        console.error("Analysis failed:", err);
    }
}

analyze();
