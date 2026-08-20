
import { app, BrowserWindow } from "electron";
import { createServer } from "node:http";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createLocalDbService } from "../service/local-db-service.js";
import { databasePath } from "./db-store.js";

const repo = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const mime = p => ({
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
}[extname(p)] || "application/octet-stream");

async function staticServer() {
  const server = createServer(async (req,res) => {
    try {
      const u = new URL(req.url || "/", "http://127.0.0.1");
      const rel = u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname.slice(1));
      const file = resolve(repo, rel);
      if (!file.startsWith(`${repo}/`) && file !== join(repo,"index.html")) {
        res.writeHead(403); return res.end();
      }
      res.writeHead(200, {"content-type":mime(file),"cache-control":"no-store"});
      res.end(await readFile(file));
    } catch {
      res.writeHead(404); res.end();
    }
  });
  await new Promise((ok,no) => { server.once("error",no); server.listen(0,"127.0.0.1",ok); });
  return {server, port:server.address().port};
}
async function close(server) {
  if (server.listening) await new Promise((ok,no) => server.close(e => e ? no(e) : ok()));
}
const wait = ms => new Promise(r => setTimeout(r,ms));

async function drag(win, from, to) {
  const sx=Math.round(from.x), sy=Math.round(from.y), tx=Math.round(to.x), ty=Math.round(to.y);
  win.webContents.sendInputEvent({type:"mouseMove",x:sx,y:sy});
  win.webContents.sendInputEvent({type:"mouseDown",x:sx,y:sy,button:"left",clickCount:1});
  for (let i=1;i<=12;i++) {
    const x=Math.round(sx+(tx-sx)*i/12), y=Math.round(sy+(ty-sy)*i/12);
    win.webContents.sendInputEvent({type:"mouseMove",x,y,button:"left"});
    await wait(18);
  }
  win.webContents.sendInputEvent({type:"mouseUp",x:tx,y:ty,button:"left",clickCount:1});
  await wait(450);
}

