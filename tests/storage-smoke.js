import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const entry = readdirSync(resolve(".")).find((name) => name.includes("Web") && name.endsWith(".html"));
if (!entry) throw new Error("Web prototype HTML entry was not found.");
const edgeCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || edgeCandidates.find((path) => existsSync(path));
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const url = pathToFileURL(resolve(entry)).href + "?smoke=1";
await page.goto(url, { waitUntil: "load" });
await page.evaluate(async () => {
  localStorage.clear();
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("mindpulse-local-vault");
    request.onsuccess = request.onblocked = () => resolve();
    request.onerror = () => reject(request.error);
  });
});
await page.reload({ waitUntil: "load" });
await page.waitForSelector("#spotlightGo");

await page.click("#tabCheckin");
await page.waitForSelector(".sheet");
await page.click('[data-em="anxious"]');
await page.click("#checkNext");
await page.click('[data-check-field="ciSleep"][data-check-value="ok"]');
await page.click('[data-check-field="ciEnergy"][data-check-value="mid"]');
await page.click('[data-check-field="ciConnect"][data-check-value="ok"]');
await page.click("#checkNext2");
await page.click("#checkNext3");
await page.fill("#checkInput", "storage-marker: record survives refresh");
await page.click("#checkSave");
await page.click("#checkClose");
await page.evaluate(() => window.MindPulseDebug.flushVault());

const beforeRefresh = await page.evaluate(async () => {
  const state = window.MindPulseDebug.getState();
  const record = await window.MindPulseVaultStore.readVault(state.user.vaultId);
  return {
    vaultId: state.user.vaultId,
    hasMarker: record?.records?.some((item) => item.note.includes("storage-marker")) === true,
    localValues: Object.values(localStorage).join("\n")
  };
});
assert(beforeRefresh.hasMarker, "a saved note should exist in the IndexedDB vault");
assert(!beforeRefresh.localValues.includes("storage-marker"), "localStorage should not contain psychological note text");

await page.reload({ waitUntil: "load" });
await page.waitForSelector("#spotlightGo");
const afterRefresh = await page.evaluate(() => ({
  hasMarker: window.MindPulseDebug.getState().recs.some((item) => item.note.includes("storage-marker")),
  vaultReady: window.MindPulseDebug.getState().vaultReady
}));
assert(afterRefresh.vaultReady && afterRefresh.hasMarker, "refresh should restore the saved vault state");

await page.evaluate(async (vaultId) => {
  const activeId = JSON.parse(localStorage.getItem("mindpulseActiveProfile"));
  await window.MindPulseVaultStore.deleteVault(vaultId);
  localStorage.setItem(`mindpulse:${activeId}:recs`, JSON.stringify([{
    id: "legacy-record",
    createdAt: new Date().toISOString(),
    mood: "calm",
    sleepHours: 7,
    steps: 5000,
    socialScore: 60,
    note: "legacy-migration-marker"
  }]));
}, beforeRefresh.vaultId);
await page.reload({ waitUntil: "load" });
await page.waitForSelector("#spotlightGo");
const afterMigration = await page.evaluate(async (vaultId) => ({
  stateHasMarker: window.MindPulseDebug.getState().recs.some((item) => item.note.includes("legacy-migration-marker")),
  vaultHasMarker: (await window.MindPulseVaultStore.readVault(vaultId))?.records?.some((item) => item.note.includes("legacy-migration-marker")) === true,
  legacyKeys: Object.keys(localStorage).filter((key) => key.includes(":recs"))
}), beforeRefresh.vaultId);
assert(afterMigration.stateHasMarker && afterMigration.vaultHasMarker, "legacy localStorage records should migrate into the vault");
assert(afterMigration.legacyKeys.length === 0, "legacy localStorage records should be removed after migration");

await page.click('[data-tab="help"]');
await page.waitForSelector("#goSettings");
await page.click("#goSettings");
await page.waitForSelector("#clearLocalData");
let clearDialog = "";
page.once("dialog", async (dialog) => { clearDialog = dialog.message(); await dialog.accept(); });
await page.click("#clearLocalData");
await page.waitForFunction(() => document.querySelector(".toast")?.textContent?.includes("本地数据已重置"));
assert(clearDialog.includes("确定删除本地记录"), "clear should confirm before deleting the vault");
const afterDelete = await page.evaluate(async (vaultId) => ({
  vault: await window.MindPulseVaultStore.readVault(vaultId),
  localKeys: Object.keys(localStorage).filter((key) =>
    key.includes(":recs") || key.includes(":completed") || key.includes(":interventionStats") ||
    key.includes(":surveyHistory") || key.includes(":tasks") || key.includes("mindpulseRecs") || key.includes("mindpulseCompleted")
  )
}), beforeRefresh.vaultId);
assert(afterDelete.vault === null, "clear should delete the IndexedDB vault");
assert(afterDelete.localKeys.length === 0, "clear should remove legacy sensitive localStorage keys");

const isolated = await page.evaluate(async () => {
  await window.MindPulseVaultStore.writeVault("vault_test_a", { records: [{ note: "A" }] });
  await window.MindPulseVaultStore.writeVault("vault_test_b", { records: [{ note: "B" }] });
  const a = await window.MindPulseVaultStore.readVault("vault_test_a");
  const b = await window.MindPulseVaultStore.readVault("vault_test_b");
  await window.MindPulseVaultStore.deleteVault("vault_test_a");
  await window.MindPulseVaultStore.deleteVault("vault_test_b");
  return { a: a.records[0].note, b: b.records[0].note };
});
assert(isolated.a === "A" && isolated.b === "B", "two vaults should not read each other's records");

await browser.close();
if (errors.length) throw new Error(`Browser errors detected: ${errors.join(" | ")}`);
console.log("Storage smoke passed: vault persistence, localStorage boundary, deletion, and isolation.");
