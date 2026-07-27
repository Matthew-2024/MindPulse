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
  return { active, result };
});
assert(before.result && before.result.records.length > 0, "local vault should contain records before deletion");

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

await browser.close();
console.log("React storage smoke passed: export, vault persistence, confirmation, and deletion boundary.");
