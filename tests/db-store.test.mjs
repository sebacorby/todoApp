import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { TodoStore, databasePath, DEFAULT_COLORS, SCHEMA_VERSION } from "../electron/db-store.js";

const makeTask=(title="Persistente")=>({title,description:"Prueba física",startsAt:"2026-08-20T12:00:00.000Z",endsAt:"2026-08-20T13:00:00.000Z",status:"not_started",criticality:"medium",recurrence:"none",recurrenceEnd:null,completedAt:null,createdAt:"2026-08-20T10:00:00.000Z",updatedAt:"2026-08-20T10:00:00.000Z"});
const fixture=()=>{const root=mkdtempSync(join(tmpdir(),"todoapp-db-"));return{root,file:databasePath(root)}};
const clean=(root,store)=>{store?.close();rmSync(root,{recursive:true,force:true})};

test("database path is stable and independent from browser origin",()=>assert.equal(databasePath("/tmp/user-data"),join("/tmp/user-data","data","todoapp.sqlite3")));

test("creates a physical SQLite file with schema",()=>{const {root,file}=fixture();const s=new TodoStore(file);assert.ok(existsSync(file));assert.equal(readFileSync(file).subarray(0,16).toString("utf8"),"SQLite format 3\0");assert.equal(s.db.prepare("PRAGMA user_version").get().user_version,SCHEMA_VERSION);clean(root,s)});

test("CRUD persists after close and reopen",()=>{const {root,file}=fixture();let s=new TodoStore(file);const id=s.saveTask(makeTask());s.close();s=new TodoStore(file);assert.equal(s.getTask(id).title,"Persistente");s.saveTask({...s.getTask(id),status:"completed",completedAt:"2026-08-20T13:00:00.000Z"});assert.equal(s.getTask(id).status,"completed");assert.equal(s.deleteTask(id),1);assert.equal(s.getTask(id),null);clean(root,s)});

test("settings persist across reopen",()=>{const {root,file}=fixture();let s=new TodoStore(file);assert.deepEqual(s.getSetting("criticalityColors"),DEFAULT_COLORS);s.setSetting("criticalityColors",{...DEFAULT_COLORS,urgent:"#abcdef"});s.close();s=new TodoStore(file);assert.equal(s.getSetting("criticalityColors").urgent,"#abcdef");clean(root,s)});

test("current schema reopens without data loss",()=>{const {root,file}=fixture();let s=new TodoStore(file);const id=s.saveTask(makeTask("No borrar"));s.close();s=new TodoStore(file);assert.equal(s.getTask(id).title,"No borrar");clean(root,s)});

test("future schema is rejected safely",()=>{const {root,file}=fixture();let s=new TodoStore(file);s.close();const raw=new DatabaseSync(file);raw.exec(`PRAGMA user_version = ${SCHEMA_VERSION+1}`);raw.close();assert.throws(()=>new TodoStore(file),/newer than supported/);rmSync(root,{recursive:true,force:true})});

test("constraints reject invalid status and criticality",()=>{const {root,file}=fixture();const s=new TodoStore(file);assert.throws(()=>s.saveTask({...makeTask(),status:"invalid"}),/constraint/i);assert.throws(()=>s.saveTask({...makeTask(),criticality:"invalid"}),/constraint/i);clean(root,s)});

test("missing required task fields are rejected before SQL",()=>{const {root,file}=fixture();const s=new TodoStore(file);assert.throws(()=>s.saveTask({...makeTask(),title:""}),/Missing task field: title/);clean(root,s)});
