import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createLocalDbService } from "./local-db-service.js";

const root = resolve(new URL("..", import.meta.url).pathname);
const WEB_PORT = Number(process.env.TODOAPP_WEB_PORT || 8080);

function mime(path) {
  return ({ ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json; charset=utf-8" })[extname(path)] || "application/octet-stream";
}

async function main() {
  const db = createLocalDbService();
  const dbInfo = await db.listen();

  const web = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://127.0.0.1:${WEB_PORT}`);
      const relative = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
      const file = resolve(root, relative);
      if (!file.startsWith(`${root}/`) && file !== resolve(root, "index.html")) {
        res.writeHead(403); res.end("Forbidden"); return;
      }
      const body = await readFile(file);
      res.writeHead(200, { "content-type": mime(file), "cache-control": "no-store" });
      res.end(body);
    } catch {
      res.writeHead(404); res.end("Not found");
    }
  });

  await new Promise((resolve, reject) => {
    web.once("error", reject);
    web.listen(WEB_PORT, "127.0.0.1", resolve);
  });

  console.log(`TodoApp web: http://127.0.0.1:${WEB_PORT}`);
  console.log(`TodoApp SQLite service: http://${dbInfo.host}:${dbInfo.port}`);
  console.log(`SQLite: ${dbInfo.filePath}`);

  const shutdown = async () => {
    await new Promise((resolve) => web.close(resolve));
    await db.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error);
    process.exit(1);
  });
}
