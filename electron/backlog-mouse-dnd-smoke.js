import { app, BrowserWindow } from "electron";
import { createServer } from "node:http";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createLocalDbService } from "../service/local-db-service.js";
import { databasePath } from "./db-store.js";

const repo = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const mime = path => ({
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
}[extname(path)] || "application/octet-stream");

async function staticServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const relative = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
      const file = resolve(repo, relative);
      if (!file.startsWith(`${repo}/`) && file !== join(repo, "index.html")) {
        res.writeHead(403);
        res.end();
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, { "content-type": mime(file), "cache-control": "no-store" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  return { server, port: server.address().port };
}

async function close(server) {
  if (!server.listening) return;
  await new Promise((resolvePromise, reject) => server.close(error => error ? reject(error) : resolvePromise()));
}

async function dragWithMouse(win, from, to) {
  const sx = Math.round(from.x);
  const sy = Math.round(from.y);
  const tx = Math.round(to.x);
  const ty = Math.round(to.y);

  win.webContents.sendInputEvent({ type: "mouseMove", x: sx, y: sy });
  win.webContents.sendInputEvent({ type: "mouseDown", x: sx, y: sy, button: "left", clickCount: 1 });

  for (let step = 1; step <= 10; step += 1) {
    const x = Math.round(sx + (tx - sx) * step / 10);
    const y = Math.round(sy + (ty - sy) * step / 10);
    win.webContents.sendInputEvent({ type: "mouseMove", x, y, button: "left" });
    await new Promise(resolvePromise => setTimeout(resolvePromise, 20));
  }

  win.webContents.sendInputEvent({ type: "mouseUp", x: tx, y: ty, button: "left", clickCount: 1 });
  await new Promise(resolvePromise => setTimeout(resolvePromise, 500));
}

async function run() {
  const temp = await mkdtemp(join(tmpdir(), "todo-backlog-mouse-dnd-"));
  const dbService = createLocalDbService({ filePath: databasePath(temp) });
  const ui = await staticServer();
  await dbService.listen();

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
    await win.loadURL(`http://127.0.0.1:${ui.port}/index.html`);
    await new Promise(resolvePromise => setTimeout(resolvePromise, 800));

    const setup = await win.webContents.executeJavaScript(`(async()=>{try{
      const db=await import("/src/db.js");
      const parentId=await db.saveBacklogGroup({name:"Proyecto",parentId:null,groupOrder:0});
      const childId=await db.saveBacklogGroup({name:"Backend",parentId:parentId,groupOrder:0});
      const now=new Date().toISOString();
      const taskId=await db.saveTask({
        title:"Mover con mouse",description:"drag real",startsAt:null,endsAt:null,
        backlogOrder:0,backlogGroupId:null,status:"not_started",criticality:"medium",
        recurrence:"none",recurrenceEnd:null,completedAt:null,createdAt:now,updatedAt:now
      });
      await window.todoRenderApp();
      await new Promise(r=>setTimeout(r,180));
      document.querySelector('[data-group-toggle="'+parentId+'"]')?.click();
      await new Promise(r=>setTimeout(r,80));
      const card=document.querySelector('[data-backlog-task="'+taskId+'"]');
      const target=document.querySelector('[data-group-target="'+childId+'"]');
      const cr=card.getBoundingClientRect(),tr=target.getBoundingClientRect();
      return {
        parentId,childId,taskId,
        cardDraggable:card.draggable,
        childClosed:document.querySelector('[data-group-toggle="'+childId+'"]').getAttribute("aria-expanded")==="false",
        from:{x:cr.left+Math.min(45,cr.width*.25),y:cr.top+cr.height/2},
        to:{x:tr.left+Math.min(70,tr.width*.35),y:tr.top+tr.height/2}
      };
    }catch(e){return{error:e?.stack||String(e)}}})()`);

    if (setup.error || !setup.childClosed || setup.cardDraggable !== false) {
      throw new Error(`Mouse DnD setup failed: ${JSON.stringify(setup)}`);
    }

    await dragWithMouse(win, setup.from, setup.to);

    const movedIn = await win.webContents.executeJavaScript(`(async()=>{try{
      const db=await import("/src/db.js");
      const task=await db.getTask(${setup.taskId});
      const persisted=task?.backlogGroupId===${setup.childId};
      document.querySelector('[data-group-toggle="${setup.childId}"]')?.click();
      await new Promise(r=>setTimeout(r,100));
      const card=document.querySelector('[data-backlog-task="${setup.taskId}"]');
      const root=document.querySelector("[data-root-drop]");
      const cr=card.getBoundingClientRect(),rr=root.getBoundingClientRect();
      return {
        persisted,
        sameId:task?.id===${setup.taskId},
        from:{x:cr.left+Math.min(45,cr.width*.25),y:cr.top+cr.height/2},
        to:{x:rr.left+Math.min(100,rr.width*.4),y:rr.top+Math.max(12,rr.height/2)}
      };
    }catch(e){return{error:e?.stack||String(e)}}})()`);

    if (movedIn.error || !movedIn.persisted || !movedIn.sameId) {
      throw new Error(`Mouse DnD into subfolder failed: ${JSON.stringify(movedIn)}`);
    }

    await dragWithMouse(win, movedIn.from, movedIn.to);

    const final = await win.webContents.executeJavaScript(`(async()=>{try{
      const db=await import("/src/db.js");
      const task=await db.getTask(${setup.taskId});
      const result={
        movedOut:task?.backlogGroupId===null,
        sameId:task?.id===${setup.taskId},
        cardAtRoot:!!document.querySelector('[data-root-drop] [data-backlog-task="${setup.taskId}"]')
      };
      await db.deleteTask(${setup.taskId});
      await db.deleteBacklogGroup(${setup.childId});
      await db.deleteBacklogGroup(${setup.parentId});
      return result;
    }catch(e){return{error:e?.stack||String(e)}}})()`);

    const ok = !final.error && final.movedOut && final.sameId && final.cardAtRoot && consoleErrors.length === 0;
    if (!ok) throw new Error(`Mouse DnD out of subfolder failed: ${JSON.stringify({ ...final, consoleErrors })}`);

    console.log("TodoApp backlog mouse DnD OK: root -> closed subfolder -> root with same task id");
  } finally {
    if (!win.isDestroyed()) win.destroy();
    await close(ui.server);
    await dbService.close();
    await rm(temp, { recursive: true, force: true });
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
