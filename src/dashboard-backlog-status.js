import { allTasks, getTask, saveTask } from "./db.js";

const STATUS = {
  not_started: "Sin iniciar",
  started: "Iniciada",
  paused: "Pausada",
  blocked: "Bloqueada",
  completed: "Completa",
};

let timer;
let decorating = false;

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => decorate().catch(console.error), 50);
}

async function decorate() {
  if (decorating) return;
  if (!document.querySelector('.nav-item[data-view="dashboard"].active')) return;

  const cards = [...document.querySelectorAll(".dashboard-unified-backlog [data-backlog-task]")];
  if (!cards.length) return;

  decorating = true;
  try {
    const tasks = await allTasks();
    const byId = new Map(tasks.map(task => [Number(task.id), task]));

    for (const card of cards) {
      const task = byId.get(Number(card.dataset.backlogTask));
      if (!task) continue;

      card.classList.toggle("dashboard-task-completed", task.status === "completed");

      let select = card.querySelector("[data-dashboard-task-status]");
      if (!select) {
        select = document.createElement("select");
        select.dataset.dashboardTaskStatus = card.dataset.backlogTask;
        select.setAttribute("aria-label", `Estado de ${task.title}`);
        select.innerHTML = Object.entries(STATUS)
          .map(([value,label]) => `<option value="${value}">${label}</option>`)
          .join("");
        card.insertBefore(select, card.querySelector("[data-dashboard-task-edit]"));
      }
      select.value = task.status;
    }
  } finally {
    decorating = false;
  }
}

document.addEventListener("change", async event => {
  const select = event.target.closest("[data-dashboard-task-status]");
  if (!select) return;

  const task = await getTask(Number(select.dataset.dashboardTaskStatus));
  if (!task) return;

  const now = new Date().toISOString();
  task.status = select.value;
  task.completedAt = select.value === "completed" ? (task.completedAt || now) : null;
  task.updatedAt = now;
  await saveTask(task);
  await window.todoRenderApp?.();
  schedule();
});

new MutationObserver(schedule).observe(document.querySelector("#content"), {
  childList: true,
  subtree: true,
});

const style = document.createElement("style");
style.dataset.dashboardTaskStatus = "";
style.textContent = `
.dashboard-backlog-card{grid-template-columns:14px minmax(0,1fr) 150px 30px!important}
.dashboard-backlog-card [data-dashboard-task-status]{
  width:150px;min-width:0;height:32px;border:1px solid var(--border);border-radius:9px;
  padding:0 8px;background:var(--surface2);color:var(--text)
}
.dashboard-backlog-card.dashboard-task-completed{
  background:#176b3a!important;border-color:#2fbf71!important;border-left-color:#2fbf71!important;
  color:#f4fff8!important
}
.dashboard-backlog-card.dashboard-task-completed .backlog-copy small,
.dashboard-backlog-card.dashboard-task-completed .backlog-grip{color:#d9ffe8!important}
.dashboard-backlog-card.dashboard-task-completed [data-dashboard-task-status],
.dashboard-backlog-card.dashboard-task-completed .backlog-eye{
  background:#12542e!important;border-color:#52d58c!important;color:#f4fff8!important
}
@media(max-width:900px){
  .dashboard-backlog-card{grid-template-columns:14px minmax(0,1fr) 30px!important}
  .dashboard-backlog-card [data-dashboard-task-status]{grid-column:2/4;width:100%}
}
`;
document.head.append(style);
schedule();
