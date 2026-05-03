
import { fetchOpenEventsWithMarkets } from "../src/lib/kalshi";

async function inspect() {
    const events = await fetchOpenEventsWithMarkets();
    const event = events[0];
    if (event) {
        console.log("Event keys:", Object.keys(event));
        console.log("Event category:", event.category);
    }
}

inspect();
