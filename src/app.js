import{calendarHTML,bindCalendar}from"./calendar.js";
import{openDB,allTasks,getTask,saveTask,deleteTask,getSetting}from"./db.js";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],DEFAULT_COLORS={low:"#66d9a5",medium:"#62a8ff",high:"#f6ad55",urgent:"#ff6b7a"};
let view="calendar",COLORS={...DEFAULT_COLORS};
const reqDate=v=>{const d=v?new Date(v):new Date(),p=n=>String(n).padStart(2,"0");return{date:`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`,time:`${p(d.getHours())}:${p(d.getMinutes())}`}},iso=(d,t)=>new Date(`${d}T${t}:00`).toISOString();
function toast(text){const el=$("#toast");el.textContent=text;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),1600)}
async function reloadColors(){COLORS={...DEFAULT_COLORS,...await getSetting("criticalityColors",{})};await render()}window.todoReloadColors=reloadColors;
async function render(){
 $$(".nav-item[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));$("#view-title").textContent=view==="calendar"?"Calendario":"Dashboard";$("#eyebrow").textContent=view==="calendar"?"PLANIFICACIÓN":"RESUMEN";
 const tasks=(await allTasks()).sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt));
 if(view==="calendar"){$("#content").innerHTML=calendarHTML(tasks,COLORS);bindCalendar({root:$("#content"),openTask:openModal,onChanged:render});return}
 if(window.todoRenderDash){await window.todoRenderDash();return}
 $("#content").innerHTML='<div class="panel"><h2>Dashboard</h2><p class="muted">Cargando resumen…</p></div>'
}
async function openModal(id=null,prefill=null){
 $("#task-form").reset();$("#form-error").textContent="";$("#task-id").value=id||"";$("#delete-task").classList.toggle("hidden",!id);
 const task=id?await getTask(id):null,start=reqDate(prefill||task?.startsAt),end=reqDate(task?.endsAt||new Date(new Date(prefill||Date.now()).getTime()+3600000));
 $("#modal-title").textContent=id?"Editar tarea":"Nueva tarea";$("#task-title").value=task?.title||"";$("#task-description").value=task?.description||"";$("#task-date").value=start.date;$("#task-time").value=start.time;$("#task-end").value=end.time;$("#task-criticality").value=task?.criticality||"medium";$("#task-status").value=task?.status||"not_started";$("#task-recurrence").value=task?.recurrence||"none";$("#task-recurrence-end").value=task?.recurrenceEnd||"";toggleRecurrenceEnd();$("#task-dialog").showModal();$("#task-title").focus()
}
const closeModal=()=>$("#task-dialog").open&&$("#task-dialog").close(),toggleRecurrenceEnd=()=>$("#recurrence-end-wrap").classList.toggle("hidden",$("#task-recurrence").value==="none");
$("#task-recurrence").addEventListener("change",toggleRecurrenceEnd);
$("#task-form").addEventListener("submit",async e=>{
 e.preventDefault();const id=Number($("#task-id").value)||null,title=$("#task-title").value.trim(),startsAt=iso($("#task-date").value,$("#task-time").value),endsAt=iso($("#task-date").value,$("#task-end").value);
 if(!title){$("#form-error").textContent="El título es obligatorio.";return}if(new Date(endsAt)<=new Date(startsAt)){$("#form-error").textContent="La hora final debe ser posterior a la hora inicial.";return}
 const old=id?await getTask(id):null,now=new Date().toISOString(),status=$("#task-status").value,recurrence=$("#task-recurrence").value,recurrenceEnd=recurrence==="none"?null:($("#task-recurrence-end").value||null);
 if(recurrenceEnd&&new Date(`${recurrenceEnd}T23:59:59`)<new Date(startsAt)){$("#form-error").textContent="El fin de recurrencia no puede ser anterior al inicio.";return}
 const task={...(old||{}),title,description:$("#task-description").value.trim(),startsAt,endsAt,status,criticality:$("#task-criticality").value,recurrence,recurrenceEnd,completedAt:status==="completed"?(old?.completedAt||now):null,createdAt:old?.createdAt||now,updatedAt:now};if(id)task.id=id;await saveTask(task);closeModal();toast(id?"Tarea actualizada":"Tarea creada");await render()
});
$("#delete-task").addEventListener("click",async()=>{const id=Number($("#task-id").value);if(id&&confirm("¿Eliminar esta tarea?")){await deleteTask(id);closeModal();toast("Tarea eliminada");await render()}});
$("#create-task").addEventListener("click",()=>openModal());$("#close-modal").addEventListener("click",closeModal);$("#cancel-modal").addEventListener("click",closeModal);
$$(".nav-item[data-view]").forEach(b=>b.addEventListener("click",()=>{view=b.dataset.view;render()}));
openDB().then(async()=>{COLORS={...DEFAULT_COLORS,...await getSetting("criticalityColors",{})};render()}).catch(()=>$("#content").innerHTML='<div class="empty">No se pudo abrir la base de datos local.</div>');
