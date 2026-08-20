import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { TodoStore, databasePath } from "./db-store.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const smokeTest = process.argv.includes("--smoke-test");
const rendererSmokeTest = process.argv.includes("--renderer-smoke-test");
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
  win.loadFile(join(here, "..", "index.html"));
  return win;
}

async function runRendererSmoke() {
  const win = newWindow({ show: false });
  const errors = [];
  win.webContents.on("console-message", (_event, details) => { if (details.level === "error") errors.push(details.message); });
  win.webContents.on("preload-error", (_event, preloadPath, error) => errors.push(`preload ${preloadPath}: ${error.message}`));
  await win.loadFile(join(here, "..", "index.html"));
  await new Promise((resolve) => setTimeout(resolve, 500));
  const result = await win.webContents.executeJavaScript(`(async () => {
    const hasBridge = !!window.todoDb;
    if (!hasBridge) return { hasBridge, body: document.body.innerText };
    const info = await window.todoDb.info();
    const now = new Date().toISOString();
    const id = await window.todoDb.saveTask({
      title: "Renderer smoke", description: "CI integration", startsAt: now, endsAt: new Date(Date.now() + 3600000).toISOString(),
      status: "not_started", criticality: "medium", recurrence: "none", recurrenceEnd: null, completedAt: null, createdAt: now, updatedAt: now
    });
    const saved = await window.todoDb.getTask(id);
    const deleted = await window.todoDb.deleteTask(id);
    return { hasBridge, info, savedTitle: saved?.title, deleted, body: document.body.innerText };
  })()`);
  if (!result.hasBridge || !result.info || result.savedTitle !== "Renderer smoke" || result.deleted !== 1 || result.body.includes("No se pudo abrir la base de datos local") || errors.length) {
    throw new Error(`Renderer smoke failed: ${JSON.stringify({ ...result, errors })}`);
  }
  console.log(`TodoApp renderer smoke OK: bridge + IPC + SQLite schema ${result.info.schemaVersion}`);
  win.destroy();
}

app.whenReady().then(async () => {
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
