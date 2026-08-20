import test from "node:test";
import assert from "node:assert/strict";
import {
  backlogTasks,
  reorderBacklog,
  scheduleTaskAt,
} from "../src/backlog-model.js";

const item = (id, order = 0) => ({
  id,
  title: `T${id}`,
  startsAt: null,
  endsAt: null,
  backlogOrder: order,
  status: "not_started",
  criticality: "medium",
  recurrence: "none",
  createdAt: "2026-08-20T00:00:00.000Z",
  updatedAt: "2026-08-20T00:00:00.000Z",
});

test("backlogTasks ignores scheduled tasks and sorts by explicit order", () => {
  const out = backlogTasks([
    item(1, 20),
    { ...item(9, 0), startsAt: "2026-08-20T10:00:00.000Z", endsAt: "2026-08-20T11:00:00.000Z" },
    item(2, 10),
  ]);
  assert.deepEqual(out.map(x => x.id), [2, 1]);
});

test("reorderBacklog inserts before target and normalizes order", () => {
  const out = reorderBacklog([item(1, 0), item(2, 1), item(3, 2)], 3, 1);
  assert.deepEqual(out.map(x => x.id), [3, 1, 2]);
  assert.deepEqual(out.map(x => x.backlogOrder), [0, 1, 2]);
});

test("reorderBaclog can move a card to the end", () => {
  const out = reorderBacklog([item(1, 0), item(2, 1), item(3, 2)], 1, null);
  assert.deepEqual(out.map(x => x.id), [2, 3, 1]);
});

test("scheduleTaskAt gives unscheduled task one hour and clears backlog order", () => {
  const task = scheduleTaskAt(item(4, 8), "2026-08-21", 14, 0);
  const start = new Date(task.startsAt);
  const end = new Date(task.endsAt);
  assert.equal(start.getHours(), 14);
  assert.equal(end - start, 3_600_000);
  assert.equal(task.backlogOrder, null);
  assert.equal(task.id, 4);
});

test("scheduleTaskAt preserves duration for an already scheduled task", () => {
  const source = {
    ...item(5, null),
    startsAt: "2026-08-20T10:15:00.000Z",
    endsAt: "2026-08-20T12:15:00.000Z",
  };
  const task = scheduleTaskAt(source, "2026-08-22", 9, 30);
  assert.equal(new Date(task.endsAt) - new Date(task.startsAt), 7_200_000);
});
