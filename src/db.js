const DEFAULT_SERVICE_URL = "http://127.0.0.1:43127";

function desktopApi() {
  return typeof window !== "undefined" && window.todoDb ? window.todoDb : null;
}

function serviceUrl() {
  return (typeof window !== "undefined" && window.__TODO_DB_SERVICE_URL__) || DEFAULT_SERVICE_URL;
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`${serviceUrl()}${path}`, {
      ...options,
      headers: { "content-type": "application/json", ...(options.headers || {}) },
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || `Local DB service returned HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return data;
  } catch (error) {
    if (error?.name === "AbortError" || error instanceof TypeError) {
      throw new Error(`No se pudo conectar al servicio SQLite local en ${serviceUrl()}. Ejecutá "npm run db-service" y mantenelo activo.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function openDB() {
  const api = desktopApi();
  return api ? api.info() : request("/info");
}

export async function allTasks() {
  const api = desktopApi();
  return api ? api.allTasks() : request("/tasks");
}

export async function getTask(id) {
  const api = desktopApi();
  if (api) return api.getTask(Number(id));
  try { return await request(`/tasks/${Number(id)}`); }
  catch (error) { if (error.status === 404) return null; throw error; }
}

export async function saveTask(task) {
  const api = desktopApi();
  if (api) return api.saveTask(task);
  const { id } = await request("/tasks", { method: "POST", body: JSON.stringify(task) });
  return id;
}

export async function deleteTask(id) {
  const api = desktopApi();
  if (api) return api.deleteTask(Number(id));
  const { deleted } = await request(`/tasks/${Number(id)}`, { method: "DELETE" });
  return deleted;
}

export async function getSetting(key, fallback = null) {
  const api = desktopApi();
  if (api) return api.getSetting(key, fallback);
  try {
    const { value } = await request(`/settings/${encodeURIComponent(key)}`);
    return value;
  } catch (error) {
    if (error.status === 404) return fallback;
    throw error;
  }
}

export async function saveSetting(key, value) {
  const api = desktopApi();
  if (api) return api.saveSetting(key, value);
  const result = await request(`/settings/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify({ value }),
  });
  return result.value;
}
