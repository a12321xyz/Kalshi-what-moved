
import { fetchOpenEventsWithMarkets } from "../src/lib/kalshi";

async function inspect() {
    const events = await fetchOpenEventsWithMarkets();
    const swift = events.find(e => e.title.includes("Taylor Swift") && e.title.includes("Wedding"));
    if (swift) {
        console.log("Event Title:", swift.title);
        swift.markets?.forEach(m => {
            console.log(`- Ticker: ${m.ticker}`);
            console.log(`  Title: ${m.title}`);
            console.log(`  Subtitle: ${m.subtitle}`);
            console.log(`  YesSubTitle: ${m.yes_sub_title}`);
        });
    } else {
        console.log("Event not found");
    }
}

inspect();
