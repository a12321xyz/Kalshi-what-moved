
import { requestKalshi } from "../src/lib/kalshi";

async function measure() {
    console.log("Measuring single page fetch...");
    const start = Date.now();
    await requestKalshi("/events", {
        status: "open",
        with_nested_markets: true,
        limit: 200,
    });
    console.log(`Single page took ${(Date.now() - start) / 1000}s`);

    console.log("Measuring 5 pages fetch...");
    const start5 = Date.now();
    let cursor;
    for (let i = 0; i < 5; i++) {
        const params: any = {
            status: "open",
            with_nested_markets: true,
            limit: 200,
        };
        if (cursor) params.cursor = cursor;
        const res: any = await requestKalshi("/events", params);
        cursor = res.cursor;
        if (!cursor) break;
    }
    console.log(`5 pages took ${(Date.now() - start5) / 1000}s`);
}

measure();
