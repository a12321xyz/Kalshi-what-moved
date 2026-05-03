import { fetchOpenEventsWithMarkets, toNumber } from "../src/lib/kalshi";

async function run() {
    try {
        const events = await fetchOpenEventsWithMarkets();
        let over50k = 0;
        let over25k = 0;
        let over10k = 0;
        let over5k = 0;
        let over1k = 0;
        let total = 0;
        const categories = new Set<string>();
        for (const event of events) {
            if (event.category) categories.add(event.category);
            for (const m of event.markets || []) {
                total++;
                const vol = toNumber(m.volume_24h_fp) ?? m.volume_24h ?? 0;
                if (vol >= 50000) over50k++;
                if (vol >= 25000) over25k++;
                if (vol >= 10000) over10k++;
                if (vol >= 5000) over5k++;
                if (vol >= 1000) over1k++;
            }
        }
        console.log(`Total Markets Scanned: ${total}`);
        console.log(`Unique Categories: ${Array.from(categories).join(", ")}`);
        console.log(`Markets with >= $1,000 volume: ${over1k}`);
        console.log(`Markets with >= $5,000 volume: ${over5k}`);
        console.log(`Markets with >= $10,000 volume: ${over10k}`);
        console.log(`Markets with >= $25,000 volume: ${over25k}`);
        console.log(`Markets with >= $50,000 volume: ${over50k}`);
    } catch (e) {
        console.error(e);
    }
}
run();
