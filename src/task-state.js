import { getTask, saveTask } from "./db.js";

export const TASK_STATUS_LABELS = {
  not_started: "Sin iniciar",
  started: "Iniciada",
  paused: "Pausada",
  blocked: "Bloqueada",
  completed: "Completa",
};

export const COMPLETED_COLOR = "#2fbf71";

export function withTaskStatus(task, status, now = new Date().toISOString()) {
  if (!Object.prototype.hasOwnProperty.call(TASK_STATUS_LABELS, status)) {
    throw new Error(`Estado de tarea inválido: ${status}`);
  }
  return {
    ...task,
    status,
    completedAt: status === "completed" ? (task.completedAt || now) : null,
    updatedAt: now,
  };
}

export async function setTaskStatus(id, status) {
  const task = await getTask(Number(id));
  if (!task) return null;
  const next = withTaskStatus(task, status);
  await saveTask(next);
  return next;
}

export const isCompleted = task => task?.status === "completed";
