import {app,BrowserWindow} from "electron";
import {createServer} from "node:http";
import {readFile,mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {extname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {createLocalDbService} from "../service/local-db-service.js";
import {databasePath} from "./db-store.js";

const repo=resolve(fileURLToPath(new URL(".",import.meta.url)),"..");
const mime=p=>({".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8"}[extname(p)]||"application/octet-stream");
async function staticServer(){const s=createServer(async(req,res)=>{try{const u=new URL(req.url||"/","http://127.0.0.1"),rel=u.pathname==="/"?"index.html":decodeURIComponent(u.pathname.slice(1)),f=resolve(repo,rel);if(!f.startsWith(`${repo}/`)&&f!==join(repo,"index.html")){res.writeHead(403);return res.end()}const body=await readFile(f);res.writeHead(200,{"content-type":mime(f),"cache-control":"no-store"});res.end(body)}catch{res.writeHead(404);res.end()}});await new Promise((ok,no)=>{s.once("error",no);s.listen(0,"127.0.0.1",ok)});return{server:s,port:s.address().port}}
async function close(s){if(s.listening)await new Promise((ok,no)=>s.close(e=>e?no(e):ok()))}
async function run(){
 const temp=await mkdtemp(join(tmpdir(),"todo-groups-e2e-")),dbs=createLocalDbService({filePath:databasePath(temp)}),staticUi=await staticServer();await dbs.listen();
 const win=new BrowserWindow({show:false,width:1440,height:900,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}}),errors=[];
 win.webContents.on("console-message",(_e,d)=>{if(d.level==="error")errors.push(d.message)});
 try{
  await win.loadURL(`http://127.0.0.1:${staticUi.port}/index.html`);await new Promise(r=>setTimeout(r,700));
  const result=await win.webContents.executeJavaScript(`(async()=>{try{
   const db=await import("/src/db.js"),info=await db.openDB(),wait=ms=>new Promise(r=>setTimeout(r,ms));
   const prompts=["Trabajo","Backend"];window.prompt=()=>prompts.shift()||null;window.confirm=()=>true;
   document.querySelector("[data-root-group-add]")?.click();await wait(180);
   let groups=await db.allBacklogGroups(),parent=groups.find(g=>g.name==="Trabajo");
   document.querySelector('[data-group-add="'+parent?.id+'"]')?.click();await wait(180);
   groups=await db.allBacklogGroups();const child=groups.find(g=>g.name==="Backend"&&g.parentId===parent?.id);
   const emptyVisible=!!document.querySelector('[data-group-drop="'+child?.id+'"] .backlog-folder-empty');
   const now=new Date().toISOString(),id=await db.saveTask({title:"Grouped E2E",description:"move me",startsAt:null,endsAt:null,backlogOrder:0,backlogGroupId:null,status:"not_started",criticality:"medium",recurrence:"none",recurrenceEnd:null,completedAt:null,createdAt:now,updatedAt:now});
   await window.todoRenderApp();await wait(150);
   let card=document.querySelector('[data-backlog-task="'+id+'"]'),drop=document.querySelector('[data-group-drop="'+child.id+'"]');
   const dt=new DataTransfer();card.dispatchEvent(new DragEvent("dragstart",{bubbles:true,cancelable:true,dataTransfer:dt}));drop.dispatchEvent(new DragEvent("dragover",{bubbles:true,cancelable:true,dataTransfer:dt}));drop.dispatchEvent(new DragEvent("drop",{bubbles:true,cancelable:true,dataTransfer:dt}));await wait(300);
   const grouped=await db.getTask(id),sameId=grouped?.id===id,groupedOk=grouped?.backlogGroupId===child.id;
   document.querySelector('[data-mode="day"]')?.click();await wait(150);
   card=document.querySelector('[data-backlog-task="'+id+'"]');const slot=document.querySelector('.time-slot[data-hour="14"]'),date=slot?.dataset.date,hour=Number(slot?.dataset.hour);
   const dt2=new DataTransfer();card.dispatchEvent(new DragEvent("dragstart",{bubbles:true,cancelable:true,dataTransfer:dt2}));slot.dispatchEvent(new DragEvent("dragover",{bubbles:true,cancelable:true,dataTransfer:dt2}));slot.dispatchEvent(new DragEvent("drop",{bubbles:true,cancelable:true,dataTransfer:dt2}));await wait(350);
   const saved=await db.getTask(id),start=new Date(saved.startsAt),end=new Date(saved.endsAt),scheduledDate=saved.startsAt?new Date(saved.startsAt).toLocaleDateString("en-CA"):null;
   const stillBacklog=!!document.querySelector('[data-backlog-task="'+id+'"]');
   await db.deleteTask(id);await db.deleteBacklogGroup(child.id);await db.deleteBacklogGroup(parent.id);
   return{schema:info.schemaVersion,parent:!!parent,child:!!child,emptyVisible,sameId,groupedOk,groupCleared:saved.backlogGroupId===null,orderCleared:saved.backlogOrder===null,duration:end-start,scheduledHour:start.getHours(),expectedHour:hour,scheduledDate,expectedDate:date,stillBacklog};
  }catch(e){return{scriptError:e?.stack||String(e)}}})()`);
  const ok=!result.scriptError&&result.schema===3&&result.parent&&result.child&&result.emptyVisible&&result.sameId&&result.groupedOk&&result.groupCleared&&result.orderCleared&&result.duration===3600000&&result.scheduledHour===result.expectedHour&&result.scheduledDate===result.expectedDate&&!result.stillBacklog&&!errors.length;
  if(!ok)throw new Error("Hierarchical backlog E2E failed: "+JSON.stringify({...result,errors}));
  console.log("TodoApp hierarchical backlog E2E OK: folder + subfolder + empty + task move + calendar schedule + SQLite v3");
 }finally{if(!win.isDestroyed())win.destroy();await close(staticUi.server);await dbs.close();await rm(temp,{recursive:true,force:true})}
}
app.whenReady().then(async()=>{try{await run();app.exit(0)}catch(e){console.error(e?.stack||e);app.exit(1)}});