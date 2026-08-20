if(!document.querySelector('link[data-backlog-css]')){
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href="./src/backlog.css";
  link.dataset.backlogCss="";
  document.head.append(link);
}

if(!document.querySelector('style[data-backlog-form-style]')){
  const style=document.createElement("style");
  style.dataset.backlogFormStyle="";
  style.textContent=`.backlog-group-form{display:grid;gap:8px;margin:10px 0 2px;padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--surface2)}.backlog-group-form.hidden{display:none}.backlog-group-form input{width:100%;height:34px;border:1px solid var(--border);border-radius:9px;background:#0e1217;color:#eef3f8;padding:0 10px;outline:none}.backlog-group-form input:focus{border-color:var(--accent)}.backlog-group-form>div{display:flex;gap:7px;justify-content:flex-end}.backlog-group-form button{height:30px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:#d9e2ec;padding:0 10px}.backlog-group-form [data-group-submit]{background:var(--accent);color:#10131a;border-color:transparent;font-weight:700}`;
  document.head.append(style);
}

import {saveTask,allBacklogGroups,saveBacklogGroup,deleteBacklogGroup} from "./db.js";
import {backlogTasks,tasksInGroup,reorderBacklog} from "./backlog-model.js";

const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const eye=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.4 12s3.5-6 9.6-6 9.6 6 9.6 6-3.5 6-9.6 6-9.6-6-9.6-6Z"/><circle cx="12" cy="12" r="2.7"/></svg>`;
let colors={};

const card=t=>`<article class="backlog-card" draggable="true" data-backlog-task="${t.id}" data-group="${t.backlogGroupId??""}" style="--task-color:${colors[t.criticality]}">
  <span class="backlog-grip">⠿</span>
  <div class="backlog-copy"><b>${esc(t.title)}</b><small>${esc(t.description||"Sin descripción")}</small></div>
  <button class="backlog-eye" data-backlog-open="${t.id}" aria-label="Abrir ${esc(t.title)}">${eye}</button>
</article>`;

const tree=(groups,tasks,parent=null,depth=0)=>groups
  .filter(g=>(g.parentId??null)===parent)
  .sort((a,b)=>a.groupOrder-b.groupOrder||a.id-b.id)
  .map(g=>{
    const items=tasksInGroup(tasks,g.id);
    return `<section class="backlog-group" style="--depth:${depth}" data-backlog-group="${g.id}">
      <div class="backlog-group-head">
        <span>📁</span><b>${esc(g.name)}</b><em>${items.length}</em>
        <button data-group-add="${g.id}" title="Nueva subcarpeta" aria-label="Nueva subcarpeta en ${esc(g.name)}">＋</button>
        <button data-group-rename="${g.id}" title="Renombrar" aria-label="Renombrar ${esc(g.name)}">✎</button>
        <button data-group-delete="${g.id}" title="Eliminar" aria-label="Eliminar ${esc(g.name)}">×</button>
      </div>
      <div class="backlog-group-drop" data-group-drop="${g.id}">
        ${items.map(card).join("")||'<div class="backlog-folder-empty">Soltá tareas aquí</div>'}
      </div>
      ${tree(groups,tasks,g.id,depth+1)}
    </section>`;
  }).join("");

export function backlogHTML(tasks,c){
  colors=c;
  return `<aside class="backlog-panel" data-backlog>
    <header>
      <div><p>BACKLOG</p><h2>Sin fecha</h2></div>
      <div class="backlog-header-actions">
        <button class="backlog-folder-add" data-root-group-add title="Crear carpeta" aria-label="Crear carpeta">📁＋</button>
        <button class="backlog-add" data-backlog-add aria-label="Agregar tarea">+</button>
      </div>
    </header>
    <form class="backlog-group-form hidden" data-group-form>
      <input data-group-name maxlength="80" autocomplete="off" placeholder="Nombre de la carpeta" aria-label="Nombre de la carpeta">
      <div>
        <button type="submit" data-group-submit>Crear</button>
        <button type="button" data-group-cancel>Cancelar</button>
      </div>
    </form>
    <p class="backlog-help">Creá carpetas y subcarpetas. Arrastrá tareas para organizarlas o soltálas en el calendario.</p>
    <div class="backlog-tree" data-backlog-tree><div class="backlog-empty">Cargando…</div></div>
  </aside>`;
}

async function persist(items){
  const now=new Date().toISOString();
  for(const task of items) await saveTask({...task,updatedAt:now});
}

async function move(tasks,id,target,before=null){
  const task=backlogTasks(tasks).find(item=>item.id===Number(id));
  if(!task)return;
  const source=task.backlogGroupId??null;
  await persist(reorderBacklog(tasks,id,before,target));
  if(source!==target){
    await persist(
      tasksInGroup(tasks,source)
        .filter(item=>item.id!==Number(id))
        .map((item,index)=>({...item,backlogOrder:index}))
    );
  }
}

