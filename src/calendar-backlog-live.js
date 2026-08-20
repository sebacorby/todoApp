import { allTasks } from "./db.js";

let running = false;
let timer;

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => refresh().catch(console.error), 40);
}

async function refresh() {
  if (running) return;
  if (!document.querySelector('.nav-item[data-view="calendar"].active')) return;
  const panel = document.querySelector("[data-backlog]");
  if (!panel) return;

  running = true;
  try {
    const tasks = await allTasks();
    const statusById = new Map(tasks.map(task => [Number(task.id), task.status]));

    panel.querySelectorAll("[data-backlog-task]").forEach(card => {
      const completed = statusById.get(Number(card.dataset.backlogTask)) === "completed";
      card.classList.toggle("calendar-backlog-completed-hidden", completed);
      card.setAttribute("aria-hidden", completed ? "true" : "false");
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
  } finally {
    running = false;
  }
}

new MutationObserver(schedule).observe(document.querySelector("#content"), {
  childList: true,
  subtree: true,
});

const style = document.createElement("style");
style.dataset.calendarBacklogLive = "";
style.textContent = `.calendar-backlog-completed-hidden{display:none!important}`;
document.head.append(style);
schedule();
