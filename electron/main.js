import { app, BrowserWindow, ipcMain } from "electron";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TodoStore, databasePath } from "./db-store.js";
const here=fileURLToPath(new URL(".",import.meta.url));
const root=resolve(here,"..");
let store;
function registerIpc(){
  const h=(name,fn)=>ipcMain.handle(name,fn);
  h("db:info",()=>store.info());
  h("tasks:all",()=>store.allTasks());
  h("tasks:get",(_e,id)=>store.getTask(id));
  h("tasks:save",(_e,task)=>store.saveTask(task));
  h("tasks:delete",(_e,id)=>store.deleteTask(id));
  h("backlog-groups:all",()=>store.allBacklogGroups());
  h("backlog-groups:save",(_e,group)=>store.saveBacklogGroup(group));
  h("backlog-groups:delete",(_e,id)=>store.deleteBacklogGroup(id));
  h("settings:get",(_e,key,fallback)=>store.getSetting(key,fallback));
  h("settings:set",(_e,key,value)=>store.setSetting(key,value));
}
function createWindow(show=true){
  const win=new BrowserWindow({show:false,width:1440,height:900,minWidth:900,minHeight:640,backgroundColor:"#0b0d10",autoHideMenuBar:true,webPreferences:{preload:join(here,"preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.loadFile(join(root,"index.html"));
  if(show){
    win.once("ready-to-show",()=>{
      win.maximize();
      win.show();
    });
  }
  return win;
}
async function rendererSmoke(){
  const win=createWindow(false),errors=[];
  win.webContents.on("console-message",(_e,d)=>{if(d.level==="error")errors.push(d.message)});
  await new Promise(r=>setTimeout(r,700));
  const result=await win.webContents.executeJavaScript(`(async()=>{const info=await window.todoDb.info();const group=await window.todoDb.saveBacklogGroup({name:"Smoke",parentId:null,groupOrder:0});const now=new Date().toISOString();const id=await window.todoDb.saveTask({title:"Renderer smoke",description:"",startsAt:null,endsAt:null,backlogOrder:0,backlogGroupId:group,status:"not_started",criticality:"medium",recurrence:"none",recurrenceEnd:null,completedAt:null,createdAt:now,updatedAt:now});const saved=await window.todoDb.getTask(id);await window.todoDb.deleteTask(id);await window.todoDb.deleteBacklogGroup(group);return{schema:info.schemaVersion,group,savedGroup:saved.backlogGroupId,calendar:!!document.querySelector(".calendar-panel"),bridge:!!window.todoDb}})()`);
  if(!result.bridge||!result.calendar||result.schema!==3||result.savedGroup!==result.group||errors.length)throw new Error("Renderer smoke failed "+JSON.stringify({result,errors}));
  console.log("TodoApp renderer smoke OK: calendar + IPC + hierarchical backlog + SQLite schema 3");
  win.destroy();
}
app.whenReady().then(async()=>{
  store=new TodoStore(databasePath(app.getPath("userData")));
  registerIpc();
  if(process.argv.includes("--smoke-test")){console.log(`TodoApp smoke OK: SQLite schema ${store.info().schemaVersion}`);store.close();store=null;app.quit();return}
  if(process.argv.includes("--renderer-smoke-test")){try{await rendererSmoke();store.close();store=null;app.exit(0)}catch(e){console.error(e.stack||e);store?.close();store=null;app.exit(1)}return}
  createWindow(true);
  app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow(true)});
});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit()});
app.on("before-quit",()=>store?.close());
