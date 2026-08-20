
import { allTasks, getTask, saveTask, getSetting } from "./db.js";
import { backlogHTML, bindBacklog } from "./backlog.js";
import "./backlog-folder-ui.js";

const $ = selector => document.querySelector(selector);
const STATUS = { not_started:"Sin iniciar", started:"Iniciada", paused:"Pausada", blocked:"Bloqueada", completed:"Completa" };
const CRIT = { low:"Baja", medium:"Media", high:"Alta", urgent:"Urgente" };
const DEF = { low:"#66d9a5", medium:"#62a8ff", high:"#f6ad55", urgent:"#ff6b7a" };
let filters = { q:"", status:"all", crit:"all" };

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const fmt = value => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", { dateStyle:"medium", timeStyle:"short" }).format(date);
};
const sortTasks = (a,b) => {
  if (!a.startsAt && !b.startsAt) {
    return (a.backlogOrder ?? Number.MAX_SAFE_INTEGER) - (b.backogOrder ?? Number.MAX_SAFE_INTEGER) || a.id - b.id;
  }
  if (!a.startsAt) return 1;
  if (!b.startsAt) return -1;
  return new Date(a.startsAt) - new Date(b.startsAt);
};

function taskCard(task, colors) {
  const when = task.startsAt ? fmt(task.startsAt) : "Sin fecha · Backlog";
  return `<article class="dash-task" data-id="${task.id}">
    <i style="background:${colors[task.criticality]}"></i>
    <div>
      <div class="dash-title"><b>${esc(task.title)}</b><span>${CRIT[task.criticality]}</span></div>
      <small>${when} · ${esc(task.description || "Sin descripción")}</small>
    </div>
    <select data-status aria-label="Estado de ${esc(task.title)}">
      ${Object.entries(STATUS).map(([key,label]) => `<option value="${key}" ${task.status===key?"selected":""}>${label}</option>`).join("")}
    </select>
    <button data-edit>Editar</button>
  </article>`;
}

export async function renderDash() {
  if (!document.querySelector('.nav-item[data-view="dashboard"].active')) return;

  const colors = { ...DEF, ...await getSetting("criticalityColors", {}) };
  const tasks = (await allTasks()).sort(sortTasks);
  const now = Date.now();
  const list = tasks.filter(task =>
    (!filters.q || `${task.title} ${task.description || ""}`.toLowerCase().includes(filters.q.toLowerCase())) &&
    (filters.status === "all" || task.status === filters.status) &&
    (filters.crit === "all" || task.criticality === filters.crit)
  );
  const counts = {
    total: tasks.length,
    started: tasks.filter(t => t.status === "started").length,
    blocked: tasks.filter(t => t.status === "blocked").length,
    overdue: tasks.filter(t => t.status !== "completed" && t.endsAt && new Date(t.endsAt).getTime() < now).length,
    completed: tasks.filter(t => t.status === "completed").length,
  };

  $("#content").innerHTML = `<section class="dashboard">
    <div class="summary-grid">
      ${[["Total",counts.total],["Iniciadas",counts.started],["Bloqueadas",counts.blocked],["Vencidas",counts.overdue],["Completas",counts.completed]]
        .map(([label,value]) => `<div><span>${label}</span><b>${value}</b></div>`).join("")}
    </div>

    <div class="dashboard-backlog">
      <div class="dashboard-section-head">
        <div>
          <p class="eyebrow">ESTRUCTURA</p>
          <h2>Backlog por carpetas</h2>
        </div>
        <small>Misma estructura y datos que en Calendario.</small>
      </div>
      ${backlogHTML(tasks, colors)}
    </div>

    <div class="dashboard-panel">
      <div class="dashboard-section-head">
        <div><p class="eyebrow">TAREAS</p><h2>Todas las tareas</h2></div>
      </div>
      <div class="filters">
        <input data-search type="search" aria-label="Buscar tareas" placeholder="Buscar tareas…" value="${esc(filters.q)}">
        <select data-fstatus aria-label="Filtrar por estado">
          <option value="all">Todos los estados</option>
          ${Object.entries(STATUS).map(([key,label]) => `<option value="${key}" ${filters.status===key?"selected":""}>${label}</option>`).join("")}
        </select>
        <select data-fcrit aria-label="Filtrar por criticidad">
          <option value="all">Todas las criticidades</option>
          ${Object.entries(CRIT).map(([key,label]) => `<option value="${key}" ${filters.crit===key?"selected":""}>${label}</option>`).join("")}
        </select>
      </div>
      <div class="dashboard-list">
        ${list.length ? list.map(task => taskCard(task, colors)).join("") : '<div class="empty">No hay tareas para estos filtros.</div>'}
      </div>
    </div>
  </section>`;

  await bindBacklog({
    root: $(".dashboard-backlog"),
    tasks,
    openTask: window.todoOpenTaskModal,
    onChanged: renderDash,
  });

  $('[data-search]').oninput = e => { filters.q = e.target.value; renderDash(); };
  $('[data-fstatus]').onchange = e => { filters.status = e.target.value; renderDash(); };
  $('[data-fcrit]').onchange = e => { filters.crit = e.target.value; renderDash(); };

  document.querySelectorAll(".dashboard-panel [data-edit]").forEach(button => {
    button.onclick = () => window.todoOpenTaskModal?.(Number(button.closest("[data-id]").dataset.id));
  });

  document.querySelectorAll(".dashboard-panel [data-status]").forEach(select => {
    select.onchange = async () => {
      const task = await getTask(Number(select.closest("[data-id]").dataset.id));
      const nowIso = new Date().toISOString();
      task.status = select.value;
      task.completedAt = select.value === "completed" ? (task.completedAt || nowIso) : null;
      task.updatedAt = nowIso;
      await saveTask(task);
      await renderDash();
    };
  });
}

window.todoRenderDash = renderDash;
document.querySelector("#task-form").addEventListener("submit", () => setTimeout(renderDash, 40));
document.querySelector("#delete-task").addEventListener("click", () => setTimeout(renderDash, 40));
