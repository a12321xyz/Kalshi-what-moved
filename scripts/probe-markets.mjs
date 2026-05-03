/**
 * probe-markets.mjs
 * Hits the live Kalshi API and counts:
 *  - Total open events & markets
 *  - Markets with volume_24h > 1000
 *  - Markets with volume_24h > 2500
 *  - Page-by-page timing so we can calculate safe page budget
 */

import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

const BASE = "https://api.elections.kalshi.com/trade-api/v2";
const PAGE_LIMIT = 200;
const MAX_PAGES = 30; // fetch everything we can

async function fetchPage(cursor) {
    const url = new URL(`${BASE}/events`);
    url.searchParams.set("status", "open");
    url.searchParams.set("with_nested_markets", "true");
    url.searchParams.set("limit", String(PAGE_LIMIT));
    if (cursor) url.searchParams.set("cursor", cursor);

    const t0 = Date.now();
    const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(30_000),
    });
    const elapsed = Date.now() - t0;

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return { json, elapsed };
}

async function main() {
    console.log("🔍 Probing Kalshi open markets…\n");

    let cursor;
    let page = 0;
    let totalEvents = 0;
    let totalMarkets = 0;
    let vol1000 = 0;
    let vol2500 = 0;
    let cumulativeMs = 0;
    const pageTimes = [];

    while (page < MAX_PAGES) {
        const { json, elapsed } = await fetchPage(cursor);
        cumulativeMs += elapsed;
        pageTimes.push(elapsed);
        page++;

        const events = json.events ?? [];
        totalEvents += events.length;

        for (const ev of events) {
            for (const m of ev.markets ?? []) {
                totalMarkets++;
                // volume_24h is integer cents on the API
                const vol = m.volume_24h ?? 0;
                if (vol > 1000) vol1000++;
                if (vol > 2500) vol2500++;
            }
        }

        const avgMs = Math.round(cumulativeMs / page);
        console.log(
            `  Page ${String(page).padStart(2)} | ${elapsed}ms | events so far: ${totalEvents} | markets: ${totalMarkets} | cumulative: ${(cumulativeMs/1000).toFixed(1)}s`
        );

        if (!json.cursor || events.length < PAGE_LIMIT) {
            console.log("\n✅ All pages fetched (no more cursor).");
            break;
        }
        cursor = json.cursor;
    }

    const avgMs = Math.round(cumulativeMs / page);

    console.log("\n══════════════════════════════════════════");
    console.log("📊 RESULTS");
    console.log("══════════════════════════════════════════");
    console.log(`  Total open events:           ${totalEvents}`);
    console.log(`  Total open markets:           ${totalMarkets}`);
    console.log(`  Markets with vol_24h > 1000:  ${vol1000}  (${((vol1000/totalMarkets)*100).toFixed(1)}%)`);
    console.log(`  Markets with vol_24h > 2500:  ${vol2500}  (${((vol2500/totalMarkets)*100).toFixed(1)}%)`);
    console.log("");
    console.log(`  Total pages fetched:          ${page}`);
    console.log(`  Avg time per page:            ${avgMs}ms`);
    console.log(`  Total fetch time:             ${(cumulativeMs/1000).toFixed(2)}s`);
    console.log("");

    // How many pages can we safely fit in 50s?
    const BUDGET_MS = 50_000;
    const safePages = Math.floor(BUDGET_MS / avgMs);
    const safeMarkets = safePages * PAGE_LIMIT;
    const safeEvents = Math.round((totalEvents / totalMarkets) * safeMarkets);
    console.log(`  ⏱  50s budget @ ${avgMs}ms/page:   ${safePages} pages ≈ ${safeMarkets} markets`);
    console.log("══════════════════════════════════════════");
}

main().catch((e) => { console.error("Error:", e); process.exit(1); });
