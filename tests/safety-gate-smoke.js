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
await page.click('[data-em="sad"]');
await page.click("#checkNext");
await page.click('[data-check-field="ciSleep"][data-check-value="low"]');
await page.click('[data-check-field="ciEnergy"][data-check-value="low"]');
await page.click('[data-check-field="ciConnect"][data-check-value="need"]');
await page.click("#checkNext2");
await page.click("#checkNext3");
await page.fill("#checkInput", "我很绝望");
await page.click("#checkSave");
await page.click("#checkStartAction");
await page.waitForSelector("#quickHelp");
assert((await page.locator("body").innerText()).includes("普通自助建议不会作为主路径"), "high-risk state should land on help page");

await page.click('[data-tab="home"]');
await page.waitForSelector("#quickHelp");
assert(await page.locator("#spotlightGo").count() === 0, "high-risk home trigger should remain on the help page");
assert(await page.locator("#openSurveyHome").count() === 0, "high-risk state must not expose the self-check action");
assert(await page.locator("[data-agent-go]").count() === 0, "high-risk state must not expose ordinary intervention actions");

for (const tab of ["home", "map", "workspace", "companion"]) {
  await page.click(`[data-tab="${tab}"]`);
  await page.waitForSelector("#quickHelp");
  assert(await page.locator(".intervention-overlay").count() === 0, `${tab} should not open an ordinary flow in high-risk state`);
}

await page.click("#tabCheckin");
await page.waitForSelector("#quickHelp");
assert(await page.locator(".sheet").count() === 0, "high-risk check-in trigger should stay on help");
assert(await page.locator("[data-tab='map'], [data-tab='workspace'], [data-tab='companion']").count() === 3, "all ordinary tab triggers remain visible but are guarded");
assert((await page.evaluate(() => window.MindPulseDebug)) === undefined, "production runtime must not expose debug controls");

await browser.close();
if (errors.length) throw new Error(`Browser errors detected: ${errors.join(" | ")}`);
console.log("Safety Gate smoke passed: all ordinary action routes stayed on help under high risk.");
