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
const wait=ms=>new Promise(r=>setTimeout(r,ms));

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

async function run(){
  const temp=await mkdtemp(join(tmpdir(),"todo-dashboard-create-"));
  const dbService=createLocalDbService({filePath:databasePath(temp)});
  const ui=await staticServer();
  await dbService.listen();
  const win=new BrowserWindow({show:false,width:1400,height:900,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
  const errors=[];
  win.webContents.on("console-message",(_e,d)=>{if(d.level==="error")errors.push(d.message)});
  try{
    await win.loadURL(`http://127.0.0.1:${ui.port}/index.html`);
    await wait(800);
    const opened=await win.webContents.executeJavaScript(`(()=>{
      document.querySelector('[data-view="dashboard"]').click();
      return new Promise(r=>setTimeout(()=>{
        document.querySelector("#create-task").click();
        r({open:document.querySelector("#task-dialog").open,title:document.querySelector("#modal-title").textContent,dateHidden:document.querySelector("#task-date").closest("label").classList.contains("hidden")});
      },300));
    })()`);
    if(!opened.open||!/backlog/i.test(opened.title)||!opened.dateHidden)throw new Error(`Dashboard create modal wrong: ${JSON.stringify(opened)}`);
    const created=await win.webContents.executeJavaScript(`(async()=>{
      document.querySelector("#task-title").value="Nueva desde dashboard";
      document.querySelector("#task-description").value="Debe quedar visible";
      document.querySelector("#task-form").requestSubmit();
      await new Promise(r=>setTimeout(r,650));
      const db=await import("/src/db.js");
      const task=(await db.allTasks()).find(t=>t.title==="Nueva desde dashboard");
      const dash=!!document.querySelector('.dashboard-backlog-root-tasks [data-backlog-task="'+task?.id+'"]');
      document.querySelector('[data-view="calendar"]').click();
      await new Promise(r=>setTimeout(r,450));
      const calendar=!!document.querySelector('[data-root-drop] [data-backlog-task="'+task?.id+'"]');
      if(task)await db.deleteTask(task.id);
      return {id:task?.id||null,startsAt:task?.startsAt??null,endsAt:task?.endsAt??null,group:task?.backlogGroupId??null,dash,calendar};
    })()`);
    if(!created.id||created.startsAt!==null||created.endsAt!==null||created.group!==null||!created.dash||!created.calendar||errors.length)throw new Error(`Dashboard create smoke failed: ${JSON.stringify({...created,errors})}`);
    console.log("TodoApp dashboard create smoke OK: new task stays visible in unified dashboard backlog and calendar root");
  }finally{
    if(!win.isDestroyed())win.destroy();
    await close(ui.server);
    await dbService.close();
    await rm(temp,{recursive:true,force:true});
  }
}
app.whenReady().then(async()=>{try{await run();app.exit(0)}catch(e){console.error(e?.stack||e);app.exit(1)}});
