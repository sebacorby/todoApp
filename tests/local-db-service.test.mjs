import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalDbService } from "../service/local-db-service.js";
import { databasePath, SCHEMA_VERSION } from "../electron/db-store.js";

const task = (title = "HTTP task") => {
  const now = "2026-08-20T03:00:00.000Z";
  return {
    title, description:"loopback", startsAt:now, endsAt:"2026-08-20T04:00:00.000Z",
    backlogOrder:null, status:"not_started", criticality:"medium", recurrence:"none",
    recurrenceEnd:null, completedAt:null, createdAt:now, updatedAt:now,
  };
};

test("loopback service exposes scheduled and backlog tasks over HTTP", async () => {
  const root=mkdtempSync(join(tmpdir(),"todoapp-service-"));
  const filePath=databasePath(root);
  const service=createLocalDbService({filePath,port:0});
  const {port}=await service.listen();
  const base=`http://127.0.0.1:${port}`;
  try {
    const info=await fetch(`${base}/info`).then(r=>r.json());
    assert.equal(info.schemaVersion,SCHEMA_VERSION);
    assert.equal(info.filePath,filePath);
    assert.ok(existsSync(filePath));

    const create=await fetch(`${base}/tasks`,{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(task())
    }).then(r=>r.json());
    const saved=await fetch(`${base}/tasks/${create.id}`).then(r=>r.json());
    assert.equal(saved.title,"HTTP task");

    const backlogCreate=await fetch(`${base}/tasks`,{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({...task("HTTP backlog"),startsAt:null,endsAt:null,backlogOrder:3})
    }).then(r=>r.json());
    const backlogSaved=await fetch(`${base}/tasks/${backlogCreate.id}`).then(r=>r.json());
    assert.equal(backlogSaved.startsAt,null);
    assert.equal(backlogSaved.backlogOrder,3);

    await fetch(`${base}/settings/criticalityColors`,{
      method:"PUT",headers:{"content-type":"application/json"},
      body:JSON.stringify({value:{urgent:"#123456"}})
    });
    const setting=await fetch(`${base}/settings/criticalityColors`).then(r=>r.json());
    assert.equal(setting.value.urgent,"#123456");

    const deleted=await fetch(`${base}/tasks/${create.id}`,{method:"DELETE"}).then(r=>r.json());
    assert.equal(deleted.deleted,1);
    await fetch(`${base}/tasks/${backlogCreate.id}`,{method:"DELETE"});
  } finally {
    await service.close();
    rmSync(root,{recursive:true,force:true});
  }
});

test("loopback service rejects non-local browser origins", async () => {
  const root=mkdtempSync(join(tmpdir(),"todoapp-service-origin-"));
  const service=createLocalDbService({filePath:databasePath(root),port:0});
  const {port}=await service.listen();
  try {
    const response=await fetch(`http://127.0.0.1:${port}/info`,{headers:{Origin:"https://example.com"}});
    assert.equal(response.status,403);
  } finally {
    await service.close();
    rmSync(root,{recursive:true,force:true});
  }
});
