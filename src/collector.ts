import { EVM_CHAINS, POLL_INTERVAL_MS, SIZES_USD } from "./config.js";
import { UniV3Quoter } from "./quoters/evm.js";
import { JupiterQuoter } from "./quoters/solana.js";
import type { Store } from "./store.js";
import type { Quote, Quoter } from "./types.js";

const DIRECTIONS: [string, string][] = [
  ["USDC", "USDT"],
  ["USDT", "USDC"],
];

async function collectChain(quoter: Quoter): Promise<Quote[]> {
  const quotes: Quote[] = [];
  // Sequential within a chain to stay polite to public RPCs and Jupiter's
  // free tier; chains run in parallel.
  for (const [tokenIn, tokenOut] of DIRECTIONS) {
    for (const size of SIZES_USD) {
      try {
        const q = await quoter.quote(tokenIn, tokenOut, size);
        if (q) quotes.push(q);
      } catch (err) {
        console.error(
          `[${quoter.chain}] ${tokenIn}->${tokenOut} $${size}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }
  return quotes;
}

export function startCollector(store: Store): void {
  const quoters: Quoter[] = [
    ...EVM_CHAINS.map((c) => new UniV3Quoter(c)),
    new JupiterQuoter(),
  ];

  let running = false;
  const tick = async () => {
    if (running) return; // skip if previous tick still in flight
    running = true;
    try {
      const results = await Promise.all(quoters.map(collectChain));
      const quotes = results.flat();
      store.insert(quotes);
      const summary = quotes
        .filter((q) => q.amountIn === 100_000 && q.tokenIn === "USDC")
        .map((q) => `${q.chain} ${q.bps.toFixed(2)}bps`)
        .join("  ");
      console.log(
        `[tick] ${quotes.length} quotes  USDC->USDT @100k: ${summary}`,
      );
    } finally {
      running = false;
    }
  };

  tick();
  setInterval(tick, POLL_INTERVAL_MS);
}
