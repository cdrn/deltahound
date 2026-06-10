import { DB_PATH } from "./config.js";
import { startCollector } from "./collector.js";
import { startServer } from "./server.js";
import { Store } from "./store.js";

const store = new Store(DB_PATH);
startCollector(store);
startServer(store);
