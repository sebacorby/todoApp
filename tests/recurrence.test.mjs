import test from "node:test";
import assert from "node:assert/strict";
import { expandTasks } from "../src/recurrence.js";

const base = {
  id: 1,
  title: "Tarea",
  description: "",
  status: "not_started",
  criticality: "medium",
  completedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const dates = (items) => items.map((item) => item.startsAt.slice(0, 10));

test("includes a non-recurring task that overlaps the requested range", () => {
  const task = {
    ...base,
    startsAt: "2026-02-10T12:00:00.000Z",
    endsAt: "2026-02-10T13:00:00.000Z",
    recurrence: "none",
    recurrenceEnd: null,
  };
  const out = expandTasks(
    [task],
    new Date("2026-02-10T12:30:00.000Z"),
    new Date("2026-02-10T12:40:00.000Z"),
  );
  assert.equal(out.length, 1);
  assert.equal(out[0], task);
});

test("daily recurrence preserves duration and clips to visible range", () => {
  const task = {
    ...base,
    startsAt: "2026-02-01T12:00:00.000Z",
    endsAt: "2026-02-01T13:30:00.000Z",
    recurrence: "daily",
    recurrenceEnd: null,
  };
  const out = expandTasks(
    [task],
    new Date("2026-02-03T00:00:00.000Z"),
    new Date("2026-02-05T23:59:59.999Z"),
  );
  assert.deepEqual(dates(out), ["2026-02-03", "2026-02-04", "2026-02-05"]);
  assert.ok(out.every((item) => new Date(item.endsAt) - new Date(item.startsAt) === 90 * 60 * 1000));
});

test("weekly recurrence advances exactly seven days", () => {
  const task = {
    ...base,
    startsAt: "2026-02-02T09:00:00.000Z",
    endsAt: "2026-02-02T10:00:00.000Z",
    recurrence: "weekly",
    recurrenceEnd: "2026-02-23",
  };
  const out = expandTasks(
    [task],
    new Date("2026-02-01T00:00:00.000Z"),
    new Date("2026-02-28T23:59:59.999Z"),
  );
  assert.deepEqual(dates(out), ["2026-02-02", "2026-02-09", "2026-02-16", "2026-02-23"]);
});

test("monthly recurrence keeps the original day anchor and clamps invalid dates", () => {
  const task = {
    ...base,
    startsAt: "2026-01-31T12:00:00.000Z",
    endsAt: "2026-01-31T13:00:00.000Z",
    recurrence: "monthly",
    recurrenceEnd: "2026-04-30",
  };
  const out = expandTasks(
    [task],
    new Date("2026-01-01T00:00:00.000Z"),
    new Date("2026-04-30T23:59:59.999Z"),
  );
  assert.deepEqual(dates(out), ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
});

test("monthly recurrence handles leap-year February", () => {
  const task = {
    ...base,
    startsAt: "2028-01-31T12:00:00.000Z",
    endsAt: "2028-01-31T13:00:00.000Z",
    recurrence: "monthly",
    recurrenceEnd: "2028-03-31",
  };
  const out = expandTasks(
    [task],
    new Date("2028-01-01T00:00:00.000Z"),
    new Date("2028-03-31T23:59:59.999Z"),
  );
  assert.deepEqual(dates(out), ["2028-01-31", "2028-02-29", "2028-03-31"]);
});

test("recurrence end date is respected", () => {
  const task = {
    ...base,
    startsAt: "2026-03-01T08:00:00.000Z",
    endsAt: "2026-03-01T09:00:00.000Z",
    recurrence: "daily",
    recurrenceEnd: "2026-03-03",
  };
  const out = expandTasks(
    [task],
    new Date("2026-03-01T00:00:00.000Z"),
    new Date("2026-03-10T23:59:59.999Z"),
  );
  assert.deepEqual(dates(out), ["2026-03-01", "2026-03-02", "2026-03-03"]);
});
