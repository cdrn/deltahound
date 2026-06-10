import Database from "better-sqlite3";
import type { Quote } from "./types.js";

export class Store {
  private db: Database.Database;
  private insertStmt: Database.Statement;

  constructor(path: string) {
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quotes (
        id INTEGER PRIMARY KEY,
        ts INTEGER NOT NULL,
        chain TEXT NOT NULL,
        venue TEXT NOT NULL,
        token_in TEXT NOT NULL,
        token_out TEXT NOT NULL,
        amount_in REAL NOT NULL,
        amount_out REAL NOT NULL,
        price REAL NOT NULL,
        bps REAL NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_quotes_ts ON quotes(ts);
      CREATE INDEX IF NOT EXISTS idx_quotes_chain_ts ON quotes(chain, ts);
    `);
    this.insertStmt = this.db.prepare(`
      INSERT INTO quotes (ts, chain, venue, token_in, token_out, amount_in, amount_out, price, bps)
      VALUES (@ts, @chain, @venue, @tokenIn, @tokenOut, @amountIn, @amountOut, @price, @bps)
    `);
  }

  insert(quotes: Quote[]): void {
    const tx = this.db.transaction((rows: Quote[]) => {
      for (const row of rows) this.insertStmt.run(row);
    });
    tx(quotes);
  }

  series(minutes: number, sizeUsd: number): unknown[] {
    return this.db
      .prepare(
        `SELECT ts, chain, venue, token_in AS tokenIn, token_out AS tokenOut,
                amount_in AS amountIn, price, bps
         FROM quotes
         WHERE ts >= ? AND amount_in = ?
         ORDER BY ts ASC`,
      )
      .all(Date.now() - minutes * 60_000, sizeUsd);
  }

  latest(): unknown[] {
    return this.db
      .prepare(
        `SELECT q.ts, q.chain, q.venue, q.token_in AS tokenIn, q.token_out AS tokenOut,
                q.amount_in AS amountIn, q.price, q.bps
         FROM quotes q
         JOIN (
           SELECT chain, token_in, token_out, amount_in, MAX(ts) AS max_ts
           FROM quotes GROUP BY chain, token_in, token_out, amount_in
         ) m ON q.chain = m.chain AND q.token_in = m.token_in
            AND q.token_out = m.token_out AND q.amount_in = m.amount_in
            AND q.ts = m.max_ts`,
      )
      .all();
  }
}
