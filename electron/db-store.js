import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export const SCHEMA_VERSION = 1;
export const DEFAULT_COLORS = { low:"#66d9a5", medium:"#62a8ff", high:"#f6ad55", urgent:"#ff6b7a" };

export function databasePath(userDataPath) {
  return join(userDataPath, "data", "todoapp.sqlite3");
}

export class TodoStore {
  constructor(filePath) {
    this.filePath = filePath;
    mkdirSync(dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    this.migrate();
  }

  migrate() {
    const version = Number(this.db.prepare("PRAGMA user_version").get().user_version || 0);
    if (version > SCHEMA_VERSION) throw new Error(`Database schema ${version} is newer than supported ${SCHEMA_VERSION}`);
    if (version < 1) {
      this.db.exec(`
        BEGIN;
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          starts_at TEXT NOT NULL,
          ends_at TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('not_started','started','paused','blocked','completed')),
          criticality TEXT NOT NULL CHECK (criticality IN ('low','medium','high','urgent')),
          recurrence TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','daily','weekly','monthly')),
          recurrence_end TEXT,
          completed_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_tasks_starts_at ON tasks(starts_at);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
        CREATE INDEX IF NOT EXISTS idx_tasks_criticality ON tasks(criticality);
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        PRAGMA user_version = 1;
        COMMIT;
      `);
      this.setSetting("criticalityColors", DEFAULT_COLORS);
    }
  }

  allTasks() { return this.db.prepare("SELECT * FROM tasks ORDER BY starts_at, id").all().map(fromRow); }
  getTask(id) {
    const row = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(Number(id));
    return row ? fromRow(row) : null;
  }
  saveTask(task) {
    const d = normalizeTask(task);
    if (task.id) {
      const result = this.db.prepare(`UPDATE tasks SET title=?,description=?,starts_at=?,ends_at=?,status=?,criticality=?,recurrence=?,recurrence_end=?,completed_at=?,created_at=?,updated_at=? WHERE id=?`)
        .run(d.title,d.description,d.startsAt,d.endsAt,d.status,d.criticality,d.recurrence,d.recurrenceEnd,d.completedAt,d.createdAt,d.updatedAt,Number(task.id));
      if (!result.changes) throw new Error(`Task ${task.id} does not exist`);
      return Number(task.id);
    }
    const result = this.db.prepare(`INSERT INTO tasks(title,description,starts_at,ends_at,status,criticality,recurrence,recurrence_end,completed_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
      .run(d.title,d.description,d.startsAt,d.endsAt,d.status,d.criticality,d.recurrence,d.recurrenceEnd,d.completedAt,d.createdAt,d.updatedAt);
    return Number(result.lastInsertRowid);
  }
  deleteTask(id) { return Number(this.db.prepare("DELETE FROM tasks WHERE id=?").run(Number(id)).changes); }
  getSetting(key, fallback=null) {
    const row = this.db.prepare("SELECT value_json FROM settings WHERE key=?").get(key);
    return row ? JSON.parse(row.value_json) : fallback;
  }
  setSetting(key, value) {
    this.db.prepare(`INSERT INTO settings(key,value_json,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at`)
      .run(key, JSON.stringify(value), new Date().toISOString());
    return value;
  }
  info() { return { filePath:this.filePath, schemaVersion:SCHEMA_VERSION }; }
  close() { this.db.close(); }
}

function normalizeTask(task) {
  for (const key of ["title","startsAt","endsAt","status","criticality","createdAt","updatedAt"]) {
    if (task[key] == null || task[key] === "") throw new Error(`Missing task field: ${key}`);
  }
  return {
    title:String(task.title), description:String(task.description||""), startsAt:String(task.startsAt), endsAt:String(task.endsAt),
    status:String(task.status), criticality:String(task.criticality), recurrence:String(task.recurrence||"none"),
    recurrenceEnd:task.recurrenceEnd||null, completedAt:task.completedAt||null, createdAt:String(task.createdAt), updatedAt:String(task.updatedAt)
  };
}

function fromRow(row) {
  return { id:Number(row.id), title:row.title, description:row.description, startsAt:row.starts_at, endsAt:row.ends_at,
    status:row.status, criticality:row.criticality, recurrence:row.recurrence, recurrenceEnd:row.recurrence_end,
    completedAt:row.completed_at, createdAt:row.created_at, updatedAt:row.updated_at };
}
