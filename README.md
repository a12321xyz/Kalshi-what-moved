# WhatMoved

Daily prediction market movers dashboard powered by the [Kalshi Trade API](https://kalshi.com).

Shows the biggest price swings, highest-volume markets, and recently settled markets — refreshed every 60 seconds.

---

## Features

- **Top Movers** — Markets with the largest trade-price changes (positive or negative) over the last ~20 trades, ranked by absolute delta
- **Volume Leaders** — Most-traded markets by 24-hour volume
- **Recently Settled** — Markets that just resolved (Yes/No)
- **Summary Stats** — Total markets tracked, average move magnitude, 24h volume, number of movers
- **Dark / Light theme** toggle, persisted in localStorage
- **Stale-while-revalidate** — shows cached data with a dismissible warning when auto-refresh fails
- **Responsive** — works on desktop, tablet, and mobile

---

## Tech Stack

| Layer          | Technology                    |
| -------------- | ----------------------------- |
| Framework      | Next.js 15 (App Router)       |
| Language       | TypeScript 5 (strict mode)    |
| Runtime        | React 19                      |
| Styling        | Pure CSS (CSS custom properties, glassmorphism) |
| Data           | Kalshi Trade API v2 (public)  |
| Caching        | In-memory, 60s TTL + SWR     |

---

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The app runs at `http://localhost:3000`.

### Prerequisites

- Node.js 18+
- npm 9+

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout + metadata
│   ├── page.tsx                # Entry point → <DigestDashboard>
│   ├── globals.css             # All styles (1149 lines, dark/light)
│   └── api/
│       ├── digest/route.ts     # GET /api/digest — full snapshot
│       └── market/[ticker]/route.ts  # GET /api/market/:ticker — single market
├── components/
│   ├── DigestDashboard.tsx     # Main dashboard (client component, 60s polling)
│   ├── MoverCard.tsx           # Single mover card
│   ├── VolumeCard.tsx          # Volume leader card
│   ├── SettledCard.tsx         # Settled market card
│   └── ErrorBoundary.tsx       # React error boundary
├── lib/
│   ├── types.ts                # Raw Kalshi shapes + app domain types
│   ├── kalshi.ts               # Kalshi API client (HTTP, retries, timeouts)
│   ├── digest.ts               # Compute movers, leaders, settled + cache
│   └── format.ts               # Compact volume formatting ($1.2M, $450K)
└── public/
    └── images/profile.png      # Header avatar
```

## Architecture

```
                    ┌────────────────────────┐
                    │   Kalshi Trade API v2    │
                    │  (elections.kalshi.com)  │
                    └───────────┬──────────────┘
                                │
                     ┌──────────▼──────────┐
                     │   src/lib/kalshi.ts   │  ← HTTP client (retries, timeout)
                     └──────────┬──────────┘
                                │
                     ┌──────────▼──────────┐
                     │   src/lib/digest.ts   │  ← Compute movers, leaders, settled
                     │     (60s cache)      │
                     └──────────┬──────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                                    │
   ┌──────────▼──────────┐            ┌───────────▼───────────┐
   │  /api/digest (GET)   │            │ /api/market/[ticker]  │
   │  (cached, SWR)      │            │ (pass-through)        │
   └──────────┬──────────┘            └───────────────────────┘
              │
   ┌──────────▼──────────┐
   │  DigestDashboard.tsx  │  ← Client component (fetch + render)
   └──────────┬──────────┘
              │
   ┌──────────┼──────────────────────────┐
   ▼          ▼                          ▼
MoverCard  VolumeCard  SettledCard   ← Presentation components
```

### Data Flow

1. `buildFresh()` fetches open events (with nested markets) and settled events from Kalshi in parallel
2. `computeMovers()` picks the top 50 most-liquid active markets, fetches their recent trades (batched), and compares oldest vs newest trade price to compute delta
3. `computeVolumeLeaders()` and `computeSettled()` sort and slice from raw event data
4. Results are cached in-memory with a 60-second TTL. Stale cache is returned immediately while a background refresh runs
5. The dashboard `DigestDashboard.tsx` polls `/api/digest` every 60s

### Mover Detection

A market qualifies as a "mover" when:
- Status is `open` or `active`
- Has at least 2 recent trades
- The difference between the newest and oldest trade price is **≥ 1 cent**
- Ranked by absolute delta, then by volume

---

## License

MIT
