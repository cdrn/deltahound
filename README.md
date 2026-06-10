# deltahound

A stablecoin venue-basis seismograph. Continuously records the **executable** price of swapping stablecoins at size ($1k / $10k / $100k / $1M) on Ethereum, Base, Arbitrum, and Solana, and visualizes deviation from par as a scrolling seismogram.

Companion instrument to [Company scrip, company store](https://cdrn.xyz/blog/company-scrip/): if venue drift is real and driven by exit-infrastructure quality, it should show up here — per chain, per size, over time, and especially during stress events.

## What it measures

- **Executable price, not spot mid.** Every reading is a real quote for a real size: Uniswap V3 QuoterV2 (`quoteExactInputSingle`) on the EVM chains, Jupiter's quote API on Solana. Thin-pool spot prices are noise; what a $100k exit actually fills at is signal.
- **Both directions.** USDC→USDT and USDT→USDC, since the basis is rarely symmetric.
- **Stored forever.** SQLite time series — the point is to be running *before* the next depeg, bridge halt, or sequencer outage.

## Run

```bash
npm install
npm start          # collector + web UI on http://localhost:4747
```

Default config uses public RPCs and Jupiter's free tier; override with env vars:

| Var | Default |
| --- | --- |
| `ETH_RPC_URL` | `https://ethereum-rpc.publicnode.com` |
| `BASE_RPC_URL` | `https://mainnet.base.org` |
| `ARB_RPC_URL` | `https://arb1.arbitrum.io/rpc` |
| `POLL_INTERVAL_MS` | `30000` |
| `DB_PATH` | `deltahound.db` |
| `PORT` | `4747` |

## API

- `GET /api/series?minutes=60&size=100000` — time series of quotes
- `GET /api/latest` — most recent quote per chain × direction × size

## Roadmap

- Curve pools on mainnet (deepest USDC/USDT venue)
- Bridged-variant basis (USDC.e vs native on Arbitrum)
- A deliberately bad-exit-infra chain as control group
- Stress-event annotations on the seismogram
