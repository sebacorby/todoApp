import {app,BrowserWindow} from "electron";
import {createServer} from "node:http";
import {readFile,mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {extname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {createLocalDbService} from "../service/local-db-service.js";
import {databasePath} from "./db-store.js";

const repo=resolve(fileURLToPath(new URL(".",import.meta.url)),"..");
const mime=path=>({".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8"}[extname(path)]||"application/octet-stream");

async function startStaticServer(){
  const server=createServer(async(req,res)=>{
    try{
      const url=new URL(req.url||"/","http://127.0.0.1");
      const relative=url.pathname==="/"?"index.html":decodeURIComponent(url.pathname.slice(1));
      const file=resolve(repo,relative);
      if(!file.startsWith(`${repo}/`)&&file!==join(repo,"index.html")){res.writeHead(403);res.end();return}
      const body=await readFile(file);
      res.writeHead(200,{"content-type":mime(file),"cache-control":"no-store"});
      res.end(body);
    }catch{res.writeHead(404);res.end()}
  });
  await new Promise((ok,no)=>{server.once("error",no);server.listen(0,"127.0.0.1",ok)});
  return {server,port:server.address().port};
}
async function closeServer(server){
  if(server.listening)await new Promise((ok,no)=>server.close(error=>error?no(error):ok()));
}

async function run(){
  const temp=await mkdtemp(join(tmpdir(),"todo-delete-folder-smoke-"));
  const dbService=createLocalDbService({filePath:databasePath(temp)});
  const ui=await startStaticServer();
  await dbService.listen();
  const win=new BrowserWindow({show:false,width:1440,height:900,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
  const consoleErrors=[];
  win.webContents.on("console-message",(_event,details)=>{if(details.level==="error")consoleErrors.push(details.message)});
  try{
    await win.loadURL(`http://127.0.0.1:${ui.port}/index.html`);
    await new Promise(r=>setTimeout(r,700));
    const result=await win.webContents.executeJavaScript(`(async()=>{
      try{
        const db=await import("/src/db.js");
        await db.openDB();
        window.confirm=()=>true;
        window.__deleteAlerts=[];
        window.alert=message=>window.__deleteAlerts.push(String(message));
        const now=new Date().toISOString();

        const emptyId=await db.saveBacklogGroup({name:"Vacía",parentId:null,groupOrder:0});
        const taskFolderId=await db.saveBacklogGroup({name:"Con tarea",parentId:null,groupOrder:1});
        const parentId=await db.saveBacklogGroup({name:"Padre",parentId:null,groupOrder:2});
        const childId=await db.saveBacklogGroup({name:"Hija",parentId:parentId,groupOrder:0});
        const taskId=await db.saveTask({
          title:"Hija",description:"",startsAt:null,endsAt:null,
          backlogOrder:0,backlogGroupId:taskFolderId,status:"not_started",
          criticality:"medium",recurrence:"none",recurrenceEnd:null,
          completedAt:null,createdAt:now,updatedAt:now
        });

        await window.todoRenderApp();
        await new Promise(r=>setTimeout(r,150));

        document.querySelector('[data-group-delete="'+emptyId+'"]')?.click();
        await new Promise(r=>setTimeout(r,250));
        let groups=await db.allBacklogGroups();
        const emptyDeleted=!groups.some(group=>group.id===emptyId);

        document.querySelector('[data-group-delete="'+taskFolderId+'"]')?.click();
        await new Promise(r=>setTimeout(r,250));
        groups=await db.allBacklogGroups();
        const taskFolderKept=groups.some(group=>group.id===taskFolderId);

        document.querySelector('[data-group-delete="'+parentId+'"]')?.click();
        await new Promise(r=>setTimeout(r,250));
        groups=await db.allBacklogGroups();
        const parentKept=groups.some(group=>group.id===parentId);
        const childKept=groups.some(group=>group.id===childId);
        const blockedAlerts=window.__deleteAlerts.length>=2;

        await db.deleteTask(taskId);
        await db.deleteBacklogGroup(taskFolderId);
        await db.deleteBacklogGroup(childId);
        await db.deleteBacklogGroup(parentId);

        return {emptyDeleted,taskFolderKept,parentKept,childKept,blockedAlerts};
      }catch(error){return {error:error?.stack||String(error)}}
    })()`);

    const ok=!result.error&&result.emptyDeleted&&result.taskFolderKept&&result.parentKept&&result.childKept&&result.blockedAlerts&&consoleErrors.length===0;
    if(!ok)throw new Error(`Backlog delete smoke failed: ${JSON.stringify({...result,consoleErrors})}`);
    console.log("TodoApp backlog delete smoke OK: empty folder deleted; task/child folders blocked");
  }finally{
    if(!win.isDestroyed())win.destroy();
    await closeServer(ui.server);
    await dbService.close();
    await rm(temp,{recursive:true,force:true});
  }
}
app.whenReady().then(async()=>{try{await run();app.exit(0)}catch(error){console.error(error?.stack||error);app.exit(1)}});
