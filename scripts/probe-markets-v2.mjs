/**
 * probe-markets-v2.mjs
 * Hits the live Kalshi API and counts:
 *  - Total open events & markets
 *  - Markets with volume_24h > 1000
 *  - Markets with volume_24h > 2500
 *  Also inspects the raw field names on the first few markets.
 */

import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

const BASE = "https://api.elections.kalshi.com/trade-api/v2";
const PAGE_LIMIT = 200;
const MAX_PAGES = 30;

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

function getVol(m) {
    // Try all possible volume field names
    if (typeof m.volume_24h === "number") return m.volume_24h;
    if (m.volume_24h !== undefined) return Number(m.volume_24h) || 0;
    if (m.volume !== undefined) return Number(m.volume) || 0;
    const fp = m.volume_24h_fp ?? m.volume_24h_cents ?? m.dollar_volume_24h;
    if (fp !== undefined) return Number(fp) || 0;
    return 0;
}

async function main() {
    console.log("🔍 Probing Kalshi open markets (v2)…\n");

    let cursor;
    let page = 0;
    let totalEvents = 0;
    let totalMarkets = 0;
    let vol1000 = 0;
    let vol2500 = 0;
    let cumulativeMs = 0;
    let inspectedFields = false;

    while (page < MAX_PAGES) {
        const { json, elapsed } = await fetchPage(cursor);
        cumulativeMs += elapsed;
        page++;

        const events = json.events ?? [];
        totalEvents += events.length;

        for (const ev of events) {
            for (const m of ev.markets ?? []) {
                totalMarkets++;

                // First market: show raw fields so we know the shape
                if (!inspectedFields) {
                    inspectedFields = true;
                    console.log("🔬 Raw field names on first market:");
                    const volFields = Object.entries(m).filter(([k]) =>
                        k.toLowerCase().includes("vol") || k.toLowerCase().includes("volume")
                    );
                    if (volFields.length === 0) {
                        // Show all keys so we can find the right one
                        console.log("   (no volume fields found, all keys:)");
                        console.log("  ", Object.keys(m).join(", "));
                    } else {
                        for (const [k, v] of volFields) {
                            console.log(`   ${k}: ${JSON.stringify(v)}`);
                        }
                    }
                    console.log("");
                }

                const vol = getVol(m);
                if (vol > 1000) vol1000++;
                if (vol > 2500) vol2500++;
            }
        }

        console.log(
            `  Page ${String(page).padStart(2)} | ${elapsed}ms | events: ${totalEvents} | markets: ${totalMarkets} | vol>1k: ${vol1000} | vol>2.5k: ${vol2500}`
        );

        if (!json.cursor || events.length < PAGE_LIMIT) {
            console.log("\n✅ All pages fetched.");
            break;
        }
        cursor = json.cursor;
    }

    const avgMs = Math.round(cumulativeMs / page);

    console.log("\n══════════════════════════════════════════");
    console.log("📊 RESULTS");
    console.log("══════════════════════════════════════════");
    console.log(`  Total open events:            ${totalEvents}`);
    console.log(`  Total open markets:            ${totalMarkets}`);
    console.log(`  Markets with vol_24h > 1,000:  ${vol1000}  (${((vol1000/totalMarkets)*100).toFixed(1)}%)`);
    console.log(`  Markets with vol_24h > 2,500:  ${vol2500}  (${((vol2500/totalMarkets)*100).toFixed(1)}%)`);
    console.log("");
    console.log(`  Total pages (200 events each): ${page}`);
    console.log(`  Avg time per page:             ${avgMs}ms`);
    console.log(`  Total fetch time:              ${(cumulativeMs/1000).toFixed(2)}s`);
    console.log("");
    const BUDGET_MS = 50_000;
    const safePages = Math.floor(BUDGET_MS / avgMs);
    console.log(`  ⏱  50s budget @ ${avgMs}ms/page:    ${safePages} pages = ${safePages * 200} events`);
    console.log("══════════════════════════════════════════");
}

main().catch((e) => { console.error("Error:", e); process.exit(1); });
