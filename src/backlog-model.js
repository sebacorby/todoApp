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

export function tasksInGroup(tasks, groupId = null) {
  return backlogTasks(tasks)
    .filter(task => (task.backlogGroupId ?? null) === (groupId ?? null));
}

export function reorderBacklog(tasks, draggedId, beforeId = null, groupId = undefined) {
  const backlog = backlogTasks(tasks);
  const dragged = backlog.find(task => task.id === Number(draggedId));
  if (!dragged) return [];

  const targetGroup = groupId === undefined ? (dragged.backlogGroupId ?? null) : (groupId ?? null);
  const target = backlog
    .filter(task => task.id !== dragged.id && (task.backlogGroupId ?? null) === targetGroup);

  let index = beforeId == null ? target.length : target.findIndex(task => task.id === Number(beforeId));
  if (index < 0) index = target.length;

  target.splice(index, 0, { ...dragged, backlogGroupId: targetGroup });
  return target.map((task, order) => ({ ...task, backlogOrder: order }));
}

export function scheduleTaskAt(task, dateKey, hour, minute = 0) {
  const alreadyScheduled = Boolean(task.startsAt && task.endsAt);
  const duration = alreadyScheduled
    ? Math.max(60_000, new Date(task.endsAt) - new Date(task.startsAt))
    : 3_600_000;

  const start = new Date(`${dateKey}T${pad(hour)}:${pad(minute)}:00`);
  if (Number.isNaN(start.getTime())) throw new Error("Invalid calendar drop target");

  return {
    ...task,
    startsAt: start.toISOString(),
    endsAt: new Date(start.getTime() + duration).toISOString(),
    backlogOrder: null,
    backlogGroupId: null,
    updatedAt: new Date().toISOString(),
  };
}
