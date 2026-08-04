import assert from "node:assert/strict";
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
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 430, height: 932 } });
const page = await context.newPage();
const outbound = [];
page.on("request", (request) => {
  if (!request.url().startsWith(baseUrl) && !request.url().startsWith("data:")) outbound.push(request.url());
});

await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  localStorage.clear();
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase("mindpulse-local-vault");
    request.onsuccess = request.onerror = request.onblocked = () => resolve();
  });
});
await page.reload({ waitUntil: "networkidle" });
await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await page.waitForSelector(".snapshot-panel");
await page.goto(`${baseUrl}/checkin`, { waitUntil: "networkidle" });
await page.locator(".note-input").fill("我很绝望，想从这个世界上消失");
await page.getByRole("button", { name: "保存并查看解释" }).click();
await page.waitForURL(/\/help$/);
await page.waitForSelector('[data-testid="privacy-receipt"]');

const initialDraft = await page.locator("#help-draft").inputValue();
assert(!initialDraft.includes("原始备注"));
assert((await page.locator('[data-testid="privacy-receipt"]').innerText()).includes("不会包含"));
assert((await page.locator('[data-testid="privacy-receipt"]').innerText()).includes("不会自动上报"));

await page.locator("#help-draft").fill("我想用自己的话说这件事");
await page.locator("#help-draft").blur();
await page.getByRole("button", { name: "复制草稿" }).click();
await page.waitForFunction(() => document.querySelector(".composer-footer button")?.textContent?.includes("已复制"));
assert.equal(outbound.length, 0, "copying a help draft must not send an external request");

const stored = await page.evaluate(async () => {
  const vaultId = localStorage.getItem("mindpulseReactVaultId");
  return await new Promise((resolve) => {
    const request = indexedDB.open("mindpulse-local-vault", 2);
    request.onsuccess = () => {
      const db = request.result;
      const read = db.transaction("vault_records", "readonly").objectStore("vault_records").get(vaultId);
      read.onsuccess = () => { db.close(); resolve(read.result || null); };
      read.onerror = () => { db.close(); resolve(null); };
    };
    request.onerror = () => resolve(null);
  });
});
const events = (stored?.tasks || []).filter((event) => event.type === "help-draft");
assert(events.length >= 3, "generation, edit, and copy should leave structured receipt events");
const copied = events.find((event) => event.copied === true);
assert(copied, "copy should create a receipt event");
assert(copied.decisionId && copied.decisionId.startsWith("decision-"));
assert(copied.resourcePackId === "mindpulse-demo-campus-pack");
assert(copied.resourceId === "offline-support-fallback");
assert(copied.resourceVersion === "2026-08-04.1");
assert(copied.action === "copy");
assert(Array.isArray(copied.includedFields) && copied.includedFields.includes("user-edited-draft"));
assert(Array.isArray(copied.excludedFields) && copied.excludedFields.includes("original-note"));
assert(Array.isArray(copied.sourceTypes));
assert.equal(copied.userEdited, true);
assert(copied.copiedAt);
assert(!Object.prototype.hasOwnProperty.call(copied, "draft"), "receipt must not persist edited draft text");

await page.getByRole("button", { name: "我已联系支持，重新评估" }).click();
await page.waitForFunction(() => window.location.pathname === "/checkin");
await page.locator(".mood-option").filter({ hasText: "平稳" }).click();
await page.getByRole("button", { name: "保存并查看解释" }).click();
await page.waitForFunction(() => window.location.pathname === "/insight");

await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "导出 JSON" }).click();
const download = await downloadPromise;
const path = await download.path();
assert(path);
const fs = await import("node:fs/promises");
const exported = JSON.parse(await fs.readFile(path, "utf8"));
assert.equal(exported.version, "mindpulse-react-v2");
assert(Array.isArray(exported.privacyReceiptEvents));
assert(Array.isArray(exported.bottles));
assert(Array.isArray(exported.bottleReplies));
assert(exported.bottleVisibility && typeof exported.bottleVisibility.scope === "string");
assert(Array.isArray(exported.safetyEvents));
assert(exported.safetyEvents.some((event) => event.kind === "released"));
assert.equal(exported.dataMode, "real-trial");

await context.close();
await browser.close();
console.log("Warm Handoff smoke passed: minimum disclosure, structured receipt, no outbound send, and export boundaries.");
