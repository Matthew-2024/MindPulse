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
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || edgeCandidates.find(existsSync);
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
await page.evaluate(() => localStorage.clear());
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
await page.waitForSelector("#checkClose");
await page.click("#checkClose");

const beforeRefresh = await page.evaluate(() => {
  const activeId = JSON.parse(localStorage.getItem("mindpulseActiveProfile"));
  const records = JSON.parse(localStorage.getItem(`mindpulse:${activeId}:recs`) || "[]");
  return { activeId, hasMarker: records.some((item) => item.note.includes("storage-marker")) };
});
assert(beforeRefresh.activeId && beforeRefresh.hasMarker, "a saved note should be persisted under the active anonymous profile");

await page.reload({ waitUntil: "load" });
await page.waitForSelector("#spotlightGo");
await page.click('[data-tab="map"]');
await page.waitForSelector("#todayReport");
assert((await page.locator("body").innerText()).includes("storage-marker"), "the saved note should be restored after refresh");

await page.click('[data-tab="help"]');
await page.waitForSelector("#goSettings");
await page.click("#goSettings");
await page.waitForSelector("#clearLocalData");
let clearDialog = "";
page.once("dialog", async (dialog) => { clearDialog = dialog.message(); await dialog.accept(); });
await page.click("#clearLocalData");
await page.waitForFunction(() => document.querySelector(".toast")?.textContent?.includes("本地数据已重置"));
assert(clearDialog.includes("确定删除本地记录"), "clear should request confirmation");

const afterDelete = await page.evaluate((activeId) => {
  const records = JSON.parse(localStorage.getItem(`mindpulse:${activeId}:recs`) || "[]");
  return records.some((item) => String(item.note || "").includes("storage-marker"));
}, beforeRefresh.activeId);
assert(!afterDelete, "clearing data should remove persisted note text");
assert((await page.evaluate(() => window.MindPulseDebug)) === undefined, "storage flow must not require a production debug API");

await browser.close();
if (errors.length) throw new Error(`Browser errors detected: ${errors.join(" | ")}`);
console.log("Storage smoke passed: UI persistence, refresh restoration, and confirmed clearing.");
