import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/index.mjs";
const dataDir = mkdtempSync(join(tmpdir(), "jac-e2e-"));
const { server } = createApp({ dataDir, demoDelay: 150 });
server.listen(3061, "127.0.0.1");
function close() {
  server.close(() => rmSync(dataDir, { recursive: true, force: true }));
  server.closeAllConnections();
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
