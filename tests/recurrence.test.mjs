import test from "node:test";
import assert from "node:assert/strict";
import { expandTasks } from "../src/recurrence.js";

const base={id:1,title:"T",description:"",status:"not_started",criticality:"medium",completedAt:null,createdAt:"2026-01-01T00:00:00.000Z",updatedAt:"2026-01-01T00:00:00.000Z"};
const dates=out=>out.map(x=>x.startsAt.slice(0,10));

test("non-recurring task overlapping range is included",()=>{
 const t={...base,startsAt:"2026-02-10T12:00:00.000Z",endsAt:"2026-02-10T13:00:00.000Z",recurrence:"none",recurrenceEnd:null};
 assert.equal(expandTasks([t],new Date("2026-02-10T12:30:00.000Z"),new Date("2026-02-10T12:40:00.000Z")).length,1)
});

test("daily recurrence preserves duration",t()=>{});
