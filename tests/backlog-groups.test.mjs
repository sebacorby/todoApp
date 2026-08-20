import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TodoStore, databasePath } from "../electron/db-store.js";

const fixture=()=>{const root=mkdtempSync(join(tmpdir(),"todo-groups-"));return{root,file:databasePath(root)}};
const close=(root,store)=>{store.close();rmSync(root,{recursive:true,force:true})};
const task=(title,group=null)=>{const now="2026-08-20T12:00:00.000Z";return{title,description:"",startsAt:null,endsAt:null,backlogOrder:0,backlogGroupId:group,status:"not_started",criticality:"medium",recurrence:"none",recurrenceEnd:null,completedAt:null,createdAt:now,updatedAt:now}};

test("creates empty nested backlog groups",()=>{const {root,file}=fixture(),s=new TodoStore(file);const a=s.saveBacklogGroup({name:"Trabajo",parentId:null,groupOrder:0});const b=s.saveBacklogGroup({name:"Backend",parentId:a,groupOrder:0});assert.deepEqual(s.allBacklogGroups().map(g=>[g.name,g.parentId]),[["Trabajo",null],["Backend",a]]);close(root,s)});
test("moves a task into a subgroup without changing identity",()=>{const {root,file}=fixture(),s=new TodoStore(file);const a=s.saveBacklogGroup({name:"A",parentId:null,groupOrder:0});const b=s.saveBacklogGroup({name:"B",parentId:a,groupOrder:0});const id=s.saveTask(task("T"));s.saveTask({...s.getTask(id),backlogGroupId:b,updatedAt:"2026-08-20T12:01:00.000Z"});assert.equal(s.getTask(id).id,id);assert.equal(s.getTask(id).backlogGroupId,b);close(root,s)});
test("rejects cycles and deleting non-empty groups",()=>{const {root,file}=fixture(),s=new TodoStore(file);const a=s.saveBacklogGroup({name:"A",parentId:null,groupOrder:0});const b=s.saveBacklogGroup({name:"B",parentId:a,groupOrder:0});assert.throws(()=>s.saveBacklogGroup({id:a,name:"A",parentId:b,groupOrder:0}),/descendants/);s.saveTask(task("T",b));assert.throws(()=>s.deleteBacklogGroup(b),/empty/);assert.throws(()=>s.deleteBacklogGroup(a),/empty/);close(root,s)});
