import { existsSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const baseUrl = process.env.REACT_BASE_URL || "http://127.0.0.1:5180";
const edgeCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || edgeCandidates.find((candidate) => existsSync(candidate));
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 430, height: 932 } });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
await page.waitForSelector(".settings-page");
await page.evaluate(() => {
  localStorage.setItem("mindpulse:continuityManifest", JSON.stringify({
    schemaVersion: 1,
    vaultLocator: "sync_local-delete-fixture",
    deviceId: "device_local-delete-fixture",
    revision: 0,
    enabledAt: "2026-08-04T00:00:00.000Z",
    updatedAt: "2026-08-04T00:00:00.000Z",
    wrapperKinds: ["recovery-code"]
  }));
});
const continuityBoundary = page.locator('[data-testid="continuity-boundary"]');
assert(await continuityBoundary.getAttribute("data-continuity-mode") === "off", "encrypted continuity must stay opt-in and disabled without a reviewed transport");
assert((await continuityBoundary.innerText()).includes("不会自动上传"), "settings must disclose that continuity does not upload records automatically");
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "导出 JSON" }).click();
const download = await downloadPromise;
assert(download.suggestedFilename() === "mindpulse-records.json", "export should use the JSON filename");
const exportedPath = await download.path();
assert(exportedPath, "export should produce a browser download");

const before = await page.evaluate(async () => {
  const active = localStorage.getItem("mindpulseReactVaultId") || null;
  const result = await new Promise((resolve) => {
    const request = indexedDB.open("mindpulse-local-vault", 2);
    request.onsuccess = () => {
      const db = request.result;
      const read = db.transaction("vault_records", "readonly").objectStore("vault_records").get(active);
      read.onsuccess = () => { db.close(); resolve(read.result || null); };
      read.onerror = () => { db.close(); resolve(null); };
    };
    request.onerror = () => resolve(null);
  });
  return { active, result, resourcePack: localStorage.getItem("mindpulse:resourcePack"), continuityManifest: localStorage.getItem("mindpulse:continuityManifest") };
});
assert(before.result && before.result.records.length > 0, "local vault should contain records before deletion");
assert(before.resourcePack, "loading the app should hydrate the local resource-pack cache");
assert(before.continuityManifest, "deletion test fixture should contain only continuity metadata outside the vault");

let confirmationSeen = false;
page.once("dialog", async (dialog) => {
  confirmationSeen = dialog.message().includes("确定删除本机记录");
  await dialog.accept();
});
await page.getByRole("button", { name: "删除本地记录" }).click();
await page.waitForFunction(() => document.body.innerText.includes("还没有记录"));
assert(confirmationSeen, "deleting records should require confirmation");
const after = await page.evaluate(async (vaultId) => {
  const result = await new Promise((resolve) => {
    const request = indexedDB.open("mindpulse-local-vault", 2);
    request.onsuccess = () => {
      const db = request.result;
      const read = db.transaction("vault_records", "readonly").objectStore("vault_records").get(vaultId);
      read.onsuccess = () => { db.close(); resolve(read.result || null); };
      read.onerror = () => { db.close(); resolve(null); };
    };
    request.onerror = () => resolve(null);
  });
  return { result, keys: Object.keys(localStorage) };
}, before.active);
assert(after.result === null, "delete should remove the current IndexedDB vault");
assert(after.keys.every((key) => !key.includes(":recs") && !key.includes(":interventionEvents")), "localStorage should not contain psychological records");
assert(!after.keys.includes("mindpulse:resourcePack"), "delete should remove the local resource-pack cache");
assert(!after.keys.includes("mindpulse:continuityManifest"), "delete should remove continuity manifest metadata");

await browser.close();
console.log("React storage smoke passed: export, vault persistence, confirmation, and deletion boundary.");
