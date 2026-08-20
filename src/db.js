const DB_NAME="todoApp",DB_VERSION=2;
let dbPromise;
export function openDB(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  const r=indexedDB.open(DB_NAME,DB_VERSION);
  r.onupgradeneeded=()=>{const d=r.result,t=d.objectStoreNames.contains("tasks")?r.transaction.objectStore("tasks"):d.createObjectStore("tasks",{keyPath:"id",autoIncrement:true});for(const [n,k] of [["startsAt","startsAt"],["status","status"],["criticality","criticality"]])if(!t.indexNames.contains(n))t.createIndex(n,k);if(!d.objectStoreNames.contains("settings"))d.createObjectStore("settings",{keyPath:"key"})};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)
 });
 return dbPromise
}
const req=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
async function taskStore(mode="readonly"){const db=await openDB();return db.transaction("tasks",mode).objectStore("tasks")}
async function settingStore(mode="readonly"){const db=await openDB();return db.transaction("settings",mode).objectStore("settings")}
export async function allTasks(){return req((await taskStore()).getAll())}
export async function getTask(id){return req((await taskStore()).get(Number(id)))}
export async function saveTask(task){return req((await taskStore("readwrite")).put(task))}
export async function deleteTask(id){return req((await taskStore("readwrite")).delete(Number(id)))}
export async function getSetting(key,fallback=null){const v=await req((await settingStore()).get(key));return v?.value??fallback}
export async function saveSetting(key,value){return req((await settingStore("readwrite")).put({key,value,updatedAt:new Date().toISOString()}))}
