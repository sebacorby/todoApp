const DB_NAME="todoApp",DB_VERSION=2;
let dbPromise;
export function openDB(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB_NAME,DB_VERSION);
    r.onupgradeneeded=()=>{
      const d=r.result;
      const t=d.objectStoreNames.contains("tasks")?r.transaction.objectStore("tasks"):d.createObjectStore("tasks",{keyPath:"id",autoIncrement:true});
      for(const [name,key] of [["startsAt","startsAt"],["status","status"],["criticality","criticality"]])if(!t.indexNames.contains(name))t.createIndex(name,key);
      if(!d.objectStoreNames.contains("settings"))d.createObjectStore("settings",{keyPath:"key"});
    };
    r.onsuccess=()=>resolve(r.result);
    r.onerror=()=>reject(r.error);
  });
  return dbPromise;
}
const req=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
async function store(mode="readonly"){const db=await openDB();return db.transaction("tasks",mode).objectStore("tasks")}
export async function allTasks(){return req((await store()).getAll())}
export async function getTask(id){return req((await store()).get(Number(id)))}
export async function saveTask(task){return req((await store("readwrite")).put(task))}
export async function deleteTask(id){return req((await store("readwrite")).delete(Number(id)))}
