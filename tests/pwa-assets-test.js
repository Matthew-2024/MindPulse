import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const worker = await readFile(new URL("../sw.js", import.meta.url), "utf8");
for (const asset of [
  "./src/domain/decision-policy.js",
  "./src/features/memo/memo-model.js",
  "./src/features/schedule/schedule-model.js",
  "./src/features/bottle/bottle-repository.js"
]) {
  assert(worker.includes(asset), `service worker should cache ${asset}`);
}
assert(worker.includes('mindpulse-web-v2'), "service worker cache version should be bumped");
console.log("PWA asset test passed.");
