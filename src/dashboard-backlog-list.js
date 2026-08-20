
import { allTasks, allBacklogGroups } from "./db.js";

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[c]));

const expanded = new Set();

function sortedGroups(groups, parentId = null) {
  return groups
    .filter(group => (group.parentId ?? null) === parentId)
    .sort((a,b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0) || a.id - b.id);
}

function backlogTasks(tasks) {
  return tasks
    .filter(task => !task.startsAt && !task.endsAt)
    .sort((a,b) =>
      (a.backlogOrder ?? Number.MAX_SAFE_INTEGER) -
      (b.backlogOrder ?? Number.MAX_SAFE_INTEGER) ||
      a.id - b.id
    );
}

function card(task) {
  return `<article class="backlog-card dashboard-backlog-card"
    data-backlog-task="${task.id}"
    data-group="${task.backlogGroupId ?? ""}">
    <span class="backlog-grip">⠿</span>
    <div class="backlog-copy">
      <b>${esc(task.title)}</b>
      <small>${esc(task.description || "Sin descripción")}</small>
    </div>
    <button class="backlog-eye" data-dashboard-task-edit="${task.id}" aria-label="Editar ${esc(task.title)}">✎</button>
  </article>`;
}

function folderTree(groups, tasks, parentId = null, depth = 0) {
  return sortedGroups(groups, parentId).map(group => {
    const ownTasks = tasks.filter(task => (task.backlogGroupId ?? null) === group.id);
    const open = expanded.has(group.id);

    return `<section class="dashboard-backlog-folder"
      data-dashboard-group="${group.id}"
      style="--depth:${depth}">
      <header class="dashboard-backlog-folder-head" data-group-target="${group.id}">
        <button type="button"
          class="dashboard-backlog-toggle"
          data-dashboard-folder-toggle="${group.id}"
          aria-expanded="${open}">${open ? "▾" : "▸"}</button>
        <span>📁</span>
        <b>${esc(group.name)}</b>
        <em>${ownTasks.length}</em>
        <button type="button" class="dashboard-folder-rename" data-group-rename="${group.id}" aria-label="Renombrar ${esc(group.name)}">✎</button>
      </header>
      <div class="dashboard-backlog-folder-body${open ? "" : " hidden"}"
        data-dashboard-folder-body="${group.id}">
        <div class="dashboard-backlog-folder-drop" data-group-drop="${group.id}">
          ${ownTasks.map(card).join("")}
        </div>
        ${folderTree(groups, tasks, group.id, depth + 1)}
      </div>
    </section>`;
  }).join("");
}

async function renderUnifiedBacklog() {
  if (!document.querySelector('.nav-item[data-view="dashboard"].active')) return;

  const host = document.querySelector(".dashboard-backlog");
  if (!host || host.dataset.unifiedBacklog === "1") return;

  const [all, groups] = await Promise.all([allTasks(), allBacklogGroups()]);
  const tasks = backlogTasks(all);
  const loose = tasks.filter(task => task.backlogGroupId == null);

  host.dataset.unifiedBacklog = "1";
  host.className = "dashboard-panel dashboard-backlog dashboard-unified-backlog";
  host.innerHTML = `
    <div class="dashboard-section-head">
      <div>
        <p class="eyebrow">BACKLOG</p>
        <h2>Backlog</h2>
      </div>
      <div class="dashboard-backlog-head-actions">
        <small>Arrastrá tareas libremente dentro o fuera de carpetas.</small>
        <button type="button" class="secondary dashboard-new-folder" data-root-group-add>+ Nueva carpeta</button>
      </div>
    </div>
    <div class="dashboard-backlog-tree" data-root-drop>
      <div class="dashboard-backlog-root-tasks">
        ${loose.map(card).join("")}
      </div>
      ${folderTree(groups, tasks)}
      <div class="dashboard-backlog-root-drop-hint">
        Soltá aquí para dejar la tarea sin carpeta
      </div>
    </div>`;

  const duplicateTaskPanel = host.nextElementSibling;
  if (duplicateTaskPanel?.classList.contains("dashboard-panel")) {
    duplicateTaskPanel.remove();
  }
}

let timer;
function scheduleRender() {
  clearTimeout(timer);
  timer = setTimeout(() => renderUnifiedBacklog().catch(console.error), 50);
}

new MutationObserver(scheduleRender).observe(
  document.querySelector("#content"),
  { childList:true, subtree:true }
);

document.addEventListener("click", event => {
  const toggle = event.target.closest("[data-dashboard-folder-toggle]");
  if (toggle) {
    const id = Number(toggle.dataset.dashboardFolderToggle);
    expanded.has(id) ? expanded.delete(id) : expanded.add(id);
    const open = expanded.has(id);
    document.querySelector(`[data-dashboard-folder-body="${id}"]`)
      ?.classList.toggle("hidden", !open);
    toggle.textContent = open ? "▾" : "▸";
    toggle.setAttribute("aria-expanded", String(open));
    return;
  }

  const edit = event.target.closest("[data-dashboard-task-edit]");
  if (edit) {
    window.todoOpenTaskModal?.(Number(edit.dataset.dashboardTaskEdit));
  }
});

const style = document.createElement("style");
style.dataset.dashboardUnifiedBacklog = "";
style.textContent = `
.dashboard-unified-backlog .backlog-panel{display:none!important}
.dashboard-backlog-head-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
.dashboard-new-folder{white-space:nowrap}
.dashboard-backlog-tree{
  display:grid;
  gap:8px;
  min-height:120px;
  padding:2px;
}
.dashboard-backlog-root-tasks{display:grid;gap:7px}
.dashboard-backlog-folder{display:grid;gap:6px;margin-left:calc(var(--depth) * 16px)}
.dashboard-backlog-folder-head{
  display:grid;
  grid-template-columns:24px 20px minmax(0,1fr) auto 26px;
  gap:7px;
  align-items:center;
  min-height:38px;
  padding:5px 9px;
  border:1px solid var(--border);
  border-radius:11px;
  background:var(--surface2);
}
.dashboard-backlog-folder-head b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dashboard-backlog-folder-head em{font-style:normal;color:var(--muted);font-size:11px}
.dashboard-backlog-toggle{width:24px;height:24px;border:0;padding:0;background:transparent;color:var(--text);cursor:pointer}
.dashboard-folder-rename{width:26px;height:26px;border:1px solid var(--border);background:var(--surface2);color:var(--text);border-radius:7px;padding:0;cursor:pointer}
.dashboard-backlog-folder-body.hidden{display:none}
.dashboard-backlog-folder-body{display:grid;gap:6px;padding-left:28px}
.dashboard-backlog-folder-drop{display:grid;gap:7px;min-height:8px;padding:3px 10px 3px 8px;border-radius:10px}
.dashboard-backlog-card{width:calc(100% - 24px);max-width:none;justify-self:start}
.dashboard-backlog-root-tasks .dashboard-backlog-card{width:calc(100% - 28px);margin-left:14px}
.dashboard-backlog-root-drop-hint{margin-top:4px;padding:8px 12px;border:1px dashed var(--border);border-radius:10px;color:var(--muted);font-size:11px;text-align:center}
.dashboard-backlog-tree.pointer-drop-target,.dashboard-backlog-folder-head.pointer-drop-target,.dashboard-backlog-folder-drop.pointer-drop-target{outline:2px solid var(--accent);outline-offset:2px}
@media(max-width:900px){.dashboard-backlog-card,.dashboard-backlog-root-tasks .dashboard-backlog-card{width:100%;margin-left:0}}
`;
document.head.append(style);
scheduleRender();
