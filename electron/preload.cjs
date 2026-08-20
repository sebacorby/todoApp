const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("todoDb", Object.freeze({
  info:()=>ipcRenderer.invoke("db:info"),
  allTasks:()=>ipcRenderer.invoke("tasks:all"),
  getTask:id=>ipcRenderer.invoke("tasks:get",id),
  saveTask:task=>ipcRenderer.invoke("tasks:save",task),
  deleteTask:id=>ipcRenderer.invoke("tasks:delete",id),
  allBacklogGroups:()=>ipcRenderer.invoke("backlog-groups:all"),
  saveBacklogGroup:group=>ipcRenderer.invoke("backlog-groups:save",group),
  deleteBacklogGroup:id=>ipcRenderer.invoke("backlog-groups:delete",id),
  getSetting:(key,fallback=null)=>ipcRenderer.invoke("settings:get",key,fallback),
  saveSetting:(key,value)=>ipcRenderer.invoke("settings:set",key,value)
}));
