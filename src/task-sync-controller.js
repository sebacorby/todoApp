import { allTasks } from "./db.js";
import { TASK_STATUS_LABELS, setTaskStatus } from "./task-state.js";

const q = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[char]));

let timer;
let syncing = false;

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => syncViews().catch(console.error), 70);
}

function statusSelect(task) {
  return `<select data-dashboard-task-status="${task.id}" aria-label="Estado de ${esc(task.title)}">
    ${Object.entries(TASK_STATUS_LABELS).map(([value,label]) =>
      `<option value="${value}" ${task.status === value ? "selected" : ""}>${label}</option>`
    ).join("")}
  </select>`;
}

function completedClass(element, task) {
  element.classList.toggle("dashboard-task-completed", task.status === "completed");
}

function syncCalendar(tasksById) {
  document.querySelectorAll(".cal-event[data-task]").forEach(event => {
    const task = tasksById.get(Number(event.dataset.task));
    const completed = task?.status === "completed";
    event.classList.toggle("task-completed", completed);
    event.setAttribute("data-status", task?.status || "");
  });

  const panel = q("[data-backlog]");
  if (!panel) return;
  panel.querySelectorAll("[data-backlog-task]").forEach(card => {
    const task = tasksById.get(Number(card.dataset.backlogTask));
    const hidden = task?.status === "completed";
    card.classList.toggle("calendar-backlog-completed-hidden", hidden);
    card.setAttribute("aria-hidden", hidden ? "true" : "false");
  });

  const root = panel.querySelector("[data-root-drop]");
  const rootCount = panel.querySelector(".backlog-root > .backlog-group-head em");
  if (root && rootCount) {
    rootCount.textContent = String(
      [...root.querySelectorAll(":scope > [data-backlog-task]")]
        .filter(card => !card.classList.contains("calendar-backlog-completed-hidden")).length
    );
  }

  panel.querySelectorAll("[data-backlog-group]").forEach(group => {
    const drop = group.querySelector(":scope > .backlog-group-body > [data-group-drop]");
    const count = group.querySelector(":scope > .backlog-group-head em");
    if (!drop || !count) return;
    count.textContent = String(
      [...drop.querySelectorAll(":scope > [data-backlog-task]")]
        .filter(card => !card.classList.contains("calendar-backlog-completed-hidden")).length
    );
  });
}

function scheduledCard(task) {
  const when = new Intl.DateTimeFormat("es-AR", {
    dateStyle:"medium", timeStyle:"short"
  }).format(new Date(task.startsAt));
  return `<article class="backlog-card dashboard-backlog-card dashboard-scheduled-card"
      data-dashboard-scheduled-task="${task.id}">
    <span class="dashboard-scheduled-icon">◷</span>
    <div class="backlog-copy">
      <b>${esc(task.title)}</b>
      <small>${esc(when)} · ${esc(task.description || "Sin descripción")}</small>
    </div>
    ${statusSelect(task)}
    <button class="backlog-eye" data-dashboard-task-edit="${task.id}" aria-label="Editar ${esc(task.title)}">✎</button>
  </article>`;
}

function syncDashboard(tasks, tasksById) {
  const host = q(".dashboard-unified-backlog");
  if (!host) return;

  const scheduled = tasks
    .filter(task => task.startsAt && task.endsAt)
    .sort((a,b) => new Date(a.startsAt) - new Date(b.startsAt));

  let section = host.querySelector("[data-dashboard-scheduled]");
  if (!section) {
    section = document.createElement("section");
    section.dataset.dashboardScheduled = "";
    section.className = "dashboard-scheduled-section";
    const tree = host.querySelector(".dashboard-backlog-tree");
    host.insertBefore(section, tree);
  }
  section.innerHTML = `
    <div class="dashboard-scheduled-head">
      <b>Programadas</b><em>${scheduled.length}</em>
    </div>
    <div class="dashboard-scheduled-list">
      ${scheduled.length ? scheduled.map(scheduledCard).join("") : '<small class="dashboard-scheduled-empty">Sin tareas programadas</small>'}
    </div>`;

  host.querySelectorAll("[data-backlog-task]").forEach(card => {
    const task = tasksById.get(Number(card.dataset.backlogTask));
    if (!task) return;
    completedClass(card, task);

    let select = card.querySelector("[data-dashboard-task-status]");
    if (!select) {
      select = document.createElement("select");
      select.dataset.dashboardTaskStatus = String(task.id);
      select.setAttribute("aria-label", `Estado de ${task.title}`);
      select.innerHTML = Object.entries(TASK_STATUS_LABELS)
        .map(([value,label]) => `<option value="${value}">${label}</option>`)
        .join("");
      card.insertBefore(select, card.querySelector("[data-dashboard-task-edit]"));
    }
    select.value = task.status;
  });

  section.querySelectorAll("[data-dashboard-scheduled-task]").forEach(card => {
    const task = tasksById.get(Number(card.dataset.dashboardScheduledTask));
    if (task) completedClass(card, task);
  });
}

