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
async function staticServer(){
 const s=createServer(async(req,res)=>{try{
  const u=new URL(req.url||"/","http://127.0.0.1"),rel=u.pathname==="/"?"index.html":decodeURIComponent(u.pathname.slice(1)),f=resolve(repo,rel);
  if(!f.startsWith(`${repo}/`)&&f!==join(repo,"index.html")){res.writeHead(403);return res.end()}
  const body=await readFile(f);res.writeHead(200,{"content-type":mime(f),"cache-control":"no-store"});res.end(body)
 }catch{res.writeHead(404);res.end()}});
 await new Promise((ok,no)=>{s.once("error",no);s.listen(0,"127.0.0.1",ok)});
 return {server:s,port:s.address().port};
}
async function close(s){if(s.listening)await new Promise((ok,no)=>s.close(e=>e?no(e):ok()))}
async function run(){
 const temp=await mkdtemp(join(tmpdir(),"todo-backlog-ux-")),dbs=createLocalDbService({filePath:databasePath(temp)}),ui=await staticServer();
 await dbs.listen();
 const win=new BrowserWindow({show:false,width:1440,height:900,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}}),errors=[];
 win.webContents.on("console-message",(_e,d)=>{if(d.level==="error")errors.push(d.message)});
 try{
  await win.loadURL(`http://127.0.0.1:${ui.port}/index.html`);await new Promise(r=>setTimeout(r,700));
  const result=await win.webContents.executeJavaScript(`(async()=>{try{
   const db=await import("/src/db.js"),wait=ms=>new Promise(r=>setTimeout(r,ms));
   const createFolder=async name=>{
    document.querySelector("[data-root-group-add]").click();await wait(40);
    const form=document.querySelector("[data-group-form]"),input=form.querySelector("[data-group-name]");
    input.value=name;form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));await wait(180);
    return (await db.allBacklogGroups()).find(g=>g.name===name);
   };
   const first=await createFolder("Primera");
   const firstInitiallyOpen=document.querySelector('[data-group-toggle="'+first.id+'"]').getAttribute("aria-expanded")==="true";
   return {firstId:first.id,firstInitiallyOpen};
  }catch(e){return{error:e?.stack||String(e)}}})()`);
  if(result.error||!result.firstInitiallyOpen)throw new Error("pre-reload failed "+JSON.stringify(result));
  await win.reload();await new Promise(r=>setTimeout(r,800));
  const result2=await win.webContents.executeJavaScript(`(async()=>{try{
   const db=await import("/src/db.js"),wait=ms=>new Promise(r=>setTimeout(r,ms));
   const groups0=await db.allBacklogGroups(),first=groups0.find(g=>g.name==="Primera");
   const firstClosedDefault=document.querySelector('[data-group-toggle="'+first.id+'"]').getAttribute("aria-expanded")==="false";
   const createFolder=async name=>{
    document.querySelector("[data-root-group-add]").click();await wait(40);
    const form=document.querySelector("[data-group-form]"),input=form.querySelector("[data-group-name]");
    input.value=name;form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));await wait(180);
    return (await db.allBacklogGroups()).find(g=>g.name===name);
   };
   const second=await createFolder("Segunda");
   const firstStillClosed=document.querySelector('[data-group-toggle="'+first.id+'"]').getAttribute("aria-expanded")==="false";
   const secondOpen=document.querySelector('[data-group-toggle="'+second.id+'"]').getAttribute("aria-expanded")==="true";
   document.querySelector('[data-group-toggle="'+second.id+'"]').click();
   const secondClosed=document.querySelector('[data-group-toggle="'+second.id+'"]').getAttribute("aria-expanded")==="false";
   document.querySelector('[data-group-toggle="'+first.id+'"]').click();
   const firstReopened=document.querySelector('[data-group-toggle="'+first.id+'"]').getAttribute("aria-expanded")==="true";

   const now=new Date().toISOString(),id=await db.saveTask({title:"Tarjeta compacta",description:"segunda línea",startsAt:null,endsAt:null,backlogOrder:0,backlogGroupId:first.id,status:"not_started",criticality:"medium",recurrence:"none",recurrenceEnd:null,completedAt:null,createdAt:now,updatedAt:now});
   await window.todoRenderApp();await wait(150);
   let card=document.querySelector('[data-backlog-task="'+id+'"]'),style=getComputedStyle(card),rect=card.getBoundingClientRect();
   const compact=rect.width<=271&&rect.height<=60&&parseFloat(style.borderRadius)>=12&&!!card.querySelector(".backlog-copy b")&&!!card.querySelector(".backlog-copy small");

   const header=document.querySelector('[data-group-target="'+second.id+'"]'),dt=new DataTransfer();
   card.dispatchEvent(new DragEvent("dragstart",{bubbles:true,cancelable:true,dataTransfer:dt}));
   header.dispatchEvent(new DragEvent("dragover",{bubbles:true,cancelable:true,dataTransfer:dt}));
   header.dispatchEvent(new DragEvent("drop",{bubbles:true,cancelable:true,dataTransfer:dt}));await wait(250);
   const movedClosed=await db.getTask(id),movedToClosed=movedClosed.backlogGroupId===second.id;

   document.querySelector('[data-group-toggle="'+second.id+'"]').click();await wait(30);
   card=document.querySelector('[data-backlog-task="'+id+'"]');
   const root=document.querySelector("[data-root-drop]"),dt2=new DataTransfer();
   card.dispatchEvent(new DragEvent("dragstart",{bubbles:true,cancelable:true,dataTransfer:dt2}));
   root.dispatchEvent(new DragEvent("dragover",{bubbles:true,cancelable:true,dataTransfer:dt2}));
   root.dispatchEvent(new DragEvent("drop",{bubbles:true,cancelable:true,dataTransfer:dt2}));await wait(250);
   const movedRoot=await db.getTask(id),movedOut=movedRoot.backlogGroupId===null;

   await db.deleteTask(id);await db.deleteBacklogGroup(second.id);await db.deleteBacklogGroup(first.id);
   return{firstClosedDefault,firstStillClosed,secondOpen,secondClosed,firstReopened,compact,movedToClosed,movedOut,sameId:movedRoot.id===id};
  }catch(e){return{error:e?.stack||String(e)}}})()`);
  const ok=!result2.error&&Object.entries(result2).filter(([k])=>k!=="error").every(([,v])=>v===true)&&errors.length===0;
  if(!ok)throw new Error("Backlog UX E2E failed: "+JSON.stringify({...result2,errors}));
  console.log("TodoApp backlog UX E2E OK: compact two-line card + default collapse + last-created open + reopen + free moves");
 }finally{if(!win.isDestroyed())win.destroy();await close(ui.server);await dbs.close();await rm(temp,{recursive:true,force:true})}
}
app.whenReady().then(async()=>{try{await run();app.exit(0)}catch(e){console.error(e?.stack||e);app.exit(1)}});