import "./task-sync-controller.js";
import "./dashboard-scroll.js";

document.addEventListener("click", event => {
  const create = event.target.closest("#create-task");
  if (!create) return;
  if (!document.querySelector('.nav-item[data-view="dashboard"].active')) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  window.todoOpenTaskModal?.(null, null, { backlog:true });
}, true);
