import { allTasks, getTask, saveTask } from "./db.js";
import { reorderBacklog, scheduleTaskAt, tasksInGroup } from "./backlog-model.js";

const state = {
  card: null,
  id: null,
  pointerId: null,
  startX: 0,
  startY: 0,
  active: false,
  ghost: null,
  target: null,
  suppressClickUntil: 0,
};

const q = selector => document.querySelector(selector);

function syncCards() {
  document.querySelectorAll("[data-backlog-task]").forEach(card => {
    card.draggable = false;
    card.style.touchAction = "none";
  });
}

const observer = new MutationObserver(syncCards);
observer.observe(document.documentElement, { childList: true, subtree: true });
syncCards();

function clearTarget() {
  state.target?.classList.remove("pointer-drop-target");
  state.target = null;
}

function targetFromPoint(x, y) {
  const raw = document.elementFromPoint(x, y);
  if (!raw) return null;

  const card = raw.closest("[data-backlog-task]");
  if (card && card !== state.card) return card;

  const groupHeader = raw.closest("[data-group-target]");
  if (groupHeader) return groupHeader;

  const groupDrop = raw.closest("[data-group-drop]");
  if (groupDrop) return groupDrop;

  const rootDrop = raw.closest("[data-root-drop]");
  if (rootDrop) return rootDrop;

  const calendarSlot = raw.closest(".time-slot,.cal-day");
  if (calendarSlot) return calendarSlot;

  return null;
}

function showTarget(target) {
  if (target === state.target) return;
  clearTarget();
  state.target = target;
  state.target?.classList.add("pointer-drop-target");
}

function createGhost(card) {
  const ghost = card.cloneNode(true);
  ghost.removeAttribute("data-backlog-task");
  ghost.classList.add("backlog-drag-ghost");
  ghost.style.width = `${card.getBoundingClientRect().width}px`;
  document.body.append(ghost);
  return ghost;
}

function positionGhost(x, y) {
  if (!state.ghost) return;
  state.ghost.style.transform = `translate(${Math.round(x + 12)}px,${Math.round(y + 12)}px)`;
}

function activate(event) {
  state.active = true;
  state.card.classList.add("pointer-dragging");
  state.card.style.pointerEvents = "none";
  state.ghost = createGhost(state.card);
  positionGhost(event.clientX, event.clientY);
  document.body.classList.add("backlog-pointer-dragging");
}

function reset() {
  clearTarget();
  state.card?.classList.remove("pointer-dragging");
  if (state.card) state.card.style.pointerEvents = "";
  state.ghost?.remove();
  document.body.classList.remove("backlog-pointer-dragging");
  state.card = null;
  state.id = null;
  state.pointerId = null;
  state.active = false;
  state.ghost = null;
}

async function persist(items) {
  const updatedAt = new Date().toISOString();
  for (const item of items) await saveTask({ ...item, updatedAt });
}

async function moveInsideBacklog(taskId, target) {
  const tasks = await allTasks();
  const dragged = tasks.find(task => task.id === Number(taskId));
  if (!dragged || dragged.startsAt || dragged.endsAt) return false;

  let targetGroupId;
  let beforeId = null;

  if (target.matches("[data-backlog-task]")) {
    targetGroupId = target.dataset.group === "" ? null : Number(target.dataset.group);
    beforeId = Number(target.dataset.backlogTask);
  } else if (target.matches("[data-group-target]")) {
    targetGroupId = Number(target.dataset.groupTarget);
  } else if (target.matches("[data-group-drop]")) {
    targetGroupId = Number(target.dataset.groupDrop);
  } else if (target.matches("[data-root-drop]")) {
    targetGroupId = null;
  } else {
    return false;
  }

  const sourceGroupId = dragged.backlogGroupId ?? null;
  const changedTarget = reorderBacklog(tasks, taskId, beforeId, targetGroupId);
  if (!changedTarget.length) return false;

  await persist(changedTarget);

  if (sourceGroupId !== targetGroupId) {
    const sourceRemainder = tasksInGroup(tasks, sourceGroupId)
      .filter(task => task.id !== Number(taskId))
      .map((task, index) => ({ ...task, backlogOrder: index }));
    await persist(sourceRemainder);
  }

  return true;
}

async function moveToCalendar(taskId, slot) {
  const task = await getTask(taskId);
  if (!task) return false;

  const wasScheduled = Boolean(task.startsAt && task.endsAt);
  const hour = slot.dataset.hour == null
    ? (wasScheduled ? new Date(task.startsAt).getHours() : 9)
    : Number(slot.dataset.hour);
  const minute = slot.dataset.hour == null && wasScheduled
    ? new Date(task.startsAt).getMinutes()
    : 0;

  await saveTask(scheduleTaskAt(task, slot.dataset.date, hour, minute));
  return true;
}

document.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;
  if (event.target.closest("button,input,textarea,select,a")) return;
  const card = event.target.closest("[data-backlog-task]");
  if (!card) return;

  syncCards();
  state.card = card;
  state.id = Number(card.dataset.backlogTask);
  state.pointerId = event.pointerId;
  state.startX = event.clientX;
  state.startY = event.clientY;
  state.active = false;
  event.preventDefault();
}, true);

document.addEventListener("pointermove", event => {
  if (!state.card || event.pointerId !== state.pointerId) return;
  const distance = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);
  if (!state.active && distance >= 5) activate(event);
  if (!state.active) return;

  event.preventDefault();
  positionGhost(event.clientX, event.clientY);
  showTarget(targetFromPoint(event.clientX, event.clientY));
}, true);

document.addEventListener("pointerup", async event => {
  if (!state.card || event.pointerId !== state.pointerId) return;
  const wasActive = state.active;
  const taskId = state.id;
  const target = wasActive ? targetFromPoint(event.clientX, event.clientY) : null;

  if (wasActive) {
    event.preventDefault();
    state.suppressClickUntil = Date.now() + 350;
  }

  reset();

  if (!wasActive || !target) return;

  try {
    const moved = target.matches(".time-slot,.cal-day")
      ? await moveToCalendar(taskId, target)
      : await moveInsideBacklog(taskId, target);

    if (moved) await window.todoRenderApp?.();
  } catch (error) {
    console.error("Backlog pointer drag failed", error);
  }
}, true);

document.addEventListener("pointercancel", event => {
  if (state.card && event.pointerId === state.pointerId) reset();
}, true);

document.addEventListener("click", event => {
  if (Date.now() < state.suppressClickUntil && event.target.closest("[data-backlog-task]")) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);
