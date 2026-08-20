if (!document.querySelector('link[data-calendar-css]')) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./src/calendar.css";
  link.dataset.calendarCss = "";
  document.head.append(link);
}

import { getTask, saveTask } from "./db.js";
import { expandTasks } from "./recurrence.js";
import { scheduleTaskAt } from "./backlog-model.js";

let cursor = new Date();
let mode = "month";

const pad = number => String(number).padStart(2, "0");
const key = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const dayStart = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const monday = date => {
  const start = dayStart(date);
  const weekday = (start.getDay() + 6) % 7;
  return addDays(start, -weekday);
};
const taskKey = task => key(new Date(task.startsAt));
const hour = task => new Date(task.startsAt).getHours();
const time = task => new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date(task.startsAt));
const monthTitle = date => new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(date);
const dayTitle = date => new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short" }).format(date);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

const scheduledTasks = tasks => tasks.filter(task => task.startsAt && task.endsAt);

function eventHTML(task, colors) {
  return `<button class="cal-event" draggable="true" data-task="${task.id}" style="--event:${colors[task.criticality]}" title="${escapeHtml(task.title)}">
    <span>${time(task)}</span>${escapeHtml(task.title)}${task.virtual ? " ↻" : ""}
  </button>`;
}

function toolbar() {
  return `<div class="calendar-toolbar">
    <div class="calendar-nav">
      <button data-cal="prev">‹</button><button data-cal="today">Hoy</button><button data-cal="next">›</button>
      <strong>${monthTitle(cursor)}</strong>
    </div>
    <div class="calendar-modes">
      <button data-mode="month" class="${mode === "month" ? "active" : ""}">Mes</button>
      <button data-mode="week" class="${mode === "week" ? "active" : ""}">Semana</button>
      <button data-mode="day" class="${mode === "day" ? "active" : ""}">Día</button>
    </div>
  </div>`;
}

function month(tasks, colors) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = monday(first);
  const end = addDays(start, 42);
  const visible = expandTasks(scheduledTasks(tasks), start, end);
  const today = key(new Date());
  const heads = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    .map(label => `<div class="dow">${label}</div>`).join("");

  let cells = "";
  for (let index = 0; index < 42; index += 1) {
    const date = addDays(start, index);
    const dateKey = key(date);
    const outside = date.getMonth() !== cursor.getMonth();
    const items = visible.filter(task => taskKey(task) === dateKey);
    cells += `<div class="cal-day ${outside ? "outside" : ""} ${dateKey === today ? "today" : ""}" data-date="${dateKey}">
      <div class="day-number">${date.getDate()}</div>
      <div class="day-events">${items.map(task => eventHTML(task, colors)).join("")}</div>
    </div>`;
  }
  return `<div class="month-grid">${heads}${cells}</div>`;
}

function timeGrid(tasks, colors) {
  const start = mode === "week" ? monday(cursor) : dayStart(cursor);
  const count = mode === "week" ? 7 : 1;
  const days = Array.from({ length: count }, (_, index) => addDays(start, index));
  const visible = expandTasks(scheduledTasks(tasks), start, addDays(start, count));

  const headers = `<div class="time-corner"></div>${days.map(date =>
    `<div class="time-head">${dayTitle(date)}</div>`).join("")}`;

  let rows = "";
  for (let slotHour = 0; slotHour < 24; slotHour += 1) {
    rows += `<div class="hour-label">${pad(slotHour)}:00</div>`;
    for (const date of days) {
      const dateKey = key(date);
      const items = visible.filter(task => taskKey(task) === dateKey && hour(task) === slotHour);
      rows += `<div class="time-slot" data-date="${dateKey}" data-hour="${slotHour}">
        ${items.map(task => eventHTML(task, colors)).join("")}
      </div>`;
    }
  }
  return `<div class="time-grid" style="--days:${count}">${headers}${rows}</div>`;
}

export function calendarHTML(tasks, colors) {
  return `<section class="calendar-panel">${toolbar()}${mode === "month" ? month(tasks, colors) : timeGrid(tasks, colors)}</section>`;
}

async function moveTaskToSlot(task, slot) {
  const wasScheduled = Boolean(task.startsAt && task.endsAt);
  const slotHour = slot.dataset.hour == null
    ? (wasScheduled ? new Date(task.startsAt).getHours() : 9)
    : Number(slot.dataset.hour);
  const minute = slot.dataset.hour == null && wasScheduled
    ? new Date(task.startsAt).getMinutes()
    : 0;

  await saveTask(scheduleTaskAt(task, slot.dataset.date, slotHour, minute));
}

export function bindCalendar({ root, openTask, onChanged }) {
  root.querySelectorAll("[data-cal]").forEach(button => {
    button.onclick = () => {
      const action = button.dataset.cal;
      if (action === "today") {
        cursor = new Date();
      } else if (mode === "month") {
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + (action === "next" ? 1 : -1), 1);
      } else {
        cursor = addDays(cursor, (mode === "week" ? 7 : 1) * (action === "next" ? 1 : -1));
      }
      onChanged();
    };
  });

  root.querySelectorAll("[data-mode]").forEach(button => {
    button.onclick = () => {
      mode = button.dataset.mode;
      onChanged();
    };
  });

  root.querySelectorAll(".cal-day,.time-slot").forEach(slot => {
    slot.addEventListener("click", event => {
      if (event.target.closest(".cal-event")) return;
      const slotHour = slot.dataset.hour == null ? 9 : Number(slot.dataset.hour);
      openTask(null, new Date(`${slot.dataset.date}T${pad(slotHour)}:00:00`));
    });

    slot.addEventListener("dragover", event => {
      event.preventDefault();
      slot.classList.add("drag-over");
    });
    slot.addEventListener("dragleave", () => slot.classList.remove("drag-over"));

    slot.addEventListener("drop", async event => {
      event.preventDefault();
      slot.classList.remove("drag-over");
      const id = Number(event.dataTransfer.getData("text/task-id"));
      if (!id) return;
      const task = await getTask(id);
      if (!task) return;
      await moveTaskToSlot(task, slot);
      await onChanged();
    });
  });

  root.querySelectorAll(".cal-event").forEach(element => {
    element.addEventListener("click", event => {
      event.stopPropagation();
      openTask(Number(element.dataset.task));
    });
    element.addEventListener("dragstart", event => {
      event.dataTransfer.setData("text/task-id", element.dataset.task);
      event.dataTransfer.setData("text/task-source", "calendar");
      event.dataTransfer.effectAllowed = "move";
    });
  });
}
