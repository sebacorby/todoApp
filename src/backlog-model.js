const pad = n => String(n).padStart(2, "0");

export function backlogTasks(tasks) {
  return tasks
    .filter(task => !task.startsAt && !task.endsAt)
    .sort((a, b) =>
      (a.backlogOrder ?? Number.MAX_SAFE_INTEGER) -
        (b.backlogOrder ?? Number.MAX_SAFE_INTEGER) ||
      a.id - b.id
    );
}

export function reorderBacklog(tasks, draggedId, beforeId = null) {
  const backlog = backlogTasks(tasks);
  const dragged = backlog.find(task => task.id === Number(draggedId));
  if (!dragged) return backlog;

  const items = backlog.filter(task => task.id !== Number(draggedId));
  let index = beforeId == null
    ? items.length
    : items.findIndex(task => task.id === Number(beforeId));
  if (index < 0) index = items.length;
  items.splice(index, 0, dragged);
  return items.map((task, order) => ({ ...task, backlogOrder: order }));
}

export function scheduleTaskAt(task, dateKey, hour, minute = 0) {
  const alreadyScheduled = Boolean(task.startsAt && task.endsAt);
  const duration = alreadyScheduled
    ? Math.max(60_000, new Date(task.endsAt) - new Date(task.startsAt))
    : 3_600_000;

  const start = new Date(`${dateKey}T${pad(hour)}:${pad(minute)}:00`);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid calendar drop target");
  }

  return {
    ...task,
    startsAt: start.toISOString(),
    endsAt: new Date(start.getTime() + duration).toISOString(),
    backlogOrder: null,
    updatedAt: new Date().toISOString(),
  };
}
