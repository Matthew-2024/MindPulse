import assert from "node:assert/strict";

await import("../src/features/memo/memo-model.js");

const model = globalThis.MindPulseMemoModel;
assert(model, "MindPulseMemoModel should be exposed on globalThis");

let memo = model.createMemo("暑期安排", { now: "2026-07-27T09:00:00.000Z" });
memo = model.insertItem(memo, 0, "准备答辩稿", { now: "2026-07-27T09:01:00.000Z" });
memo = model.insertItem(memo, 1, "检查比赛材料", { now: "2026-07-27T09:02:00.000Z" });
memo = model.insertItem(memo, 1, "补充国赛截图", { now: "2026-07-27T09:03:00.000Z" });

assert.deepEqual(model.numberedItems(memo).map((item) => item.number), [1, 2, 3]);
assert.deepEqual(model.numberedItems(memo).map((item) => item.text), [
  "准备答辩稿",
  "补充国赛截图",
  "检查比赛材料"
]);
assert.equal("number" in memo.items[0], false, "persisted items must not contain display numbers");

const middleId = memo.items[1].id;
memo = model.removeItem(memo, middleId, { now: "2026-07-27T09:04:00.000Z" });
assert.deepEqual(model.numberedItems(memo).map((item) => item.number), [1, 2]);

memo = model.insertItem(memo, 1, "   ", { now: "2026-07-27T09:05:00.000Z" });
assert.deepEqual(model.numberedItems(memo).map((item) => item.number), [1, 2]);

const secondId = model.numberedItems(memo)[1].id;
memo = model.moveItem(memo, secondId, 0, { now: "2026-07-27T09:06:00.000Z" });
assert.equal(model.numberedItems(memo)[0].id, secondId);

const direct = model.searchMemos([memo], "暑期");
assert.equal(direct[0].memo.id, memo.id);
assert.equal(direct[0].matchType, "title");

const associated = model.searchMemos([memo], "竞赛");
assert.equal(associated[0].memo.id, memo.id);
assert.equal(associated[0].matchType, "synonym");
assert(associated[0].reason.includes("比赛") || associated[0].reason.includes("国赛"));

const normalized = model.normalizeMemos([
  { id: "memo-old", title: "", items: [{ id: "i1", text: "课程报告" }] },
  null,
  "broken"
]);
assert.equal(normalized.length, 1);
assert.equal(normalized[0].title, "未命名笔记");

assert.deepEqual(model.suggestTerms("竞赛"), ["比赛", "赛事", "国赛", "答辩", "参赛"]);

console.log("Memo model tests passed.");