function bindCards(root,tasks,openTask,onChanged){
  root.querySelectorAll("[data-backlog-open]").forEach(button=>{
    button.onclick=event=>{
      event.stopPropagation();
      openTask(Number(button.dataset.backlogOpen));
    };
  });

  root.querySelectorAll("[data-backlog-task]").forEach(cardEl=>{
    cardEl.ondragstart=event=>{
      event.dataTransfer.setData("text/task-id",cardEl.dataset.backlogTask);
      event.dataTransfer.setData("text/task-source","backlog");
      event.dataTransfer.effectAllowed="move";
      cardEl.classList.add("dragging");
    };
    cardEl.ondragend=()=>cardEl.classList.remove("dragging");
    cardEl.ondragover=event=>{
      event.preventDefault();
      event.stopPropagation();
      cardEl.classList.add("drag-over");
    };
    cardEl.ondragleave=()=>cardEl.classList.remove("drag-over");
    cardEl.ondrop=async event=>{
      event.preventDefault();
      event.stopPropagation();
      cardEl.classList.remove("drag-over");
      const id=Number(event.dataTransfer.getData("text/task-id"));
      if(!id||id===Number(cardEl.dataset.backlogTask))return;
      await move(
        tasks,
        id,
        cardEl.dataset.group===""?null:Number(cardEl.dataset.group),
        Number(cardEl.dataset.backlogTask),
      );
      await onChanged();
    };
  });
}

function bindZones(root,tasks,onChanged){
  root.querySelectorAll("[data-group-drop],[data-root-drop]").forEach(zone=>{
    zone.ondragover=event=>{
      event.preventDefault();
      zone.classList.add("drag-over");
    };
    zone.ondragleave=()=>zone.classList.remove("drag-over");
    zone.ondrop=async event=>{
      if(event.target.closest("[data-backlog-task]"))return;
      event.preventDefault();
      zone.classList.remove("drag-over");
      const id=Number(event.dataTransfer.getData("text/task-id"));
      if(!id)return;
      await move(tasks,id,zone.dataset.groupDrop?Number(zone.dataset.groupDrop):null);
      await onChanged();
    };
  });
}

function openGroupForm(root,{parentId=null,group=null}={}){
  const form=root.querySelector("[data-group-form]");
  const input=form?.querySelector("[data-group-name]");
  const submit=form?.querySelector("[data-group-submit]");
  if(!form||!input||!submit)return;

  form.dataset.mode=group?"rename":"create";
  form.dataset.parentId=parentId==null?"":String(parentId);
  form.dataset.groupId=group?.id?String(group.id):"";
  input.value=group?.name||"";
  input.placeholder=group?"Nuevo nombre":"Nombre de la carpeta";
  submit.textContent=group?"Guardar":"Crear";
  form.classList.remove("hidden");
  requestAnimationFrame(()=>input.focus());
}

function closeGroupForm(root){
  const form=root.querySelector("[data-group-form]");
  if(!form)return;
  form.classList.add("hidden");
  form.reset();
  form.dataset.mode="";
  form.dataset.parentId="";
  form.dataset.groupId="";
}

function bindGroupForm(root,groups,onChanged){
  const form=root.querySelector("[data-group-form]");
  const input=form?.querySelector("[data-group-name]");
  if(!form||!input)return;

  root.querySelector("[data-group-cancel]")?.addEventListener("click",()=>closeGroupForm(root));

  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const name=input.value.trim();
    if(!name){
      input.focus();
      return;
    }

    const mode=form.dataset.mode;
    const groupId=Number(form.dataset.groupId)||null;
    const parentId=form.dataset.parentId===""?null:Number(form.dataset.parentId);

    if(mode==="rename"&&groupId){
      const group=groups.find(item=>item.id===groupId);
      if(group&&group.name!==name){
        await saveBacklogGroup({...group,name,updatedAt:new Date().toISOString()});
      }
    }else{
      const siblings=groups.filter(item=>(item.parentId??null)===(parentId??null));
      const groupOrder=siblings.length
        ? Math.max(...siblings.map(item=>item.groupOrder??0))+1
        : 0;
      await saveBacklogGroup({name,parentId,groupOrder});
    }

    closeGroupForm(root);
    await onChanged();
  });
}

export async function bindBacklog({root,tasks,openTask,onChanged}){
  root.querySelector("[data-backlog-add]")?.addEventListener("click",()=>openTask(null,null,{backlog:true}));

  const groups=await allBacklogGroups();
  const rootTasks=tasksInGroup(tasks,null);
  const host=root.querySelector("[data-backlog-tree]");

  host.innerHTML=`<section class="backlog-root">
      <div class="backlog-group-head root-head"><b>Sin categoría</b><em>${rootTasks.length}</em></div>
      <div class="backlog-group-drop" data-root-drop>
        ${rootTasks.map(card).join("")||'<div class="backlog-folder-empty">Soltá tareas aquí</div>'}
      </div>
    </section>
    ${tree(groups,tasks)||(!rootTasks.length?'<div class="backlog-empty">Creá una tarea o una carpeta para empezar.</div>':"")}`;

  bindGroupForm(root,groups,onChanged);

  root.querySelector("[data-root-group-add]")?.addEventListener("click",()=>{
    openGroupForm(root,{parentId:null});
  });

  root.querySelectorAll("[data-group-add]").forEach(button=>{
    button.onclick=()=>openGroupForm(root,{parentId:Number(button.dataset.groupAdd)});
  });

  root.querySelectorAll("[data-group-rename]").forEach(button=>{
    button.onclick=()=>{
      const group=groups.find(item=>item.id===Number(button.dataset.groupRename));
      if(group)openGroupForm(root,{parentId:group.parentId??null,group});
    };
  });

  root.querySelectorAll("[data-group-delete]").forEach(button=>{
    button.onclick=async()=>{
      const group=groups.find(item=>item.id===Number(button.dataset.groupDelete));
      if(!group||!confirm(`·Eliminar la carpeta vacía "${group.name}"?`))return;
      try{
        await deleteBacklogGroup(group.id);
        await onChanged();
      }catch(error){
        alert(error?.message||"La carpeta debe estar vacía.");
      }
    };
  });

  bindCards(root,tasks,openTask,onChanged);
  bindZones(root,tasks,onChanged);
}
