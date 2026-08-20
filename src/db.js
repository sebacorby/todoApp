function api(){if(!window.todoDb)throw new Error("TodoApp debe ejecutarse como aplicación de escritorio.");return window.todoDb}
export async function openDB(){return api().info()}
export async function allTasks(){return api().allTasks()}
export async function getTask(id){return api().getTask(Number(id))}
export async function saveTask(task){return api().saveTask(task)}
export async function deleteTask(id){return api().deleteTask(Number(id))}
export async function getSetting(key,fallback=null){return api().getSetting(key,fallback)}
export async function saveSetting(key,value){return api().saveSetting(key,value)}
