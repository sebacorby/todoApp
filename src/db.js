const DEFAULT_SERVICE_URL="http://127.0.0.1:43127";
const desktop=()=>typeof window!=="undefined"&&window.todoDb?window.todoDb:null;
const serviceUrl=()=>(typeof window!=="undefined"&&window.__TODO_DB_SERVICE_URL__)||DEFAULT_SERVICE_URL;
async function request(path,options={}){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),2500);
 try{
  const response=await fetch(`${serviceUrl()}${path}`,{...options,headers:{"content-type":"application/json",...(options.headers||{})},signal:controller.signal});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(data.error||`Local DB service returned HTTP ${response.status}`);error.status=response.status;throw error}
  return data;
 }catch(error){
  if(error?.name==="AbortError"||error instanceof TypeError)throw new Error(`No se pudo conectar al servicio SQLite local en ${serviceUrl()}. Ejecutá "npm run db-service" y mantenelo activo.`);
  throw error;
 }finally{clearTimeout(timeout)}
}
export async function openDB(){const api=desktop();return api?api.info():request("/info")}
export async function allTasks(){const api=desktop();return api?api.allTasks():request("/tasks")}
export async function getTask(id){const api=desktop();if(api)return api.getTask(Number(id));try{return await request(`/tasks/${Number(id)}`)}catch(e){if(e.status===404)return null;throw e}}
export async function saveTask(task){const api=desktop();if(api)return api.saveTask(task);return (await request("/tasks",{method:"POST",body:JSON.stringify(task)})).id}
export async function deleteTask(id){const api=desktop();if(api)return api.deleteTask(Number(id));return (await request(`/tasks/${Number(id)}`,{method:"DELETE"})).deleted}
export async function allBacklogGroups(){const api=desktop();return api?api.allBacklogGroups():request("/backlog-groups")}
export async function saveBacklogGroup(group){const api=desktop();if(api)return api.saveBacklogGroup(group);return (await request("/backlog-groups",{method:"POST",body:JSON.stringify(group)})).id}
export async function deleteBacklogGroup(id){const api=desktop();if(api)return api.deleteBacklogGroup(Number(id));return (await request(`/backlog-groups/${Number(id)}`,{method:"DELETE"})).deleted}
export async function getSetting(key,fallback=null){const api=desktop();if(api)return api.getSetting(key,fallback);try{return (await request(`/settings/${encodeURIComponent(key)}`)).value}catch(e){if(e.status===404)return fallback;throw e}}
export async function saveSetting(key,value){const api=desktop();if(api)return api.saveSetting(key,value);return (await request(`/settings/${encodeURIComponent(key)}`,{method:"PUT",body:JSON.stringify({value})})).value}
export const deleteBackogGroup = deleteBacklogGroup;
