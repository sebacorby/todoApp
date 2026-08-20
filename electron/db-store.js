import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export const SCHEMA_VERSION = 2;
export const DEFAULT_COLORS = {
  low: "#66d9a5",
  medium: "#62a8ff",
  high: "#f6ad55",
  urgent: "#ff6b7a",
};

export const databasePath = userDataPath =>
  join(userDataPath, "data", "todoapp.sqlite3");

const TASK_TABLE = `
CREATE TABLE tasks(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  starts_at TEXT,
  ends_at TEXT,
  backlog_order INTEGER,
  status TEXT NOT NULL CHECK(status IN('not_started','started','paused','blocked','completed')),
  criticality TEXT NOT NULL CHECK(criticality IN('low','medium','high','urgent')),
  recurrence TEXT NOT NULL DEFAULT 'none' CHECK(recurrence IN('none','daily','weekly','monthly')),
  recurrence_end TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK((starts_at IS NULL AND ends_at IS NULL) OR (starts_at IS NOT NULL AND ends_at IS NOT NULL)),
  CHECK(starts_at IS NOT NULL OR recurrence='none')
);`;

const TASK_INDEXES = `
CREATE INDEX idx_tasks_starts_at ON tasks(starts_at);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_criticality ON tasks(criticality);
CREATE INDEX idx_tasks_backlog_order ON tasks(backlog_order);`;

const fromRow = row => ({
  id: Number(row.id),
  title: row.title,
  description: row.description,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  backlogOrder: row.backlog_order == null ? null : Number(row.backlog_order),
  status: row.status,
  criticality: row.criticality,
  recurrence: row.recurrence,
  recurrenceEnd: row.recurrence_end,
  completedAt: row.completed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

function normalizeTask(task) {
  for (const key of ["title", "status", "criticality", "createdAt", "updatedAt"]) {
    if (task[key] == null || task[key] === "") {
      throw new Error(`Missing task field: ${key}`);
    }
  }

  const hasStart = task.startsAt != null && task.startsAt !== "";
  const hasEnd = task.endsAt != null && task.endsAt !== "";
  if (hasStart !== hasEnd) {
    throw new Error("startsAt and endsAt must both be set or both be null");
  }

  const recurrence = String(task.recurrence || "none");
  if (!hasStart && recurrence !== "none") {
    throw new Error("Backlog tasks cannot be recurrent until scheduled");
  }

  return {
    title: String(task.title),
    description: String(task.description || ""),
    startsAt: hasStart ? String(task.startsAt) : null,
    endsAt: hasEnd ? String(task.endsAt) : null,
    backlogOrder: task.backlogOrder == null ? null : Number(task.backlogOrder),
    status: String(task.status),
    criticality: String(task.criticality),
    recurrence,
    recurrenceEnd: hasStart ? (task.recurrenceEnd || null) : null,
    completedAt: task.completedAt || null,
    createdAt: String(task.createdAt),
    updatedAt: String(task.updatedAt),
  };
}

export class TodoStore {
  constructor(filePath) {
    this.filePath = filePath;
    mkdirSync(dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
    this.migrate();
  }

  migrate() {
    const version = Number(
      this.db.prepare("PRAGMA user_version").get().user_version || 0,
    );

    if (version > SCHEMA_VERSION) {
      throw new Error(
        `Database schema ${version} is newer than supported ${SCHEMA_VERSION}`,
      );
    }

    if (version < 1) {
      this.db.exec(`
        BEGIN;
        ${TASK_TABLE}
        ${TASK_INDEXES}
        CREATE TABLE settings(
          key TEXT PRIMARY KEY,
          value_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        PRAGMA user_version=2;
        COMMIT;
      `);
      this.setSetting("criticalityColors", DEFAULT_COLORS);
      return;
    }

    if (version < 2) {
      this.db.exec(`
        BEGIN;
        DROP INDEX IF EXISTS idx_tasks_starts_at;
        DROP INDEX IF EXISTS idx_tasks_status;
        DROP INDEX IF EXISTS idx_tasks_criticality;
        ALTER TABLE tasks RENAME TO tasks_v1;
        ${TASK_TABLE}
        INSERT INTO tasks(
          id,title,description,starts_at,ends_at,backlog_order,status,criticality,
          recurrence,recurrence_end,completed_at,created_at,updated_at
        )
        SELECT
          id,title,description,starts_at,ends_at,NULL,status,criticality,
          recurrence,recurrence_end,completed_at,created_at,updated_at
        FROM tasks_v1;
        DROP TABLE tasks_v1;
        ${TASK_INDEXES}
        PRAGMA user_version=2;
        COMMIT;
      `);
    }
  }

  allTasks() {
    return this.db.prepare(`
      SELECT * FROM tasks
      ORDER BY
        CASE WHEN starts_at IS NULL THEN 1 ELSE 0 END,
        starts_at,
        backlog_order,
        id
    `).all().map(fromRow);
  }

  getTask(id) {
    const row = this.db.prepare("SELECT * FROM tasks WHERE id=?").get(Number(id));
    return row ? fromRow(row) : null;
  }

  saveTask(task) {
    const data = normalizeTask(task);
    const values = [
      data.title,
      data.description,
      data.startsAt,
      data.endsAt,
      data.backlogOrder,
      data.status,
      data.criticality,
      data.recurrence,
      data.recurrenceEnd,
      data.completedAt,
      data.createdAt,
      data.updatedAt,
    ];

    if (task.id) {
      const result = this.db.prepare(`
        UPDATE tasks SET
          title=?,description=?,starts_at=?,ends_at=?,backlog_order=?,status=?,
          criticality=?,recurrence=?,recurrence_end=?,completed_at=?,
          created_at=?,updated_at=?
        WHERE id=?
      `).run(...values, Number(task.id));

      if (!result.changes) throw new Error(`Task ${task.id} does not exist`);
      return Number(task.id);
    }

    const result = this.db.prepare(`
      INSERT INTO tasks(
        title,description,starts_at,ends_at,backog_order,status,criticality,
        recurrence,recurrence_end,completed_at,created_at,updated_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(...values);
    return Number(result.lastInsertRowid);
  }

  deleteTask(id) {
    return Number(
      this.db.prepare("DELETE FROM tasks WHERE id=?").run(Number(id)).changes,
    );
  }

  getSetting(key, fallback = null) {
    const row = this.db
      .prepare("SELECT value_json FROM settings WHERE key=?")
      .get(key);
    return row ? JSON.parse(row.value_json) : fallback;
  }

  setSetting(key, value) {
    this.db.prepare(`
      INSERT INTO settings(key,value_json,updated_at) VALUES(?,?,?)
      ON CONFLICT(key) DO UPDATE SET
        value_json=excluded.value_json,
        updated_at=excluded.updated_at
    `).run(key, JSON.stringify(value), new Date().toISOString());
    return value;
  }

  info() {
    return { filePath: this.filePath, schemaVersion: SCHEMA_VERSION };
  }

  close() {
    this.db.close();
  }
}
