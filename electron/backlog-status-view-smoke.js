import { app, BrowserWindow } from "electron";
import { createServer } from "node:http";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createLocalDbService } from "../service/local-db-service.js";
import { databasePath } from "./db-store.js";

const repo=resolve(fileURLToPath(new URL(".",import.meta.url)),"..");
const mime=p=>({".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8"}[extname(p)]||"application/octet-stream");
const wait=ms=>new Promise(r=>setTimeout(r,ms));

async function staticServer(){
  const server=createServer(async(req,res)=>{
    try{
      const u=new URL(req.url||"/","http://127.0.0.1");
      const rel=u.pathname==="/ "?"index.html":(u.pathname==="/"?"index.html":decodeURIComponent(u.pathname.slice(1)));
      const file=resolve(repo,rel);
      if(!file.startsWith(`${repo}/`)&&file!==join(repo,"index.html")){res.writeHead(403);return res.end()}
      res.writeHead(200,{"content-type":mime(file),"cache-control":"no-store"});
      res.end(await readFile(file));
    }catch{res.writeHead(404);res.end()}
  });
  await new Promise((ok,no)=>{server.once("error",no);server.listen(0,"127.0.0.1",ok)});
  return{server,port:server.address().port};
}
async function close(server){if(server.listening)await new Promise((ok,no)=>server.close(e=>e?no(e):ok()))}

async function run(){
  const temp=await mkdtemp(join(tmpdir(),"todo-status-view-"));
  const dbService=createLocalDbService({filePath:databasePath(temp)});
  const ui=await staticServer();
  await dbService.listen();
  const win=new BrowserWindow({show:false,width:1400,height:900,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
  const errors=[];
  win.webContents.on("console-message",(_e,d)=>{if(d.level==="error")errors.push(d.message)});
  try{
    await win.loadURL(`http://127.0.0.1:${ui.port}/index.html`);
    await wait(800);
    const setup=await win.webContents.executeJavaScript(`(async()=>{
      const db=await import("/src/db.js"),now=new Date().toISOString();
      const liveId=await db.saveTask({title:"Viva",description:"visible calendar",startsAt:null,endsAt:null,backlogOrder:0,backlogGroupId:null,status:"started",criticality:"medium",recurrence:"none",recurrenceEnd:null,completedAt:null,createdAt:now,updatedAt:now});
      const doneId=await db.saveTask({title:"Completa",description:"hidden calendar",startsAt:null,endsAt:null,backlogOrder:1,backlogGroupId:null,status:"completed",criticality:"high",recurrence:"none",recurrenceEnd:null,completedAt:now,createdAt:now,updatedAt:now});
      await window.todoRenderApp();await new Promise(r=>setTimeout(r,350));return{liveId,doneId};
    })()`);
    let state=await win.webContents.executeJavaScript(`(()=>{
      const live=document.querySelector('[data-backlog] [data-backlog-task="${setup.liveId}"]');
      const done=document.querySelector('[data-backlog] [data-backlog-task="${setup.doneId}"]');
      return{liveVisible:!!live&&getComputedStyle(live).display!=="none",doneHidden:!!done&&getComputedStyle(done).display==="none"};
    })()`);
    if(!state.liveVisible||!state.doneHidden)throw new Error(`calendar backlog filter failed: ${JSON.stringify(state)}`);

    state=await win.webContents.executeJavaScript(`(async()=>{
      document.querySelector('[data-view="dashboard"]').click();await new Promise(r=>setTimeout(r,500));
      const card=document.querySelector('[data-backlog-task="${setup.doneId}"]'),select=card?.querySelector('[data-dashboard-task-status]');
      return{card:!!card,green:!!card&&card.classList.contains("dashboard-task-completed"),status:select?.value||null};
    })()`);
    if(!state.card||!state.green||state.status!=="completed")throw new Error(`dashboard completed state failed: ${JSON.stringify(state)}`);

    state=await win.webContents.executeJavaScript(`(async()=>{
      const select=document.querySelector('[data-backlog-task="${setup.doneId}"] [data-dashboard-task-status]');
      select.value="paused";select.dispatchEvent(new Event("change",{bubbles:true}));await new Promise(r=>setTimeout(r,600));
      const db=await import("/src/db.js"),task=await db.getTask(${setup.doneId});
      document.querySelector('[data-view="calendar"]').click();await new Promise(r=>setTimeout(r,500));
      const card=document.querySelector('[data-backlog] [data-backlog-task="${setup.doneId}"]'),all=await db.allTasks();
      await db.deleteTask(${setup.liveId});await db.deleteTask(${setup.doneId});
      return{status:task.status,completedAt:task.completedAt,reappeared:!!card&&getComputedStyle(card).display!=="none",sameId:task.id===${setup.doneId},countBeforeCleanup:all.length};
    })()`);
    if(state.status!=="paused"||state.completedAt!==null||!state.reappeared||!state.sameId||state.countBeforeCleanup!==2||errors.length)throw new Error(`reactivation failed: ${JSON.stringify({...state,errors})}`);
    console.log("TodoApp backlog status views OK");
  }finally{
    if(!win.isDestroyed())win.destroy();
    await close(ui.server);await dbService.close();await rm(temp,{recursive:true,force:true});
  }
}
app.whenReady().then(async()=>{try{await run();app.exit(0)}catch(e){console.error(e?.stack||e);app.exit(1)}});
