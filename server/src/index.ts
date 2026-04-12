import "dotenv/config";
import { createApp } from "./app.js";
import { initCache, shutdownCache } from "./lib/cache.js";
import { logger } from "./lib/logger.js";

const port = Number(process.env.PORT || 8080);

await initCache();

const app = createApp();
const server = app.listen(port, () => {
  logger.info({ port }, "server listening");
});

async function shutdown(signal: string) {
  logger.info({ signal }, "shutdown");
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await shutdownCache();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
