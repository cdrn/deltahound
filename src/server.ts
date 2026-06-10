import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PORT } from "./config.js";
import type { Store } from "./store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");

export function startServer(store: Store): void {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    if (url.pathname === "/api/series") {
      const minutes = Number(url.searchParams.get("minutes") ?? 60);
      const size = Number(url.searchParams.get("size") ?? 100_000);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(store.series(minutes, size)));
      return;
    }

    if (url.pathname === "/api/latest") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(store.latest()));
      return;
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      try {
        const html = readFileSync(join(PUBLIC_DIR, "index.html"));
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
      } catch {
        res.writeHead(500);
        res.end("missing public/index.html");
      }
      return;
    }

    res.writeHead(404);
    res.end("not found");
  });

  server.listen(PORT, () => {
    console.log(`[server] http://localhost:${PORT}`);
  });
}
