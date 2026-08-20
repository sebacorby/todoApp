import { calendarHTML, bindCalendar } from "./calendar.js";
import { backlogHTML, bindBacklog } from "./backlog.js";
import {
  openDB, allTasks, getTask, saveTask, deleteTask, getSetting,
} from "./db.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const DEFAULT_COLORS = {
  low: "#66d9a5",
  medium: "#62a8ff",
  high: "#f6ad55",
  urgent: "#ff6b7a",
};

let view = "calendar";
let COLORS = { ...DEFAULT_COLORS };
let modalUnscheduled = false;

const reqDate = value => {
  const date = value ? new Date(value) : new Date();
  const pad = number => String(number).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
};

const iso = (date, time) => new Date(`${date}T${time}:00`).toISOString();

function toast(text) {
  const element = $("#toast");
  element.textContent = text;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 1600);
}

function setUnscheduledMode(value) {
  modalUnscheduled = Boolean(value);
  for (const id of ["#task-date", "#task-time", "#task-end"]) {
    const input = $(id);
    input.closest("label").classList.toggle("hidden", modalUnscheduled);
    input.required = !modalUnscheduled;
  }
  $("#task-recurrence").closest("label").classList.toggle("hidden", modalUnscheduled);
  toggleRecurrenceEnd();
}

async function reloadColors() {
  COLORS = { ...DEFAULT_COLORS, ...await getSetting("criticalityColors", {}) };
  await render();
}
window.todoReloadColors = reloadColors;

async function render() {
  $$(".nav-item[data-view]").forEach(button =>
    button.classList.toggle("active", button.dataset.view === view)
  );
  $("#view-title").textContent = view === "calendar" ? "Calendario" : "Dashboard";
  $("#eyebrow").textContent = view === "calendar" ? "PLANIFICACIÓN" : "RESUMEN";

  const tasks = await allTasks();

  if (view === "calendar") {
    const scheduled = tasks.filter(task => task.startsAt && task.endsAt);
    $("#content").innerHTML = `<div class="planner-layout">
      <div class="planner-calendar">${calendarHTML(scheduled, COLORS)}</div>
      ${backlogHTML(tasks, COLORS)}
    </div>`;

    bindCalendar({
      root: $("#content"),
      openTask: openModal,
      onChanged: render,
    });
    bindBacklog({
      root: $("#content"),
      tasks,
      openTask: openModal,
      onChanged: render,
    });
    return;
  }

  if (window.todoRenderDash) {
    await window.todoRenderDash();
    return;
  }
  $("#content").innerHTML = '<div class="panel"><h2>Dashboard</h2><p class="muted">Cargando resumen…</p></div>';
}

async function openModal(id = null, prefill = null, options = {}) {
  $("#task-form").reset();
  $("#form-error").textContent = "";
  $("#task-id").value = id || "";
  $("#delete-task").classList.toggle("hidden", !id);

  const task = id ? await getTask(id) : null;
  const unscheduled = Boolean(options.backlog || (task && !task.startsAt && !task.endsAt));
  setUnscheduledMode(unscheduled);

  $("#modal-title").textContent = id
    ? "Editar tarea"
    : unscheduled
      ? "Nueva tarea de backlog"
      : "Nueva tarea";

  $("#task-title").value = task?.title || "";
  $("#task-description").value = task?.description || "";
  $("#task-criticality").value = task?.criticality || "medium";
  $("#task-status").value = task?.status || "not_started";
  $("#task-recurrence").value = unscheduled ? "none" : (task?.recurrence || "none");
  $("#task-recurrence-end").value = task?.recurrenceEnd || "";

  if (!unscheduled) {
    const start = reqDate(prefill || task?.startsAt);
    const end = reqDate(task?.endsAt || new Date(new Date(prefill || Date.now()).getTime() + 3_600_000));
    $("#task-date").value = start.date;
    $("#task-time").value = start.time;
    $("#task-end").value = end.time;
  }

  toggleRecurrenceEnd();
  $("#task-dialog").showModal();
  $("#task-title").focus();
}

window.todoOpenTaskModal = openModal;
window.todoRenderApp = render;

const closeModal = () => $("#task-dialog").open && $("#task-dialog").close();
const toggleRecurrenceEnd = () => {
  $("#recurrence-end-wrap").classList.toggle(
    "hidden",
    modalUnscheduled || $("#task-recurrence").value === "none",
  );
};

$("#task-recurrence").addEventListener("change", toggleRecurrenceEnd);

$("#task-form").addEventListener("submit", async event => {
  event.preventDefault();

  const id = Number($("#task-id").value) || null;
  const title = $("#task-title").value.trim();
  if (!title) {
    $("#form-error").textContent = "El título es obligatorio.";
    return;
  }

  const old = id ? await getTask(id) : null;
  const now = new Date().toISOString();
  const status = $("#task-status").value;

  let startsAt = null;
  let endsAt = null;
  let recurrence = "none";
  let recurrenceEnd = null;
  let backlogOrder = null;

  if (modalUnscheduled) {
    if (old?.backlogOrder != null) {
      backlogOrder = old.backlogOrder;
    } else {
      const backlog = (await allTasks()).filter(task => !task.startsAt && !task.endsAt);
      backlogOrder = backlog.length
        ? Math.max(...backlog.map(task => task.backlogOrder ?? 0)) + 1
        : 0;
    }
  } else {
    startsAt = iso($("#task-date").value, $("#task-time").value);
    endsAt = iso($("#task-date").value, $("#task-end").value);
    if (new Date(endsAt) <= new Date(startsAt)) {
      $("#form-error").textContent = "La hora final debe ser posterior a la hora inicial.";
      return;
    }

    recurrence = $("#task-recurrence").value;
    recurrenceEnd = recurrence === "none"
      ? null
      : ($("#task-recurrence-end").value || null);

    if (
      recurrenceEnd &&
      new Date(`${recurrenceEnd}T23:59:59`) < new Date(startsAt)
    ) {
      $("#form-error").textContent = "El fin de recurrencia no puede ser anterior al inicio.";
      return;
    }
  }

  const task = {
    ...(old || {}),
    title,
    description: $("#task-description").value.trim(),
    startsAt,
    endsAt,
    backlogOrder,
    status,
    criticality: $("#task-criticality").value,
    recurrence,
    recurrenceEnd,
    completedAt: status === "completed" ? (old?.completedAt || now) : null,
    createdAt: old?.createdAt || now,
    updatedAt: now,
  };
  if (id) task.id = id;

  await saveTask(task);
  closeModal();
  toast(id ? "Tarea actualizada" : modalUnscheduled ? "Tarea agregada al backlog" : "Tarea creada");
  await render();
});

$("#delete-task").addEventListener("click", async () => {
  const id = Number($("#task-id").value);
  if (id && confirm("¿Eliminar esta tarea?")) {
    await deleteTask(id);
    closeModal();
    toast("Tarea eliminada");
    await render();
  }
});

$("#create-task").addEventListener("click", () => openModal());
$("#close-modal").addEventListener("click", closeModal);
$("#cancel-modal").addEventListener("click", closeModal);

$$(".nav-item[data-view]").forEach(button =>
  button.addEventListener("click", () => {
    view = button.dataset.view;
    render();
  })
);

openDB()
  .then(async () => {
    COLORS = { ...DEFAULT_COLORS, ...await getSetting("criticalityColors", {}) };
    await render();
  })
  .catch(error => {
    console.error("TodoApp bootstrap failed", error);
    $("#content").innerHTML = `<div class="empty">No se pudo abrir la base de datos local.<small>${String(error?.message || error)}</small></div>`;
  });
