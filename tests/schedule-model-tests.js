import assert from "node:assert/strict";

await import("../src/features/schedule/schedule-model.js");

const model = globalThis.MindPulseScheduleModel;
assert(model, "MindPulseScheduleModel should be exposed on globalThis");

const now = new Date("2026-07-27T09:00:00+08:00");
const items = [
  { id: "late", title: "第九天", dueAt: "2026-08-04T10:00:00+08:00", done: false },
  { id: "edge", title: "第八天", dueAt: "2026-08-03T18:00:00+08:00", done: false },
  { id: "soon", title: "明天", dueAt: "2026-07-28T10:00:00+08:00", done: false },
  { id: "done", title: "已完成", dueAt: "2026-07-28T08:00:00+08:00", done: true },
  { id: "undated", title: "没有日期", dueAt: null, done: false }
];

assert.deepEqual(model.itemsInRange(items, now, 8).map((item) => item.id), ["soon", "edge"]);
assert.deepEqual(
  model.itemsInRange(items, now, 8, { includeUndated: true }).map((item) => item.id),
  ["soon", "edge", "undated"]
);
assert.equal(model.startOfWeek(now).getDay(), 1);
assert.equal(model.dateKey(model.startOfWeek(now)), "2026-07-27");

const created = model.createScheduleItem({
  title: "提交材料",
  dueDate: "2026-07-30",
  dueTime: "20:30"
}, { now: "2026-07-27T09:00:00+08:00", id: "created" });
assert.equal(created.id, "created");
assert.equal(model.dateKey(created.dueAt), "2026-07-30");
assert.equal(new Date(created.dueAt).getHours(), 20);

const groupedWeek = model.groupItems(items, "week", now);
assert(groupedWeek.some((group) => group.key === "2026-07-28" && group.items[0].id === "done"));
const groupedMonth = model.groupItems(items, "month", now);
assert(groupedMonth.some((group) => group.key === "2026-07"));
assert(groupedMonth.some((group) => group.key === "2026-08"));
const groupedYear = model.groupItems(items, "year", now);
assert(groupedYear.some((group) => group.key === "2026"));

const normalized = model.normalizeItems([null, "bad", { id: "x", title: "", dueAt: "bad" }]);
assert.equal(normalized.length, 1);
assert.equal(normalized[0].title, "未命名待办");
assert.equal(normalized[0].dueAt, null);

console.log("Schedule model tests passed.");
