import { allTasks, allBacklogGroups, getTask, saveTask } from "./db.js";

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ordered = (groups, parent=null) => groups.filter(g => (g.parentId ?? null) === parent).sort((a,b)=>(a.groupOrder??0)-(b.groupOrder??0)||a.id-b.id);
const backlogOnly = tasks => tasks.filter(t => !t.startsAt && !t.endsAt).sort((a,b)=>(a.backlogOrder??999999)-(b.backlogOrder??999999)||a.id-b.id);

function options(groups, selected, parent=null, depth=0){
  return ordered(groups,parent).map(g => `<option value="${g.id}" ${Number(selected)===g.id?"selected":""}>${depth?"— ".repeat(depth):""}${esc(g.name)}</option>${options(groups,selected,g.id,depth+1)}`).join("");
}
function card(task, groups){
  return `<article class="dash-backlog-row" data-dash-backlog-task="${task.id}">
    <div><b>${esc(task.title)}</b><small>${esc(task.description||"Sin descripción")}</small></div>
    <select data-dash-backlog-move aria-label="Carpeta de ${esc(task.title)}">
      <option value="" ${task.backlogGroupId==null?"selected":""}>Sin categoría</option>${options(groups,task.backlogGroupId)}
    </select>
    <button data-dash-backlog-edit>Editar</button>
  </article>`;
}
function branch(groups,tasks,parent=null,depth=0){
  return ordered(groups,parent).map(g=>{
    const own=tasks.filter(t=>(t.backlogGroupId??null)===g.id);
    return `<section class="dash-backlog-folder" data-dashboard-group="${g.id}" style="--depth:${depth}">
      <header><span>📁</span><b>${esc(g.name)}</b><em>${own.length}</em></header>
      <div>${own.length?own.map(t=>card(t,groups)).join(""):'<small class="dash-backlog-empty">Sin tareas directas</small>'}</div>
      ${branch(groups,tasks,g.id,depth+1)}
    </section>`;
  }).join("");
}
async function replaceDashboardBacklog(){
  if(!document.querySelector('.nav-item[data-view="dashboard"].active')) return;
  const host=document.querySelector(".dashboard-backlog");
  if(!host || host.dataset.taskListReady==="1") return;
  const [tasks,groups]=await Promise.all([allTasks(),allBacklogGroups()]);
  const backlog=backlogOnly(tasks),root=backlog.filter(t=>t.backlogGroupId==null);
  host.dataset.taskListReady="1";
  host.className="dashboard-panel dashboard-backlog dashboard-backlog-task-list";
  host.innerHTML=`<div class="dashboard-section-head"><div><p class="eyebrow">BACKLOG</p><h2>Tareas por carpetas</h2></div><small>Misma estructura de carpetas, mostrada como lista de tareas.</small></div>
    <div class="dashboard-backlog-hierarchy">
      <section class="dash-backlog-root"><header><b>Sin categoría</b><em>${root.length}</em></header><div>${root.length?root.map(t=>card(t,groups)).join(""):'<small class="dash-backlog-empty">Sin tareas</small>'}</div></section>
      ${branch(groups,backlog)}
    </div>`;
}
let timer;
const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>replaceDashboardBacklog().catch(console.error),80)};
new MutationObserver(schedule).observe(document.querySelector("#content"),{childList:true,subtree:true});
document.addEventListener("click",e=>{
  const button=e.target.closest("[data-dash-backlog-edit]");
  if(button) window.todoOpenTaskModal?.(Number(button.closest("[data-dash-backlog-task]").dataset.dashBacklogTask));
});
document.addEventListener("change",async e=>{
  const select=e.target.closest("[data-dash-backlog-move]");
  if(!select)return;
  const id=Number(select.closest("[data-dash-backlog-task]").dataset.dashBacklogTask);
  const task=await getTask(id);
  if(!task || task.startsAt || task.endsAt)return;
  const target=select.value===""?null:Number(select.value);
  const siblings=backlogOnly(await allTasks()).filter(t=>t.id!==id&&(t.backlogGroupId??null)===target);
  task.backlogGroupId=target;
  task.backlogOrder=siblings.length;
  task.updatedAt=new Date().toISOString();
  await saveTask(task);
  await window.todoRenderDash?.();
  schedule();
});
const style=document.createElement("style");
style.dataset.dashboardBacklogTaskList="";
style.textContent=`.dashboard-backlog-task-list .backlog-panel{display:none!important}.dashboard-backlog-hierarchy{display:grid;gap:8px}.dash-backlog-root,.dash-backlog-folder{display:grid;gap:7px}.dash-backlog-folder{margin-left:calc(var(--depth)*16px);padding-left:10px;border-left:1px solid #27303a}.dash-backlog-root>header,.dash-backlog-folder>header{displax:flex;align-items:center;gap:7px;min-height:30px}.dash-backlog-root>header em,.dash-backlog-folder>header em{margin-left:auto;font-style:normal;color:var(--muted);font-size:10px}.dash-backlog-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,230px) auto;gap:10px;align-items:center;border:1px solid var(--border);border-radius:12px;background:#0e1217;padding:9px 10px;margin:6px 0}.dash-backlog-row>div{min-width:0}.dash-backlog-row b,.dash-backlog-row small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dash-backlog-row small,.dash-backlog-empty{color:var(--muted)}.dash-backlog-row select,.dash-backlog-row button{border:1px solid var(--border);background:var(--surface2);color:var(--text);border-radius:9px;padding:8px 10px}.dash-backlog-empty{display:block;padding:8px 10px;border:1px dashed #29313a;border-radius:9px}@media(max-width:900px){.dash-backlog-row{grid-template-columns:1fr}.dash-backlog-row select,.dash-backlog-row button{width:100%}}`;
document.head.append(style);
schedule();
