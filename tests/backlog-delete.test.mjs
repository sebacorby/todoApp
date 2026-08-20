import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TodoStore, databasePath } from "../electron/db-store.js";

const fixture=()=>{
  const root=mkdtempSync(join(tmpdir(),"todo-delete-group-"));
  return {root,file:databasePath(root)};
};
const cleanup=(root,store)=>{
  store.close();
  rmSync(root,{recursive:true,force:true});
};
const backlogTask=(title,groupId)=>{
  const now="2026-08-20T12:00:00.000Z";
  return {
    title,description:"",startsAt:null,endsAt:null,backlogOrder:0,
    backlogGroupId:groupId,status:"not_started",criticality:"medium",
    recurrence:"none",recurrenceEnd:null,completedAt:null,
    createdAt:now,updatedAt:now,
  };
};

test("deletes an empty backlog folder",()=>{
  const {root,file}=fixture(),store=new TodoStore(file);
  const id=store.saveBacklogGroup({name:"Vacía",parentId:null,groupOrder:0});
  assert.equal(store.deleteBacklogGroup(id),1);
  assert.equal(store.getBacklogGroup(id),null);
  cleanup(root,store);
});

test("blocks deleting a folder that contains a task",()=>{
  const {root,file}=fixture(),store=new TodoStore(file);
  const id=store.saveBacklogGroup({name:"Con tarea",parentId:null,groupOrder:0});
  store.saveTask(backlogTask("Hija",id));
  assert.throws(()=>store.deleteBacklogGroup(id),/empty/i);
  assert.ok(store.getBacklogGroup(id));
  cleanup(root,store);
});

test("blocks deleting a folder that has a child folder",()=>{
  const {root,file}=fixture(),store=new TodoStore(file);
  const parent=store.saveBacklogGroup({name:"Padre",parentId:null,groupOrder:0});
  store.saveBacklogGroup({name:"Hija",parentId:parent,groupOrder:0});
  assert.throws(()=>store.deleteBacklogGroup(parent),/empty/i);
  assert.ok(store.getBacklogGroup(parent));
  cleanup(root,store);
});
