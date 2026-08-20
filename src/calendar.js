if(!document.querySelector('link[data-calendar-css]')){const l=document.createElement("link");l.rel="stylesheet";l.href="./src/calendar.css";l.dataset.calendarCss="";document.head.append(l)}
import{getTask,saveTask}from"./db.js";
let cursor=new Date(),mode="month";
const pad=n=>String(n).padStart(2,"0"),key=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const dayStart=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
const addDays=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
const monday=d=>{const x=dayStart(d),w=(x.getDay()+6)%7;return addDays(x,-w)};
const taskKey=t=>key(new Date(t.startsAt)),hour=t=>new Date(t.startsAt).getHours();
const time=t=>new Intl.DateTimeFormat("es-AR",{hour:"2-digit",minute:"2-digit"}).format(new Date(t.startsAt));
const monthTitle=d=>new Intl.DateTimeFormat("es-AR",{month:"long",year:"numeric"}).format(d);
const dayTitle=d=>new Intl.DateTimeFormat("es-AR",{weekday:"short",day:"numeric",month:"short"}).format(d);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function event(t,colors){return `<button class="cal-event" draggable="true" data-task="${t.id}" style="--event:${colors[t.criticality]}" title="${esc(t.title)}"><span>${time(t)}</span>${esc(t.title)}</button>`}
function toolbar(){
  return `<div class="calendar-toolbar"><div class="calendar-nav"><button data-cal="prev">‹</button><button data-cal="today">Hoy</button><button data-cal="next">›</button><strong>${monthTitle(cursor)}</strong></div><div class="calendar-modes"><button data-mode="month" class="${mode==="month"?"active":""}">Mes</button><button data-mode="week" class="${mode==="week"?"active":""}">Semana</button><button data-mode="day" class="${mode==="day"?"active":""}">Día</button></div></div>`;
}
function month(tasks,colors){
  const first=new Date(cursor.getFullYear(),cursor.getMonth(),1),start=monday(first),today=key(new Date());
  const heads=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(x=>`<div class="dow">${x}</div>`).join("");
  let cells="";
  for(let i=0;i<42;i++){
    const d=addDays(start,i),k=key(d),outside=d.getMonth()!==cursor.getMonth(),items=tasks.filter(t=>taskKey(t)===k);
    cells+=`<div class="cal-day ${outside?"outside":""} ${k===today?"today":""}" data-date="${k}"><div class="day-number">${d.getDate()}</div><div class="day-events">${items.map(t=>event(t,colors)).join("")}</div></div>`;
  }
  return `<div class="month-grid">${heads}${cells}</div>`;
}
function timeGrid(tasks,colors){
  const start=mode==="week"?monday(cursor):dayStart(cursor),count=mode==="week"?7:1,days=Array.from({length:count},(_,i)=>addDays(start,i));
  const headers=`<div class="time-corner"></div>${days.map(d=>`<div class="time-head">${dayTitle(d)}</div>`).join("")}`;
  let rows="";
  for(let h=0;h<24;h++){
    rows+=`<div class="hour-label">${pad(h)}:00</div>`;
    for(const d of days){
      const k=key(d),items=tasks.filter(t=>taskKey(t)===k&&hour(t)===h);
      rows+=`<div class="time-slot" data-date="${k}" data-hour="${h}">${items.map(t=>event(t,colors)).join("")}</div>`;
    }
  }
  return `<div class="time-grid" style="--days:${count}">${headers}${rows}</div>`;
}
export function calendarHTML(tasks,colors){return `<section class="calendar-panel">${toolbar()}${mode==="month"?month(tasks,colors):timeGrid(tasks,colors)}</section>`}
export function bindCalendar({root,openTask,onChanged}){
  root.querySelectorAll("[data-cal]").forEach(b=>b.onclick=()=>{
    const a=b.dataset.cal;
    if(a==="today")cursor=new Date();
    else if(mode==="month")cursor=new Date(cursor.getFullYear(),cursor.getMonth()+(a==="next"?1:-1),1);
    else cursor=addDays(cursor,(mode==="week"?7:1)*(a==="next"?1:-1));
    onChanged();
  });
  root.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{mode=b.dataset.mode;onChanged()});
  root.querySelectorAll(".cal-day,.time-slot").forEach(slot=>{
    slot.addEventListener("click",e=>{
      if(e.target.closest(".cal-event"))return;
      const h=slot.dataset.hour==null?9:Number(slot.dataset.hour);
      openTask(null,new Date(`${slot.dataset.date}T${pad(h)}:00:00`));
    });
    slot.addEventListener("dragover",e=>{e.preventDefault();slot.classList.add("drag-over")});
    slot.addEventListener("dragleave",()=>slot.classList.remove("drag-over"));
    slot.addEventListener("drop",async e=>{
      e.preventDefault();slot.classList.remove("drag-over");
      const id=Number(e.dataTransfer.getData("text/task-id"));if(!id)return;
      const t=await getTask(id),oldStart=new Date(t.startsAt),duration=new Date(t.endsAt)-oldStart;
      const h=slot.dataset.hour==null?oldStart.getHours():Number(slot.dataset.hour),m=slot.dataset.hour==null?oldStart.getMinutes():0;
      const start=new Date(`${slot.dataset.date}T${pad(h)}:${pad(m)}:00`);
      t.startsAt=start.toISOString();t.endsAt=new Date(start.getTime()+duration).toISOString();t.updatedAt=new Date().toISOString();
      await saveTask(t);onChanged();
    });
  });
  root.querySelectorAll(".cal-event").forEach(el=>{
    el.addEventListener("click",e=>{e.stopPropagation();openTask(Number(el.dataset.task))});
    el.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/task-id",el.dataset.task);e.dataTransfer.effectAllowed="move"});
  });
}
