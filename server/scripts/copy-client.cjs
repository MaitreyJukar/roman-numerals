const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const clientDist = path.join(root, "client", "dist");
const target = path.join(root, "server", "public");

if (!fs.existsSync(clientDist)) {
  console.warn("copy-client: client/dist missing — run `npm run build -w client` first");
  process.exit(0);
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(clientDist, target, { recursive: true });
console.log("copy-client: copied client/dist -> server/public");
