
import { fetchOpenEventsWithMarkets } from "../src/lib/kalshi";

async function inspect() {
    const events = await fetchOpenEventsWithMarkets();
    // Find an event with multiple markets
    const multi = events.find(e => (e.markets?.length ?? 0) > 1);
    if (multi) {
        console.log("Event Title:", multi.title);
        console.log("Markets:");
        multi.markets?.forEach(m => {
            console.log(`- Ticker: ${m.ticker}`);
            console.log(`  Title: ${m.title}`);
            console.log(`  Subtitle: ${(m as any).subtitle}`);
        });
    }
}

inspect();
