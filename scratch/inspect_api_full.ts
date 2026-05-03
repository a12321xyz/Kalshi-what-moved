
import { fetchOpenEventsWithMarkets } from "../src/lib/kalshi";

async function inspect() {
    const events = await fetchOpenEventsWithMarkets();
    const event = events[0];
    if (event && event.markets && event.markets.length > 0) {
        console.log("Full Event Sample:");
        console.log(JSON.stringify(event, (key, value) => key === 'markets' ? undefined : value, 2));
        console.log("Full Market Sample:");
        console.log(JSON.stringify(event.markets[0], null, 2));
    }
}

inspect();
