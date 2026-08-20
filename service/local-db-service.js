import http from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { TodoStore, databasePath } from "../electron/db-store.js";

export const DEFAULT_DB_SERVICE_PORT = 43127;
const ALLOWED_ORIGIN = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i;

export function defaultServiceDataRoot({
  env = process.env,
  platform = process.platform,
  home = homedir(),
} = {}) {
  if (platform === "win32") return join(env.APPDATA || join(home, "AppData", "Roaming"), "TodoApp");
  if (platform === "darwin") return join(home, "Library", "Application Support", "TodoApp");
  return join(env.XDG_CONFIG_HOME || join(home, ".config"), "TodoApp");
}

export function defaultServiceDatabasePath(options) {
  return databasePath(defaultServiceDataRoot(options));
}

function json(res, status, value, origin) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    ...(origin ? { "access-control-allow-origin": origin, "vary": "Origin" } : {}),
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function allowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return null;
  return ALLOWED_ORIGIN.test(origin) ? origin : false;
}

export function createLocalDbService({
  filePath = defaultServiceDatabasePath(),
  host = "127.0.0.1",
  port = DEFAULT_DB_SERVICE_PORT,
} = {}) {
  const store = new TodoStore(filePath);

  const server = http.createServer(async (req, res) => {
    const origin = allowedOrigin(req);
    if (origin === false) {
      json(res, 403, { error: "Origin not allowed" });
      return;
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        ...(origin ? { "access-control-allow-origin": origin, "vary": "Origin" } : {}),
        "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "600",
      });
      res.end();
      return;
    }

    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || `${host}:${port}`}`);
      const parts = url.pathname.split("/").filter(Boolean);

      if (req.method === "GET" && url.pathname === "/info") return json(res, 200, store.info(), origin);
      if (req.method === "GET" && url.pathname === "/tasks") return json(res, 200, store.allTasks(), origin);

      if (parts[0] === "tasks" && parts[1]) {
        const id = Number(parts[1]);
        if (!Number.isInteger(id) || id <= 0) return json(res, 400, { error: "Invalid task id" }, origin);
        if (req.method === "GET") {
          const task = store.getTask(id);
          return task ? json(res, 200, task, origin) : json(res, 404, { error: "Task not found" }, origin);
        }
        if (req.method === "DELETE") return json(res, 200, { deleted: store.deleteTask(id) }, origin);
      }

      if (req.method === "POST" && url.pathname === "/tasks") {
        const id = store.saveTask(await readJson(req));
        return json(res, 200, { id }, origin);
      }

      if (parts[0] === "settings" && parts[1]) {
        const key = decodeURIComponent(parts.slice(1).join("/"));
        if (req.method === "GET") {
          const row = store.db.prepare("SELECT value_json FROM settings WHERE key=?").get(key);
          return row ? json(res, 200, { value: JSON.parse(row.value_json) }, origin) : json(res, 404, { error: "Setting not found" }, origin);
        }
        if (req.method === "PUT") {
          const { value } = await readJson(req);
          return json(res, 200, { value: store.setSetting(key, value) }, origin);
        }
      }

      json(res, 404, { error: "Not found" }, origin);
    } catch (error) {
      json(res, 500, { error: error?.message || String(error) }, origin);
    }
  });

  return {
    store,
    server,
    async listen() {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, resolve);
      });
      const address = server.address();
      return { host, port: typeof address === "object" && address ? address.port : port, filePath };
    },
    async close() {
      if (server.listening) await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
      store.close();
    },
  };
}

async function main() {
  const service = createLocalDbService();
  const info = await service.listen();
  console.log(`TodoApp local DB service listening on http://${info.host}:${info.port}`);
  console.log(`SQLite: ${info.filePath}`);

  const shutdown = async () => {
    try { await service.close(); } finally { process.exit(0); }
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
