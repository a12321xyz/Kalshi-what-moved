
import { fetchOpenEventsWithMarkets } from "../src/lib/kalshi";

async function count() {
    const events = await fetchOpenEventsWithMarkets();
    let totalMarkets = 0;
    events.forEach(e => {
        totalMarkets += e.markets?.length ?? 0;
    });
    console.log(`Total Events Scanned: ${events.length}`);
    console.log(`Total Markets Scanned: ${totalMarkets}`);
    
    // Check if there was a next cursor on the 10th page
}

count();
