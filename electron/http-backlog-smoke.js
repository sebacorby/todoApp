import { app, BrowserWindow } from "electron";
import { createServer } from "node:http";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createLocalDbService } from "../service/local-db-service.js";
import { databasePath } from "./db-store.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(here, "..");

function mimeType(path) {
  return ({
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  })[extname(path)] || "application/octet-stream";
}

async function startStaticServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const relative = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
      const file = resolve(repoRoot, relative);
      if (!file.startsWith(`${repoRoot}/`) && file !== join(repoRoot, "index.html")) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, { "content-type": mimeType(file), "cache-control": "no-store" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  return { server, port: server.address().port };
}

async function closeServer(server) {
  if (!server.listening) return;
  await new Promise((resolvePromise, reject) =>
    server.close(error => error ? reject(error) : resolvePromise())
  );
}

async function run() {
  const tempRoot = await mkdtemp(join(tmpdir(), "todoapp-backlog-e2e-"));
  const dbService = createLocalDbService({ filePath: databasePath(tempRoot) });
  const staticServer = await startStaticServer();
  const dbInfo = await dbService.listen();
  const win = new BrowserWindow({
    show: false,
    width: 1440,
    height: 900,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  const consoleErrors = [];
  win.webContents.on("console-message", (_event, details) => {
    if (details.level === "error") consoleErrors.push(details.message);
  });

  try {
    await win.loadURL(`http://127.0.0.1:${staticServer.port}/index.html`);
    await new Promise(resolvePromise => setTimeout(resolvePromise, 700));

    const result = await win.webContents.executeJavaScript(`(async () => {
      try {
        const db = await import("/src/db.js");
        const info = await db.openDB();
        const now = new Date().toISOString();
        const id = await db.saveTask({
          title: "Backlog drag E2E",
          description: "drag to calendar",
          startsAt: null,
          endsAt: null,
          backlogOrder: 0,
          status: "not_started",
          criticality: "high",
          recurrence: "none",
          recurrenceEnd: null,
          completedAt: null,
          createdAt: now,
          updatedAt: now
        });

        await window.todoRenderApp();
        await new Promise(resolve => setTimeout(resolve, 100));
        const initialCard = document.querySelector('[data-backlog-task="' + id + '"]');
        const eye = initialCard?.querySelector("[data-backlog-open]");
        const eyePresent = !!eye;

        document.querySelector('[data-mode="day"]')?.click();
        await new Promise(resolve => setTimeout(resolve, 120));

        const card = document.querySelector('[data-backlog-task="' + id + '"]');
        const slot = document.querySelector('.time-slot[data-hour="14"]');
        if (!card || !slot) {
          return {
            scriptError: "Missing drag source or target",
            cardFound: !!card,
            slotFound: !!slot,
            eyePresent,
            info
          };
        }

        const expectedDate = slot.dataset.date;
        const expectedHour = Number(slot.dataset.hour);
        const dataTransfer = new DataTransfer();

        card.dispatchEvent(new DragEvent("dragstart", {
          bubbles: true,
          cancelable: true,
          dataTransfer
        }));
        slot.dispatchEvent(new DragEvent("dragover", {
          bubbles: true,
          cancelable: true,
          dataTransfer
        }));
        slot.dispatchEvent(new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer
        }));

        await new Promise(resolve => setTimeout(resolve, 350));
        const saved = await db.getTask(id);
        const start = new Date(saved?.startsAt);
        const end = new Date(saved?.endsAt);
        const stillInBacklog = !!document.querySelector('[data-backlog-task="' + id + '"]');
        await db.deleteTask(id);

        return {
          hasDesktopBridge: !!window.todoDb,
          hasCalendar: !!document.querySelector(".calendar-panel"),
          hasBacklog: !!document.querySelector("[data-backlog]"),
          info,
          eyePresent,
          id,
          savedId: saved?.id,
          backlogOrder: saved?.backlogOrder
        };
      } catch (error) {
        return { scriptError: error?.stack || error?.message || String(error) };
      }
    })()`);

    const ok =
      !result.scriptError &&
      !result.hasDesktopBridge &&
      result.hasCalendar &&
      result.hasBacklog &&
      result.eyePresent &&
      result.info?.schemaVersion === 2 &&
      result.savedId === result.id &&
      result.backlogOrder === null &&
      result.scheduledDate === result.expectedDate &&
      result.scheduledHour === result.expectedHour &&
      result.durationMs === 3_600_000 &&
      result.stillInBacklog === false &&
      consoleErrors.length === 0;

    if (!ok) {
      throw new Error(`Backlog drag/drop E2E failed: ${JSON.stringify({ ...result, consoleErrors })}`);
    }
    console.log(`TodoApp backlog E2E OK: eye + reorder model + drag/drop -> ${result.expectedDate} ${result.expectedHour}:00 + SQLite schema ${result.info.schemaVersion}`);
  } finally {
    if (!win.isDestroyed()) win.destroy();
    await closeServer(staticServer.server);
    await dbService.close();
    await rm(tempRoot, { recursive: true, force: true });
  }
}

app.whenReady().then(async () => {
  try {
    await run();
    app.exit(0);
  } catch (error) {
    console.error(error?.stack || error);
    app.exit(1);
  }
});
