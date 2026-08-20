import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { TodoStore, databasePath } from "./db-store.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const smokeTest = process.argv.includes("--smoke-test");
let store;

function registerIpc() {
  ipcMain.handle("db:info", () => store.info());
  ipcMain.handle("tasks:all", () => store.allTasks());
  ipcMain.handle("tasks:get", (_e,id) => store.getTask(id));
  ipcMain.handle("tasks:save", (_e,task) => store.saveTask(task));
  ipcMain.handle("tasks:delete", (_e,id) => store.deleteTask(id));
  ipcMain.handle("settings:get", (_e,key,fallback) => store.getSetting(key,fallback));
  ipcMain.handle("settings:set", (_e,key,value) => store.setSetting(key,value));
}

function createWindow() {
  const win = new BrowserWindow({
    width:1440, height:900, minWidth:900, minHeight:640, backgroundColor:"#0b0d10", autoHideMenuBar:true,
    webPreferences:{ preload:join(here,"preload.cjs"), contextIsolation:true, nodeIntegration:false, sandbox:true }
  });
  win.loadFile(join(here,"..","index.html"));
}

app.whenReady().then(() => {
  store = new TodoStore(databasePath(app.getPath("userData")));
  if (smokeTest) {
    const info = store.info();
    console.log(`TodoApp smoke OK: SQLite schema ${info.schemaVersion}`);
    store.close();
    store = null;
    app.quit();
    return;
  }
  registerIpc();
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => store?.close());
