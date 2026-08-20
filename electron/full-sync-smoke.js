import { app, BrowserWindow } from "electron";
import { createServer } from "node:http";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createLocalDbService } from "../service/local-db-service.js";
import { databasePath } from "./db-store.js";

const repo = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const mime = p => ({".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8"}[extname(p)] || "application/octet-stream");
const wait = ms => new Promise(r => setTimeout(r, ms));

async function staticServer() {
  const server = createServer(async (req,res) => {
    try {
      const u = new URL(req.url || "/", "http://127.0.0.1");
      const rel = u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname.slice(1));
      const file = resolve(repo, rel);
      if (!file.startsWith(`${repo}/`) && file !== join(repo,"index.html")) { res.writeHead(403); return res.end(); }
      res.writeHead(200, {"content-type": mime(file), "cache-control":"no-store"});
      res.end(await readFile(file));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((ok,no) => { server.once("error",no); server.listen(0,"127.0.0.1",ok); });
  return { server, port: server.address().port };
}
async function close(server) {
  if (server.listening) await new Promise((ok,no) => server.close(e => e ? no(e) : ok()));
}

async function run() {
  const temp = await mkdtemp(join(tmpdir(),"todo-full-sync-"));
  const dbService = createLocalDbService({ filePath: databasePath(temp) });
  const ui = await staticServer();
  await dbService.listen();
  const win = new BrowserWindow({ show:false, width:1400, height:900, webPreferences:{ contextIsolation:true, nodeIntegration:false, sandbox:true } });
  const errors = [];
  win.webContents.on("console-message", (_e,d) => { if (d.level === "error") errors.push(d.message); });

  try {
    await win.loadURL(`http://127.0.0.1:${ui.port}/index.html`);
    await wait(900);

    const setup = await win.webContents.executeJavaScript(`(async()=>{
      const db=await import("/src/db.js");
      const now=new Date(), y=now.getFullYear(), m=now.getMonth(), d=now.getDate();
      const start=new Date(y,m,d,10,0,0), end=new Date(y,m,d,11,0,0), iso=new Date().toISOString();
      const scheduledId=await db.saveTask({
        title:"Sync programada",description:"misma tarea en todas las vistas",
        startsAt:start.toISOString(),endsAt:end.toISOString(),backlogOrder:null,backlogGroupId:null,
        status:"started",criticality:"urgent",recurrence:"none",recurrenceEnd:null,completedAt:null,
        createdAt:iso,updatedAt:iso
      });
      const backlogId=await db.saveTask({
        title:"Sync backlog completa",description:"oculta solo en backlog calendario",
        startsAt:null,endsAt:null,backlogOrder:0,backlogGroupId:null,
        status:"completed",criticality:"high",recurrence:"none",recurrenceEnd:null,completedAt:iso,
        createdAt:iso,updatedAt:iso
      });
      await window.todoRenderApp();
      await new Promise(r=>setTimeout(r,450));
      return {scheduledId,backlogId};
    })()`);

    let state = await win.webContents.executeJavaScript(`(async()=>{
      await window.todoOpenTaskModal(${setup.scheduledId});
      document.querySelector("#task-status").value="completed";
      document.querySelector("#task-form").requestSubmit();
      await new Promise(r=>setTimeout(r,650));
      const db=await import("/src/db.js"), task=await db.getTask(${setup.scheduledId});
      const event=document.querySelector('.cal-event[data-task="${setup.scheduledId}"]');
      const hiddenBacklog=document.querySelector('[data-backlog] [data-backlog-task="${setup.backlogId}"]');
      return {
        status:task.status, completedAt:!!task.completedAt, sameId:task.id===${setup.scheduledId},
        calendarVisible:!!event, calendarGreen:!!event&&event.classList.contains("task-completed"),
        backlogCompletedHidden:!!hiddenBacklog&&getComputedStyle(hiddenBacklog).display==="none"
      };
    })()`);
    if (state.status!=="completed" || !state.completedAt || !state.sameId || !state.calendarVisible || !state.calendarGreen || !state.backlogCompletedHidden) {
      throw new Error(`calendar completion sync failed: ${JSON.stringify(state)}`);
    }

    state = await win.webContents.executeJavaScript(`(async()=>{
      document.querySelector('[data-view="dashboard"]').click();
      await new Promise(r=>setTimeout(r,700));
      const scheduled=document.querySelector('[data-dashboard-scheduled-task="${setup.scheduledId}"]');
      const backlog=document.querySelector('[data-backlog-task="${setup.backlogId}"]');
      const select=scheduled?.querySelector('[data-dashboard-task-status]');
      return {
        scheduledVisible:!!scheduled,
        scheduledGreen:!!scheduled&&scheduled.classList.contains("dashboard-task-completed"),
        scheduledStatus:select?.value||null,
        backlogVisible:!!backlog,
        backlogGreen:!!backlog&&backlog.classList.contains("dashboard-task-completed")
      };
    })()`);
    if (!state.scheduledVisible || !state.scheduledGreen || state.scheduledStatus!=="completed" || !state.backlogVisible || !state.backlogGreen) {
      throw new Error(`dashboard completed sync failed: ${JSON.stringify(state)}`);
    }

    state = await win.webContents.executeJavaScript(`(async()=>{
      const select=document.querySelector('[data-dashboard-scheduled-task="${setup.scheduledId}"] [data-dashboard-task-status]');
      select.value="paused";
      select.dispatchEvent(new Event("change",{bubbles:true}));
      await new Promise(r=>setTimeout(r,750));
      const db=await import("/src/db.js"), task=await db.getTask(${setup.scheduledId});
      document.querySelector('[data-view="calendar"]').click();
      await new Promise(r=>setTimeout(r,650));
      const event=document.querySelector('.cal-event[data-task="${setup.scheduledId}"]');
      const count=(await db.allTasks()).length;
      await db.deleteTask(${setup.scheduledId});
      await db.deleteTask(${setup.backlogId});
      return {
        status:task.status, completedAt:task.completedAt, sameId:task.id===${setup.scheduledId},
        calendarVisible:!!event, calendarGreen:!!event&&event.classList.contains("task-completed"), count
      };
    })()`);
    if (state.status!=="paused" || state.completedAt!==null || !state.sameId || !state.calendarVisible || state.calendarGreen || state.count!==2 || errors.length) {
      throw new Error(`dashboard reactivation sync failed: ${JSON.stringify({...state,errors})}`);
    }

    console.log("TodoApp full task synchronization OK");
  } finally {
    if (!win.isDestroyed()) win.destroy();
    await close(ui.server);
    await dbService.close();
    await rm(temp,{recursive:true,force:true});
  }
}
app.whenReady().then(async()=>{try{await run();app.exit(0)}catch(e){console.error(e?.stack||e);app.exit(1)}});
