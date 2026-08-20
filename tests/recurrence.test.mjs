import assert from "node:assert/strict";
import{expandTasks}from"../src/recurrence.js";

const task={id:1,title:"Fin de mes",startsAt:"2026-01-31T12:00:00.000Z",endsAt:"2026-01-31T13:00:00.000Z",recurrence:"monthly", recurrenceEnd:"2026-04-30","status":"not_started","criticality":"medium"};
const out=expandTasks([task],new Date("2026-01-01T00:00:00.000Z"),new Date("2026-04-30T23:59:59.000Z"));
assert.deepEqual(out.map(x=>x.startsAt.slice(0,10)),["2026-01-31","2026-02-28","2026-03-28","2026-04-28"]);
console.log("recurrence tests: ok");
