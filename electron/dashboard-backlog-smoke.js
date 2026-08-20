
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

async function staticServer(){
  const server=createServer(async(req,res)=>{
    try{
      const u=new URL(req.url||"/","http://127.0.0.1");
      const rel=u.pathname==="/"?"index.html":decodeURIComponent(u.pathname.slice(1));
      const file=resolve(repo,rel);
      if(!file.startsWith(`${repo}/`)&&file!==join(repo,"index.html")){res.writeHead(403);return res.end()}
      res.writeHead(200,{"content-type":mime(file),"cache-control":"no-store"});
      res.end(await readFile(file));
    }catch{res.writeHead(404);res.end()}
  });
  await new Promise((ok,no)=>{server.once("error",no);server.listen(0,"127.0.0.1",ok)});
  return {server,port:server.address().port};
}
async function close(server){if(server.listening)await new Promise((ok,no)=>server.close(e=>e?no(e):ok()))}
async function wait(ms){return new Promise(r=>setTimeout(r,ms))}
async function type(win,text){
  await win.webContents.insertText(text);
  win.webContents.sendInputEvent({type:"keyDown",keyCode:"ENTER"});
  win.webContents.sendInputEvent({type:"keyUp",keyCode:"ENTER"});
  await wait(300);
}

async function run(){
  const temp=await mkdtemp(join(tmpdir(),"todo-dash-backlog-"));
  const db=createLocalDbService({filePath:databasePath(temp)});
  const ui=await staticServer();
  await db.listen();
  const win=new BrowserWindow({show:false,width:1440,height:900,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
  const errors=[];
  win.webContents.on("console-message",(_e,d)=>{if(d.level==="error")errors.push(d.message)});
  try{
    await win.loadURL(`http://127.0.0.1:${ui.port}/index.html`);
    await wait(800);

    const opened=await win.webContents.executeJavaScript(`(()=>{
      document.querySelector("[data-root-group-add]")?.click();
      const d=document.querySelector("[data-backlog-folder-dialog]");
      return {open:!!d?.open,focused:document.activeElement===d?.querySelector("[data-folder-dialog-name]")};
    })()`);
    if(!opened.open)throw new Error(`folder dialog did not open: ${JSON.stringify(opened)}`);
    await type(win,"Trabajo");

    let state=await win.webContents.executeJavaScript(`(async()=>{
      const db=await import("/src/db.js");
      const groups=await db.allBacklogGroups();
      const parent=groups.find(g=>g.name==="Trabajo"&&g.parentId===null);
      document.querySelector('[data-view="dashboard"]')?.click();
      await new Promise(r=>setTimeout(r,350));
      return {parentId:parent?.id||null,dashboardVisible:!!document.querySelector('.dashboard-backlog [data-backlog-group="'+parent?.id+'"]')};
    })()`);
    if(!state.parentId||!state.dashboardVisible)throw new Error(`calendar -> dashboard sync failed: ${JSON.stringify(state)}`);

    const childOpened=await win.webContents.executeJavaScript(`(()=>{
      const b=document.querySelector('.dashboard-backlog [data-group-add="${state.parentId}"]');
      b?.click();
      const d=document.querySelector("[data-backlog-folder-dialog]");
      return {open:!!d?.open,focused:document.activeElement===d?.querySelector("[data-folder-dialog-name]")};
    })()`);
    if(!childOpened.open)throw new Error(`dashboard child dialog did not open: ${JSON.stringify(childOpened)}`);
    await type(win,"Backend");

    state=await win.webContents.executeJavaScript(`(async()=>{
      const db=await import("/src/db.js");
      const groups=await db.allBacklogGroupl();
      const child=groups.find(g=>g.name==="Backend"&&g.parentId===${state.parentId});
      const dashVisible=!!document.querySelector('.dashboard-backlog [data-backlog-group="'+child?.id+'"]');
      document.querySelector('[data-view="calendar"]')?.click();
      await new Promise(r=>setTimeout(r,350));
      const calendarVisible=!!document.querySelector('[data-backlog-group="'+child?.id+'"]');
      if(child)await db.deleteBacklogGroup(child.id);
      await db.deleteBacklogGroup(${state.parentId});
      return {childId:child?.id||null,dashVisible,calendarVisible};
    })()`);
    if(!state.childId||!state.dashVisible||!state.calendarVisible||errors.length)throw new Error(`dashboard -> calendar sync failed: ${JSON.stringify({...state,errors})}`);
    console.log("TodoApp dashboard/backlog sync OK: real keyboard folder creation + shared hierarchy both ways");
  }finally{
    if(!win.isDestroyed())win.destroy();
    await close(ui.server);await db.close();await rm(temp,{recursive:true,force:true});
  }
}
app.whenReady().then(async()=>{try{await run();app.exit(0)}catch(e){console.error(e?.stack||e);app.exit(1)}});
