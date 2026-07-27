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
await page.waitForSelector("#spotlightGo");
assert(await page.locator("#openSurveyHome").count() === 0, "high-risk home should hide the self-check entry");
await page.evaluate(() => window.MindPulseDebug.openSurvey("phq"));
await page.waitForSelector("#quickHelp");
assert((await page.locator("body").innerText()).includes("热线"), "direct survey opening should redirect high-risk state to help");

for (const action of ["breathe", "focus", "walk", "journal", "sleep", "friend"]) {
  await page.evaluate((id) => window.MindPulseDebug.openAction(id), action);
  await page.waitForSelector("#quickHelp");
  assert(await page.locator(".intervention-overlay").count() === 0, `${action} should not open in high-risk state`);
  assert((await page.locator("body").innerText()).includes("热线"), `${action} should redirect to help`);
}

await page.click('[data-tab="companion"]');
await page.waitForSelector("#quickHelp");
assert((await page.locator("body").innerText()).includes("求助"), "high-risk companion tab should stay on help");

await page.evaluate(() => window.MindPulseDebug.openAgent("home"));
await page.waitForSelector("#quickHelp");
assert(await page.locator(".intervention-overlay").count() === 0, "home agent should not open ordinary intervention in high-risk state");

await page.evaluate(() => window.MindPulseDebug.openAgent("companion"));
await page.waitForSelector("#quickHelp");
assert(await page.locator(".intervention-overlay").count() === 0, "companion agent should not open ordinary intervention in high-risk state");

await browser.close();
if (errors.length) throw new Error(`Browser errors detected: ${errors.join(" | ")}`);
console.log("Safety Gate smoke passed: all ordinary action routes stayed on help under high risk.");
