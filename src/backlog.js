if (!document.querySelector('link[data-backlog-css]')) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./src/backlog.css";
  link.dataset.backlogCss = "";
  document.head.append(link);
}

import { saveTask } from "./db.js";
import { backlogTasks, reorderBacklog } from "./backlog-model.js";

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

const eyeIcon = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M2.4 12s3.5-6 9.6-6 9.6 6 9.6 6-3.5 6-9.6 6-9.6-6-9.6-6Z"/>
  <circle cx="12" cy="12" r="2.7"/>
</svg>`;

export function backlogHTML(tasks, colors) {
  const items = backlogTasks(tasks);
  return `<aside class="backlog-panel" data-backlog>
    <header>
      <div><p>BACKLOG</p><h2>Sin fecha</h2></div>
      <button class="backlog-add" data-backlog-add aria-label="Agregar tarea al backlog">+</button>
    </header>
    <p class="backlog-help">Ordená arrastrando. Soltá una tarjeta en el calendario para agendarla.</p>
    <div class="backlog-list" data-backlog-list>
      ${items.map(task => `<article class="backlog-card" draggable="true" data-backlog-task="${task.id}" style="--task-color:${colors[task.criticality]}">
        <span class="backlog-grip" aria-hidden="true">⠿</span>
        <div class="backlog-copy"><b>${escapeHtml(task.title)}</b><small>${escapeHtml(task.description || "Sin descripción")}</small></div>
        <button class="backlog-eye" data-backlog-open="${task.id}" aria-label="Abrir ${escapeHtml(task.title)}">${eyeIcon}</button>
      </article>`).join("") || '<div class="backlog-empty">No hay tareas pendientes de planificación.</div>'}
    </div>
  </aside>`;
}

async function persistOrder(tasks) {
  const now = new Date().toISOString();
  for (const task of tasks) {
    await saveTask({ ...task, backlogOrder: task.backlogOrder, updatedAt: now });
  }
}

export function bindBacklog({ root, tasks, openTask, onChanged }) {
  root.querySelector("[data-backlog-add]")?.addEventListener("click", () => openTask(null, null, { backlog: true }));

  root.querySelectorAll("[data-backlog-open]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      openTask(Number(button.dataset.backlogOpen));
    });
  });

  root.querySelectorAll("[data-backlog-task]").forEach(card => {
    card.addEventListener("dragstart", event => {
      event.dataTransfer.setData("text/task-id", card.dataset.backlogTask);
      event.dataTransfer.setData("text/task-source", "backlog");
      event.dataTransfer.effectAllowed = "move";
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    card.addEventListener("dragover", event => {
      event.preventDefault();
      event.stopPropagation();
      card.classList.add("drag-over");
    });
    card.addEventListener("dragleave", () => card.classList.remove("drag-over"));
    card.addEventListener("drop", async event => {
      event.preventDefault();
      event.stopPropagation();
      card.classList.remove("drag-over");
      const id = Number(event.dataTransfer.getData("text/task-id"));
      if (!id || id === Number(card.dataset.backlogTask)) return;
      await persistOrder(reorderBacklog(tasks, id, Number(card.dataset.backlogTask)));
      await onChanged();
    });
  });

  const list = root.querySelector("[data-backlog-list]");
  list?.addEventListener("dragover", event => event.preventDefault());
  list?.addEventListener("drop", async event => {
    if (event.target.closest("[data-backlog-task]")) return;
    event.preventDefault();
    const id = Number(event.dataTransfer.getData("text/task-id"));
    if (!id) return;
    await persistOrder(reorderBacklog(tasks, id, null));
    await onChanged();
  });
}