async function syncViews() {
  if (syncing) return;
  syncing = true;
  try {
    const tasks = await allTasks();
    const tasksById = new Map(tasks.map(task => [Number(task.id), task]));
    if (q('.nav-item[data-view="calendar"].active')) syncCalendar(tasksById);
    if (q('.nav-item[data-view="dashboard"].active')) syncDashboard(tasks, tasksById);
  } finally {
    syncing = false;
  }
}

document.addEventListener("change", async event => {
  const select = event.target.closest("[data-dashboard-task-status]");
  if (!select) return;
  await setTaskStatus(Number(select.dataset.dashboardTaskStatus), select.value);
  await window.todoRenderApp?.();
  schedule();
});

new MutationObserver(schedule).observe(q("#content"), { childList:true, subtree:true });

const style = document.createElement("style");
style.dataset.taskSyncController = "";
style.textContent = `
.calendar-backlog-completed-hidden{display:none!important}
.cal-event.task-completed{
  --event:#2fbf71!important;
  background:#176b3a!important;
  border-left-color:#2fbf71!important;
  color:#f4fff8!important
}
.cal-event.task-completed span{color:#d9ffe8!important}
.dashboard-scheduled-section{display:grid;gap:7px;margin:0 0 12px}
.dashboard-scheduled-head{display:flex;align-items:center;justify-content:space-between;padding:0 4px;color:var(--muted)}
.dashboard-scheduled-head em{font-style:normal;font-size:11px}
.dashboard-scheduled-list{display:grid;gap:7px}
.dashboard-scheduled-empty{padding:10px 12px;border:1px dashed var(--border);border-radius:10px;color:var(--muted)}
.dashboard-backlog-card{grid-template-columns:14px minmax(0,1fr) 150px 30px!important}
.dashboard-scheduled-card{width:calc(100% - 28px);margin-left:14px;max-width:none!important}
.dashboard-scheduled-icon{color:var(--muted);font-size:14px}
.dashboard-backlog-card [data-dashboard-task-status]{
  width:150px;min-width:0;height:32px;border:1px solid var(--border);border-radius:9px;
  padding:0 8px;background:var(--surface2);color:var(--text)
}
.dashboard-backlog-card.dashboard-task-completed{
  background:#176b3a!important;border-color:#2fbf71!important;border-left-color:#2fbf71!important;color:#f4fff8!important
}
.dashboard-backlog-card.dashboard-task-completed .backlog-copy small,
.dashboard-backlog-card.dashboard-task-completed .backlog-grip,
.dashboard-backlog-card.dashboard-task-completed .dashboard-scheduled-icon{color:#d9ffe8!important}
.dashboard-backlog-card.dashboard-task-completed [data-dashboard-task-status],
.dashboard-backlog-card.dashboard-task-completed .backlog-eye{
  background:#12542e!important;border-color:#52d58c!important;color:#f4fff8!important
}
@media(max-width:900px){
  .dashboard-backlog-card{grid-template-columns:14px minmax(0,1fr) 30px!important}
  .dashboard-backlog-card [data-dashboard-task-status]{grid-column:2/4;width:100%}
  .dashboard-scheduled-card{width:100%;margin-left:0}
}
`;
document.head.append(style);
schedule();