async function run() {
  const temp = await mkdtemp(join(tmpdir(),"todo-dashboard-unified-"));
  const dbService = createLocalDbService({filePath:databasePath(temp)});
  const ui = await staticServer();
  await dbService.listen();

  const win = new BrowserWindow({
    show:false, width:1440, height:900,
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true},
  });
  const errors=[];
  win.webContents.on("console-message",(_e,d)=>{ if(d.level==="error") errors.push(d.message); });

  try {
    await win.loadURL(`http://127.0.0.1:${ui.port}/index.html`);
    await wait(800);

    const setup = await win.webContents.executeJavaScript(`(async()=>{try{
      const db=await import("/src/db.js");
      const parentId=await db.saveBacklogGroup({name:"Trabajo",parentId:null,groupOrder:0});
      const childId=await db.saveBacklogGroup({name:"Backend",parentId:parentId,groupOrder:0});
      const now=new Date().toISOString();
      const taskId=await db.saveTask({
        title:"Mover libremente",description:"Dashboard unico",startsAt:null,endsAt:null,
        backlogOrder:0,backlogGroupId:null,status:"not_started",criticality:"medium",
        recurrence:"none",recurrenceEnd:null,completedAt:null,createdAt:now,updatedAt:now
      });
      document.querySelector('[data-view="dashboard"]')?.click();
      await new Promise(r=>setTimeout(r,500));
      const host=document.querySelector(".dashboard-unified-backlog");
      const panels=[...document.querySelectorAll(".dashboard .dashboard-panel")];
      const card=document.querySelector('[data-backlog-task="'+taskId+'"]');
      const parent=document.querySelector('[data-group-target="'+parentId+'"]');
      return {
        parentId,childId,taskId,
        unified:!!host,
        oneBacklogBlock:!!host && ![...panels].some(p=>p!==host && /Todas las tareas/.test(p.textContent)),
        rootCard:!!card && card.dataset.group==="",
        from:card?{x:card.getBoundingClientRect().left+45,y:card.getBoundingClientRect().top+card.getBoundingClientRect().height/2}:null,
        parentTo:parent?{x:parent.getBoundingClientRect().left+160,y:parent.getBoundingClientRect().top+parent.getBoundingClientRect().height/2}:null
      };
    }catch(e){return {error:e?.stack||String(e)}}})()`);

    if (setup.error || !setup.unified || !setup.oneBacklogBlock || !setup.rootCard || !setup.from || !setup.parentTo) {
      throw new Error(`unified dashboard setup failed: ${JSON.stringify(setup)}`);
    }

    await drag(win, setup.from, setup.parentTo);

    let state = await win.webContents.executeJavaScript(`(async()=>{try{
      const db=await import("/src/db.js");
      const task=await db.getTask(${setup.taskId});
      const toggle=document.querySelector('[data-dashboard-folder-toggle="${setup.parentId}"]');
      if(toggle?.getAttribute("aria-expanded")==="false")toggle.click();
      await new Promise(r=>setTimeout(r,120));
      const card=document.querySelector('[data-backlog-task="${setup.taskId}"]');
      const child=document.querySelector('[data-group-target="${setup.childId}"]');
      return {
        inParent:task?.backlogGroupId===${setup.parentId},
        sameId:task?.id===${setup.taskId},
        from:card?{x:card.getBoundingClientRect().left+45,y:card.getBoundingClientRect().top+card.getBoundingClientRect().height/2}:null,
        childTo:child?{x:child.getBoundingClientRect().left+160,y:child.getBoundingClientRect().top+child.getBoundingClientRect().height/2}:null
      };
    }catch(e){return {error:e?.stack||String(e)}}})()`);

    if (state.error || !state.inParent || !state.sameId || !state.from || !state.childTo) {
      throw new Error(`root -> folder drag failed: ${JSON.stringify(state)}`);
    }

    await drag(win, state.from, state.childTo);

    state = await win.webContents.executeJavaScript(`(async()=>{try{
      const db=await import("/src/db.js");
      const task=await db.getTask(${setup.taskId});
      const parentToggle=document.querySelector('[data-dashboard-folder-toggle="${setup.parentId}"]');
      if(parentToggle?.getAttribute("aria-expanded")==="false")parentToggle.click();
      const childToggle=document.querySelector('[data-dashboard-folder-toggle="${setup.childId}"]');
      if(childToggle?.getAttribute("aria-expanded")==="false")childToggle.click();
      await new Promise(r=>setTimeout(r,120));
      const card=document.querySelector('[data-backlog-task="${setup.taskId}"]');
      const root=document.querySelector(".dashboard-backlog-root-drop-hint");
      return {
        inChild:task?.backlogGroupId===${setup.childId},
        from:card?{x:card.getBoundingClientRect().left+45,y:card.getBoundingClientRect().top+card.getBoundingClientRect().height/2}:null,
        rootTo:root?{x:root.getBoundingClientRect().left+180,y:root.getBoundingClientRect().top+root.getBoundingClientRect().height/2}:null
      };
    }catch(e){return {error:e?.stack||String(e)}}})()`);

    if (state.error || !state.inChild || !state.from || !state.rootTo) {
      throw new Error(`folder -> subfolder drag failed: ${JSON.stringify(state)}`);
    }

    await drag(win, state.from, state.rootTo);

    const final = await win.webContents.executeJavaScript(`(async()=>{try{
      const db=await import("/src/db.js");
      const task=await db.getTask(${setup.taskId});
      const dashboardRoot=!!document.querySelector('.dashboard-backlog-root-tasks [data-backlog-task="${setup.taskId}"]');
      document.querySelector('[data-view="calendar"]')?.click();
      await new Promise(r=>setTimeout(r,450));
      const calendarRoot=!!document.querySelector('[data-root-drop] [data-backlog-task="${setup.taskId}"]');
      await db.deleteTask(${setup.taskId});
      await db.deleteBacklogGroup(${setup.childId});
      await db.deleteBacklogGroup(${setup.parentId});
      return {
        root:task?.backlogGroupId===null,
        sameId:task?.id===${setup.taskId},
        dashboardRoot,calendarRoot
      };
    }catch(e){return {error:e?.stack||String(e)}}})()`);

    if (final.error || !final.root || !final.sameId || !final.dashboardRoot || !final.calendarRoot || errors.length) {
      throw new Error(`dashboard/calendar backlog sync failed: ${JSON.stringify({...final,errors})}`);
    }

    console.log("TodoApp unified dashboard backlog OK: root -> folder -> subfolder -> root, same task mirrored in Calendar");
  } finally {
    if(!win.isDestroyed()) win.destroy();
    await close(ui.server);
    await dbService.close();
    await rm(temp,{recursive:true,force:true});
  }
}

app.whenReady().then(async()=>{try{await run();app.exit(0)}catch(e){console.error(e?.stack||e);app.exit(1)}});
