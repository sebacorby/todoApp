const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

const addMonthsClamped = (base, months) => {
  const source = new Date(base);
  const absoluteMonth = source.getMonth() + months;
  const year = source.getFullYear() + Math.floor(absoluteMonth / 12);
  const month = ((absoluteMonth % 12) + 12) % 12;
  const day = Math.min(source.getDate(), daysInMonth(year, month));
  const next = new Date(source);
  next.setFullYear(year, month, day);
  return next;
};

const occurrenceAt = (base, recurrence, index) => {
  if (recurrence === "daily") return addDays(base, index);
  if (recurrence === "weekly") return addDays(base, index * 7);
  if (recurrence === "monthly") return addMonthsClamped(base, index);
  return new Date(base);
};

export function expandTasks(tasks, rangeStart, rangeEnd) {
  const from = new Date(rangeStart);
  const to = new Date(rangeEnd);
  const out = [];

  for (const task of tasks) {
    if (!task.startsAt || !task.endsAt) continue;

    const base = new Date(task.startsAt);
    const end = new Date(task.endsAt);
    const duration = end.getTime() - base.getTime();
    const recurrence = task.recurrence || "none";

    if (!Number.isFinite(duration) || duration < 0) continue;

    if (recurrence === "none") {
      if (end >= from && base <= to) out.push(task);
      continue;
    }

    const limit = task.recurrenceEnd
      ? new Date(`${task.recurrenceEnd}T23:59:59.999`)
      : to;

    for (let index = 0; index < 5000; index += 1) {
      const start = occurrenceAt(base, recurrence, index);
      if (start > to || start > limit) break;
      const occurrenceEnd = new Date(start.getTime() + duration);
      if (occurrenceEnd < from) continue;

      out.push({
        ...task,
        startsAt: start.toISOString(),
        endsAt: occurrenceEnd.toISOString(),
        virtual: index !== 0,
        occurrenceStart: start.toISOString(),
      });
    }
  }

  return out;
}
