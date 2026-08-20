import{calendarHTML,bindCalendar}from"./calendar.js";
import{openDB,allTasks,getTask,saveTask,deleteTask}from"./db.js";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const STATUS={not_started:"Sin iniciar",started:"Iniciada",paused:"Pausada",blocked:"Bloqueada",completed:"Completa"};
const CRIT={low:"Baja",medium:"Media",high:"Alta",urgent:"Urgente"};
const COLORS={low:"#66d9a5",medium:"#62a8ff",high:"#f6ad55",urgent:"#ff6b7a"};
let view="calendar";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const reqDate=v=>{const d=v?new Date(v):new Date(),p=n=>String(n).padStart(2,"0");return{date:`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`,time:`${p(d.getHours())}:${p(d.getMinutes())}`}};
const iso=(date,time)=>new Date(`${date}T${time}:00`).toISOString();
const fmt=v=>new Intl.DateTimeFormat("es-AR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v));
function toast(text){const el=$("#toast");el.textContent=text;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),1600)}
function taskCard(t){return `<article class="task-card" data-id="${t.id}"><i class="criticality-bar" style="background:${COLORS[t.criticality]}"></i><div class="task-main"><b>${esc(t.title)}</b><span class="pill">${CRIT[t.criticality]}</span><span class="pill">${STATUS[t.status]}</span><div class="task-meta">${fmt(t.startsAt)} · ${esc(t.description||"Sin descripción")}</div></div><div class="task-actions">${t.status==="completed"?'<button data-action="reactivate">Reactivar</button>':'<button data-action="complete">Completar</button>'}<button data-action="edit">Editar</button></div></article>`}
async function render(){
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  $("#view-title").textContent=view==="calendar"?"Calendario":"Dashboard";
  $("#eyebrow").textContent=view==="calendar"?"PLANIFICACIÓN":"RESUMEN";
  const tasks=(await allTasks()).sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt));
  if(view==="calendar"){
    $("#content").innerHTML=calendarHTML(tasks,COLORS);
    bindCalendar({root:$("#content"),openTask:openModal,onChanged:render});
    return;
  }
  $("#content").innerHTML=`<div class="panel"><h2>Gestión de tareas</h2><p class="muted">El dashboard completo se incorpora en su etapa dedicada.</p>${tasks.length?`<div class="task-list">${tasks.map(taskCard).join("")}</div>`:'<div class="empty">No hay tareas todavía. Creá la primera con + Nueva tarea.</div>'}</div>`;
  $$(".task-card").forEach(card=>card.addEventListener("click",e=>{if(!e.target.dataset.action)openModal(Number(card.dataset.id))}));
  $$("[data-action]").forEach(b=>b.addEventListener("click",async e=>{
    e.stopPropagation();const card=b.closest(".task-card"),id=Number(card.dataset.id);
    if(b.dataset.action==="edit")return openModal(id);
    const t=await getTask(id),now=new Date().toISOString();
    if(b.dataset.action==="complete"){t.status="completed";t.completedAt=now;toast("Tarea completada")}
    else{t.status="not_started";t.completedAt=null;toast("Tarea reactivada")}
    t.updatedAt=now;await saveTask(t);render();
  }));
}
async function openModal(id=null,prefill=null){
  $("#task-form").reset();$("#form-error").textContent="";$("#task-id").value=id||"";
  $("#delete-task").classList.toggle("hidden",!id);
  const task=id?await getTask(id):null,start=reqDate(prefill||task?.startsAt),end=reqDate(task?.endsAt||new Date(new Date(prefill||Date.now()).getTime()+3600000));
  $("#modal-title").textContent=id?"Editar tarea":"Nueva tarea";
  $("#task-title").value=task?.title||"";$("#task-description").value=task?.description||"";
  $("#task-date").value=start.date;$("#task-time").value=start.time;$("#task-end").value=end.time;
  $("#task-criticality").value=task?.criticality||"medium";$("#task-status").value=task?.status||"not_started";
  $("#task-dialog").showModal();$("#task-title").focus();
}
const closeModal=()=>$("#task-dialog").open&&$("#task-dialog").close();
$("#task-form").addEventListener("submit",async e=>{
  e.preventDefault();const id=Number($("#task-id").value)||null;
  const title=$("#task-title").value.trim(),startsAt=iso($("#task-date").value,$("#task-time").value),endsAt=iso($("#task-date").value,$("#task-end").value);
  if(!title){$("#form-error").textContent="El título es obligatorio.";return}
  if(new Date(endsAt)<=new Date(startsAt)){ $("#form-error").textContent="La hora final debe ser posterior a la hora inicial.";return}
  const old=id?await getTask(id):null,now=new Date().toISOString(),status=$("#task-status").value;
  const task={...(old||{}),title,description:$("#task-description").value.trim(),startsAt,endsAt,status,criticality:$("#task-criticality").value,recurrence:old?.recurrence||"none",recurrenceEnd:old?.recurrenceEnd||null,completedAt:status==="completed"?(old?.completedAt||now):null,createdAt:old?.createdAt||now,updatedAt:now};
  if(id)task.id=id;await saveTask(task);closeModal();toast(id?"Tarea actualizada":"Tarea creada");render();
});
$("#delete-task").addEventListener("click",async()=>{const id=Number($("#task-id").value);if(id&&confirm("¿Eliminar esta tarea?")){await deleteTask(id);closeModal();toast("Tarea eliminada");render()}});
$("#create-task").addEventListener("click",()=>openModal());
$("#close-modal").addEventListener("click",closeModal);$("#cancel-modal").addEventListener("click",closeModal);
$$(".nav-item").forEach(b=>b.addEventListener("click",()=>{view=b.dataset.view;render()}));
openDB().then(render).catch(()=>$("#content").innerHTML='<div class="empty">No se pudo abrir la base de datos local.</div>');
