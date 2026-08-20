import { app, BrowserWindow, ipcMain } from "electron";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TodoStore, databasePath } from "./db-store.js";
import { createLocalDbService, defaultServiceDatabasePath } from "../service/local-db-service.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(here, "..");
const smokeTest = process.argv.includes("--smoke-test");
const rendererSmokeTest = process.argv.includes("--renderer-smoke-test");
const httpRendererSmokeTest = process.argv.includes("--http-renderer-smoke-test");
let store;

function registerIpc() {
  ipcMain.handle("db:info", () => store.info());
  ipcMain.handle("tasks:all", () => store.allTasks());
  ipcMain.handle("tasks:get", (_e, id) => store.getTask(id));
  ipcMain.handle("tasks:save", (_e, task) => store.saveTask(task));
  ipcMain.handle("tasks:delete", (_e, id) => store.deleteTask(id));
  ipcMain.handle("settings:get", (_e, key, fallback) => store.getSetting(key, fallback));
  ipcMain.handle("settings:set", (_e, key, value) => store.setSetting(key, value));
}

function newWindow(overrides = {}) {
  return new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 640, backgroundColor: "#0b0d10", autoHideMenuBar: true,
    webPreferences: { preload: join(here, "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true },
    ...overrides,
  });
}

function createWindow() {
  const win = newWindow();
  win.loadFile(join(repoRoot, "index.html"));
  return win;
}

function collectErrors(win) {
  const errors = [];
  win.webContents.on("console-message", (_event, details) => {
    if (details.level === "error") errors.push(details.message);
  });
  win.webContents.on("preload-error", (_event, preloadPath, error) => {
    errors.push(`preload ${preloadPath}: ${error.message}`);
  });
  return errors;
}

async function runRendererSmoke() {
  const win = newWindow({ show: false });
  const errors = collectErrors(win);
  await win.loadFile(join(repoRoot, "index.html"));
  await new Promise((resolve) => setTimeout(resolve, 700));
  const result = await win.webContents.executeJavaScript(`(async () => {
    const hasBridge = !!window.todoDb;
    if (!hasBridge) return { hasBridge, hasCalendar: !!document.querySelector(".calendar-panel"), body: document.body.innerText };
    const info = await window.todoDb.info();
    const now = new Date().toISOString();
    const id = await window.todoDb.saveTask({
      title: "Renderer smoke", description: "CI integration", startsAt: now, endsAt: new Date(Date.now() + 3600000).toISOString(),
      status: "not_started", criticality: "medium", recurrence: "none", recurrenceEnd: null, completedAt: null, createdAt: now, updatedAt: now
    });
    const saved = await window.todoDb.getTask(id);
    const deleted = await window.todoDb.deleteTask(id);
    return { hasBridge, hasCalendar: !!document.querySelector(".calendar-panel"), info, savedTitle: saved?.title, deleted, body: document.body.innerText };
  })()`);
  if (!result.hasBridge || !result.hasCalendar || !result.info || result.savedTitle !== "Renderer smoke" || result.deleted !== 1 || errors.length) {
    throw new Error(`Renderer smoke failed: ${JSON.stringify({ ...result, errors })}`);
  }
  console.log(`TodoApp renderer smoke OK: calendar + bridge + IPC + SQLite schema ${result.info.schemaVersion}`);
  win.destroy();
}

function mimeType(path) {
  return ({ ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json; charset=utf-8" })[extname(path)] || "application/octet-stream";
}

async function startStaticServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const relative = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
      const file = resolve(repoRoot, relative);
      if (!file.startsWith(`${repoRoot}/`) && file !== join(repoRoot, "index.html")) {
        res.writeHead(403); res.end("Forbidden"); return;
      }
      const body = await readFile(file);
      res.writeHead(200, { "content-type": mimeType(file), "cache-control":"no-store" });
      res.end(body);
    } catch {
      res.writeHead(404); res.end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return { server, port: server.address().port };
}

async function runHttpRendererSmoke() {
  const dbService = createLocalDbService({ filePath: defaultServiceDatabasePath() });
  const dbInfo = await dbService.listen();
  const staticServer = await startStaticServer();
  const win = newWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  const errors = collectErrors(win);

  try {
    await win.loadURL(`http://127.0.0.1:${staticServer.port}/index.html`);
    await new Promise((resolve) => setTimeout(resolve, 900));
    const result = await win.webContents.executeJavaScript(`(async () => {
      const db = await import("/src/db.js");
      const info = await db.openDB();
      const now = new Date().toISOString();
      const id = await db.saveTask({
        title: "HTTP renderer smoke", description: "browser-style integration", startsAt: now, endsAt: new Date(Date.now() + 3600000).toISOString(),
        status: "not_started", criticality: "medium", recurrence: "none", recurrenceEnd: null, completedAt: null, createdAt: now, updatedAt: now
      });
      const saved = await db.getTask(id);
      const deleted = await db.deleteTask(id);
      return {
        hasDesktopBridge: !!window.todoDb,
        hasCalendar: !!document.querySelector(".calendar-panel"),
        info, savedTitle: saved?.title, deleted, body: document.body.innerText
      };
    })()`);

    if (result.hasDesktopBridge || !result.hasCalendar || !result.info || result.savedTitle !== "HTTP renderer smoke" || result.deleted !== 1 || errors.length) {
      throw new Error(`HTTP renderer smoke failed: ${JSON.stringify({ ...result, errors })}`);
    }
    console.log(`TodoApp HTTP smoke OK: static HTTP UI + loopback API + SQLite schema ${result.info.schemaVersion} @ ${dbInfo.filePath}`);
  } finally {
    win.destroy();
    await new Promise((resolve) => staticServer.server.close(resolve));
    await dbService.close();
  }
}

app.whenReady().then(async () => {
  if (httpRendererSmokeTest) {
    try { await runHttpRendererSmoke(); app.exit(0); }
    catch (error) { console.error(error.stack || error); app.exit(1); }
    return;
  }

  store = new TodoStore(databasePath(app.getPath("userData")));
  registerIpc();

  if (smokeTest) {
    const info = store.info();
    console.log(`TodoApp smoke OK: SQLite schema ${info.schemaVersion}`);
    store.close(); store = null; app.quit(); return;
  }

  if (rendererSmokeTest) {
    try { await runRendererSmoke(); store.close(); store = null; app.exit(0); }
    catch (error) { console.error(error.stack || error); store?.close(); store = null; app.exit(1); }
    return;
  }

  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => store?.close());
