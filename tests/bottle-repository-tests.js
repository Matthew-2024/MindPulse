import assert from "node:assert/strict";

await import("../src/features/bottle/bottle-repository.js");

const api = globalThis.MindPulseBottleRepository;
assert(api, "MindPulseBottleRepository should be exposed on globalThis");

function makeMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    get length() { return values.size; },
    key(index) { return Array.from(values.keys())[index] || null; }
  };
}

const storage = makeMemoryStorage();
const repo = api.createLocalBottleRepository(storage, {
  random: () => 0,
  now: () => "2026-07-27T09:00:00.000Z"
});

for (const method of [
  "listOwnBottles",
  "createBottle",
  "drawBottle",
  "replyToBottle",
  "listRepliesForOwnBottle",
  "hideBottle",
  "reportBottle",
  "listHiddenBottleIds",
  "exportOwnData",
  "clearOwnData"
]) {
  assert.equal(typeof repo[method], "function", `${method} should be replaceable by a future backend repository`);
}

assert.equal(repo.createBottle("profile-a", "   "), null);
const own = repo.createBottle("profile-a", "最近比赛压力有点大");
assert.equal(repo.listOwnBottles("profile-a").length, 1);
assert.equal(repo.listOwnBottles("profile-b").length, 0);

const drawn = repo.drawBottle("profile-a");
assert(drawn, "drawBottle should return a seeded demo bottle");
assert.notEqual(drawn.ownerId, "profile-a");
assert.equal(drawn.demo, true);
assert.equal("realName" in drawn, false);

assert.equal(repo.replyToBottle("profile-a", drawn.id, "希望你今晚能休息一下").bottleId, drawn.id);
assert.deepEqual(repo.listRepliesForOwnBottle("profile-a", own.id), []);

repo.replyToBottle("profile-b", own.id, "我看见你的压力了，慢慢来");
const ownerReplies = repo.listRepliesForOwnBottle("profile-a", own.id);
assert.equal(ownerReplies.length, 1);
assert.equal(ownerReplies[0].content, "我看见你的压力了，慢慢来");
assert.deepEqual(repo.listRepliesForOwnBottle("profile-b", own.id), []);
assert.equal(repo.replyToBottle("profile-b", own.id, "  "), null);

assert.equal(repo.hideBottle("profile-a", drawn.id), true);
assert.deepEqual(repo.listHiddenBottleIds("profile-a"), [drawn.id]);
assert.equal(repo.drawBottle("profile-a").id, "demo_bottle_2");
const reported = repo.reportBottle("profile-a", "demo_bottle_2", "不想看到这条");
assert.equal(reported?.bottleId, "demo_bottle_2");
assert.equal(repo.drawBottle("profile-a").id, "demo_bottle_3");

const exported = repo.exportOwnData("profile-a");
assert.equal(exported.bottles.length, 1);
assert.equal(exported.bottles[0].content, "最近比赛压力有点大");
assert.equal(exported.bottleReplies.length, 1);
assert.deepEqual(exported.hiddenBottleIds, [drawn.id, "demo_bottle_2"]);
assert.equal(exported.reports.length, 1);
assert.equal(repo.exportOwnData("profile-b").bottles.length, 0);

repo.clearOwnData("profile-a");
assert.equal(repo.listOwnBottles("profile-a").length, 0);
assert.deepEqual(repo.listHiddenBottleIds("profile-a"), []);
assert.equal(storage.getItem("mindpulse:demo-sea-1:bottleReplies"), null, "clearing a profile should remove replies authored by that profile on other bottles");

console.log("Bottle repository tests passed.");
