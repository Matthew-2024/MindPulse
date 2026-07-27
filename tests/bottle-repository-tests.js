import assert from "node:assert/strict";

await import("../src/features/bottle/bottle-repository.js");

const api = globalThis.MindPulseBottleRepository;
assert(api, "MindPulseBottleRepository should be exposed on globalThis");

function makeMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
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
  "listRepliesForOwnBottle"
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

console.log("Bottle repository tests passed.");
