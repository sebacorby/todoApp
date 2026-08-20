import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { TodoStore, databasePath, DEFAULT_COLORS, SCHEMA_VERSION } from "../electron/db-store.js";

const task = (title = "Persistente") => ({
  title, description:"Prueba",
  startsAt:"2026-08-20T12:00:00.000Z", endsAt:"2026-08-20T13:00:00.000Z",
  backlogOrder:null, status:"not_started", criticality:"medium", recurrence:"none",
  recurrenceEnd:null, completedAt:null,
  createdAt:"2026-08-20T10:00:00.000Z", updatedAt:"2026-08-20T10:00:00.000Z",
});
const backlog = (title="Backlog", order=0) => ({ ...task(title), startsAt:null, endsAt:null, backlogOrder:order });
const fixture = () => { const root=mkdtempSync(join(tmpdir(),"todoapp-db-")); return { root, file:databasePath(root) }; };
const clean = (root, store) => { store?.close(); rmSync(root,{recursive:true,force:true}); };

test("creates physical SQLite schema v2", () => {
  const {root,file}=fixture(), store=new TodoStore(file);
  assert.ok(existsSync(file));
  assert.equal(readFileSync(file).subarray(0,16).toString("utf8"),"SQLite format 3\0");
  assert.equal(store.db.prepare("PRAGMA user_version").get().user_version,SCHEMA_VERSION);
  clean(root,store);
});

test("scheduled CRUD persists after reopen", () => {
  const {root,file}=fixture(); let store=new TodoStore(file);
  const id=store.saveTask(task()); store.close(); store=new TodoStore(file);
  assert.equal(store.getTask(id).title,"Persistente");
  assert.equal(store.deleteTask(id),1);
  clean(root,store);
});

test("unscheduled task persists null dates and order", () => {
  const {root,file}=fixture(); let store=new TodoStore(file);
  const id=store.saveTask(backlog("Sin fecha",7)); store.close(); store=new TodoStore(file);
  const saved=store.getTask(id);
  assert.equal(saved.startsAt,null); assert.equal(saved.endsAt,null); assert.equal(saved.backlogOrder,7);
  clean(root,store);
});

test("backlog ordering is deterministic", () => {
  const {root,file}=fixture(), store=new TodoStore(file);
  const a=store.saveTask(backlog("A",20)), b=store.saveTask(backlog("B",10));
  assert.deepEqual(store.allTasks().filter(x=>!x.startsAt).map(x=>x.id),[b,a]);
  clean(root,store);
});

test("backlog task schedules without changing identity", () => {
  const {root,file}=fixture(), store=new TodoStore(file);
  const id=store.saveTask(backlog("Planificar",0));
  store.saveTask({ ...store.getTask(id),
    startsAt:"2026-08-21T14:00:00.000Z", endsAt:"2026-08-21T15:00:00.000Z",
    backlogOrder:null, updatedAt:"2026-08-20T11:00:00.000Z"
  });
  const saved=store.getTask(id);
  assert.equal(saved.id,id); assert.equal(saved.backlogOrder,null);
  assert.equal(saved.startsAt,"2026-08-21T14:00:00.000Z");
  clean(root,store);
});

test("settings persist", () => {
  const {root,file}=fixture(); let store=new TodoStore(file);
  assert.deepEqual(store.getSetting("criticalityColors"),DEFAULT_COLORS);
  store.setSetting("criticalityColors",{...DEFAULT_COLORS,urgent:"#abcdef"});
  store.close(); store=new TodoStore(file);
  assert.equal(store.getSetting("criticalityColors").urgent,"#abcdef");
  clean(root,store);
});

test("migrates v1 with legacy indexes without data loss", () => {
  const {root,file}=fixture(); mkdirSync(dirname(file),{recursive:true});
  const raw=new DatabaseSync(file);
  raw.exec(`
    CREATE TABLE tasks(
      id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',
      starts_at TEXT NOT NULL,ends_at TEXT NOT NULL,status TEXT NOT NULL,criticality TEXT NOT NULL,
      recurrence TEXT NOT NULL DEFAULT 'none',recurrence_end TEXT,completed_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
    );
    CREATE INDEX idx_tasks_starts_at ON tasks(starts_at);
    CREATE INDEX idx_tasks_status ON tasks(status);
    CREATE INDEX idx_tasks_criticality ON tasks(criticality);
    CREATE TABLE settings(key TEXT PRIMARY KEY,value_json TEXT NOT NULL,updated_at TEXT NOT NULL);
    INSERT INTO tasks(title,description,starts_at,ends_at,status,criticality,recurrence,created_at,updated_at)
    VALUES('Vieja','','2026-08-20T12:00:00.000Z','2026-08-20T13:00:00.000Z','not_started','medium','none','2026-08-20T10:00:00.000Z','2026-08-20T10:00:00.000Z');
    PRAGMA user_version=1;
  `);
  raw.close();
  const store=new TodoStore(file);
  assert.equal(store.db.prepare("PRAGMA user_version").get().user_version,2);
  const migrated=store.allTasks()[0];
  assert.equal(migrated.title,"Vieja"); assert.equal(migrated.backlogOrder,null);
  clean(root,store);
});

test("future schema is rejected", () => {
  const {root,file}=fixture(); let store=new TodoStore(file); store.close();
  const raw=new DatabaseSync(file); raw.exec(`PRAGMA user_version=${SCHEMA_VERSION+1}`); raw.close();
  assert.throws(()=>new TodoStore(file),/newer than supported/);
  rmSync(root,{recursive:true,force:true});
});

test("backlog recurrence is rejected until scheduled", () => {
  const {root,file}=fixture(), store=new TodoStore(file);
  assert.throws(()=>store.saveTask({...backlog(),recurrence:"daily"}),/cannot be recurrent/i);
  clean(root,store);
});

test("invalid status and missing title are rejected", () => {
  const {root,file}=fixture(), store=new TodoStore(file);
  assert.throws(()=>store.saveTask({...task(),status:"invalid"}),/constraint/i);
  assert.throws(()=>store.saveTask({...task(),title:""}),/Missing task field: title/);
  clean(root,store);
});
