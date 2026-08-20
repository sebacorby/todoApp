import http from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { TodoStore, databasePath } from "../electron/db-store.js";
export const DEFAULT_DB_SERVICE_PORT=43127;
const ALLOWED=/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i;
export function defaultServiceDataRoot({env=process.env,platform=process.platform,home=homedir()}={}){
 if(platform==="win32")return join(env.APPDATA||join(home,"AppData","Roaming"),"TodoApp");
 if(platform==="darwin")return join(home,"Library","Application Support","TodoApp");
 return join(env.XDG_CONFIG_HOME||join(home,".config"),"TodoApp");
}
export const defaultServiceDatabasePath=options=>databasePath(defaultServiceDataRoot(options));
function json(res,status,value,origin){const body=JSON.stringify(value);res.writeHead(status,{"content-type":"application/json; charset=utf-8","content-length":Buffer.byteLength(body),"cache-control":"no-store",...(origin?{"access-control-allow-origin":origin,vary:"Origin"}:{})});res.end(body)}
async function readJson(req){const chunks=[];for await(const c of req)chunks.push(c);return chunks.length?JSON.parse(Buffer.concat(chunks).toString("utf8")):{}}
export function createLocalDbService({filePath=defaultServiceDatabasePath(),host="127.0.0.1",port=DEFAULT_DB_SERVICE_PORT}={}){
 const store=new TodoStore(filePath);
 const server=http.createServer(async(req,res)=>{
  const rawOrigin=req.headers.origin,origin=!rawOrigin?null:ALLOWED.test(rawOrigin)?rawOrigin:false;
  if(origin===false)return json(res,403,{error:"Origin not allowed"});
  if(req.method==="OPTIONS"){res.writeHead(204,{...(origin?{"access-control-allow-origin":origin,vary:"Origin"}:{}),"access-control-allow-methods":"GET,POST,PUT,DELETE,OPTIONS","access-control-allow-headers":"content-type"});return res.end()}
  try{
   const url=new URL(req.url||"/",`http://${req.headers.host||`${host}:${port}`}`),parts=url.pathname.split("/").filter(Boolean);
   if(req.method==="GET"&&url.pathname==="/info")return json(res,200,store.info(),origin);
   if(req.method==="GET"&&url.pathname==="/tasks")return json(res,200,store.allTasks(),origin);
   if(req.method==="POST"&&url.pathname==="/tasks")return json(res,200,{id:store.saveTask(await readJson(req))},origin);
   if(parts[0]==="tasks"&&parts[1]){
    const id=Number(parts[1]);if(!Number.isInteger(id)||id<=0)return json(res,400,{error:"Invalid task id"},origin);
    if(req.method==="GET"){const t=store.getTask(id);return t?json(res,200,t,origin):json(res,404,{error:"Task not found"},origin)}
    if(req.method==="DELETE")return json(res,200,{deleted:store.deleteTask(id)},origin);
   }
   if(req.method==="GET"&&url.pathname==="/backlog-groups")return json(res,200,store.allBacklogGroups(),origin);
   if(req.method==="POST"&&url.pathname==="/backlog-groups")return json(res,200,{id:store.saveBacklogGroup(await readJson(req))},origin);
   if(parts[0]==="backlog-groups"&&parts[1]&&req.method==="DELETE")return json(res,200,{deleted:store.deleteBacklogGroup(Number(parts[1]))},origin);
   if(parts[0]==="settings"&&parts[1]){
    const key=decodeURIComponent(parts.slice(1).join("/"));
    if(req.method==="GET"){const row=store.db.prepare("SELECT value_json FROM settings WHERE key=?").get(key);return row?json(res,200,{value:JSON.parse(row.value_json)},origin):json(res,404,{error:"Setting not found"},origin)}
    if(req.method==="PUT"){const {value}=await readJson(req);return json(res,200,{value:store.setSetting(key,value)},origin)}
   }
   json(res,404,{error:"Not found"},origin);
  }catch(e){json(res,500,{error:e?.message||String(e)},origin)}
 });
 return{store,server,async listen(){await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(port,host,resolve)});const a=server.address();return{host,port:typeof a==="object"&&a?a.port:port,filePath}},async close(){if(server.listening)await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));store.close()}};
}
async function main(){const s=createLocalDbService(),i=await s.listen();console.log(`TodoApp local DB service listening on http://${i.host}:${i.port}`);console.log(`SQLite: ${i.filePath}`);const stop=async()=>{try{await s.close()}finally{process.exit(0)}};process.on("SIGINT",stop);process.on("SIGTERM",stop)}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.stack||e);process.exit(1)});
