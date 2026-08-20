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
      const relative=url.pathname==="/"
        ?"index.html"
        :decodeURIComponent(url.pathname.slice(1));
      const file=resolve(repo,relative);
      if(!file.startsWith(`${repo}/`)&&file!==join(repo,"index.html")){
        res.writeHead(403);res.end();return;
      }
      const body=await readFile(file);
      res.writeHead(200,{"content-type":mime(file),"cache-control":"no-store"});
      res.end(body);
    }catch{
      res.writeHead(404);res.end();
    }
  });
  await new Promise((resolvePromise,reject)=>{
    server.once("error",reject);
    server.listen(0,"127.0.0.1",resolvePromise);
  });
  return {server,port:server.address().port};
}

async function closeServer(server){
  if(!server.listening)return;
  await new Promise((resolvePromise,reject)=>
    server.close(error=>error?reject(error):resolvePromise())
  );
}

async function run(){
  const temp=await mkdtemp(join(tmpdir(),"todo-group-form-"));
  const dbService=createLocalDbService({filePath:databasePath(temp)});
  const staticUi=await startStaticServer();
  await dbService.listen();

  const win=new BrowserWindow({
    show:false,
    width:1440,
    height:900,
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true},
  });
  const consoleErrors=[];
  win.webContents.on("console-message",(_event,details)=>{
    if(details.level==="error")consoleErrors.push(details.message);
  });

  try{
    await win.loadURL(`http://127.0.0.1:${staticUi.port}/index.html`);
    await new Promise(resolvePromise=>setTimeout(resolvePromise,700));

    const result=await win.webContents.executeJavaScript(`(async()=>{
      try{
        const db=await import("/src/db.js");
        await db.openDB();

        const rootButton=document.querySelector("[data-root-group-add]");
        rootButton?.click();
        await new Promise(r=>setTimeout(r,50));

        const form=document.querySelector("[data-group-form]");
        const input=form?.querySelector("[data-group-name]");
        const formVisible=!!form&&!form.classList.contains("hidden");
        if(!formVisible||!input){
          return {error:"Group form did not open",formVisible,hasInput:!!input};
        }

        input.value="Trabajo";
        form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
        await new Promise(r=>setTimeout(r,200));

        let groups=await db.allBacklogGroups();
        const parent=groups.find(group=>group.name==="Trabajo"&&group.parentId===null);
        const parentVisible=!!document.querySelector('[data-backlog-group="'+parent?.id+'"]');

        document.querySelector('[data-group-add="'+parent?.id+'"]')?.click();
        await new Promise(r=>setTimeout(r,50));

        const childForm=document.querySelector("[data-group-form]");
        const childInput=childForm?.querySelector("[data-group-name]");
        const childFormVisible=!!childForm&&!childForm.classList.contains("hidden");
        childInput.value="Backend";
        childForm.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
        await new Promise(r=>setTimeout(r,200));

        groups=await db.allBacklogGroups();
        const child=groups.find(group=>group.name==="Backend"&&group.parentId===parent?.id);
        const childVisible=!!document.querySelector('[data-backlog-group="'+child?.id+'"]');

        if(child)await db.deleteBacklogGroup(child.id);
        if(parent)await db.deleteBacklogGroup(parent.id);

        return {
          formVisible,
          childFormVisible,
          parentCreated:!!parent,
          parentVisible,
          childCreated:!!child,
          childVisible,
        };
      }catch(error){
        return {error:error?.stack||String(error)};
      }
    })()`);

    const ok=
      !result.error &&
      result.formVisible &&
      result.childFormVisible &&
      result.parentCreated &&
      result.parentVisible &&
      result.childCreated &&
      result.childVisible &&
      consoleErrors.length===0;

    if(!ok){
      throw new Error(`Backlog group + smoke failed: ${JSON.stringify({...result,consoleErrors})}`);
    }

    console.log("TodoApp backlog folder + smoke OK: root folder + subfolder created from in-panel form");
  }finally{
    if(!win.isDestroyed())win.destroy();
    await closeServer(staticUi.server);
    await dbService.close();
    await rm(temp,{recursive:true,force:true});
  }
}

app.whenReady().then(async()=>{
  try{
    await run();
    app.exit(0);
  }catch(error){
    console.error(error?.stack||error);
    app.exit(1);
  }
});
