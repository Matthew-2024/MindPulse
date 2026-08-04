import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const entry = readdirSync(resolve(".")).find((name) => name.includes("Web") && name.endsWith(".html"));
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
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "load" });
await page.waitForSelector("#spotlightGo");

const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
assert(!viewport.includes("maximum-scale") && !viewport.includes("user-scalable"), "viewport must allow browser zoom");
assert(await page.locator("#tabCheckin").getAttribute("aria-label") === "记录此刻", "center check-in button needs an accessible name");

await page.click("#tabCheckin");
await page.waitForSelector(".sheet");
await page.waitForTimeout(30);
assert(await page.locator(".sheet").getAttribute("role") === "dialog", "check-in sheet needs dialog semantics");
assert(await page.locator(".sheet").getAttribute("aria-modal") === "true", "check-in sheet must be modal");
assert((await page.locator(".sheet").getAttribute("aria-label"))?.length > 0, "check-in sheet needs a dialog label");
assert(await page.locator(".sheet").evaluate((dialog) => dialog.contains(document.activeElement)), "opening a dialog must move focus inside");

for (let index = 0; index < 8; index += 1) {
  await page.keyboard.press("Tab");
  assert(await page.locator(".sheet").evaluate((dialog) => dialog.contains(document.activeElement)), "Tab focus must remain inside an open dialog");
}
await page.keyboard.press("Escape");
await page.waitForSelector(".sheet", { state: "detached" });
await page.waitForTimeout(30);
assert(await page.evaluate(() => document.activeElement?.id) === "tabCheckin", "closing a dialog must restore trigger focus");

await page.click('[data-tab="workspace"]');
await page.waitForSelector("#taskAdd");
await page.click("#taskAdd");
await page.waitForSelector(".toast");
assert(await page.locator(".toast").getAttribute("role") === "status", "ordinary toast must announce as a status update");
const targetSizes = await page.locator(".task-check, .task-delete").evaluateAll((items) => items.map((item) => {
  const box = item.getBoundingClientRect();
  return { width: box.width, height: box.height };
}));
assert(targetSizes.every((box) => box.width >= 44 && box.height >= 44), "task controls need 44px touch targets");

for (const width of [320, 360, 375, 430, 768]) {
  await page.setViewportSize({ width, height: 932 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `viewport ${width}px must not overflow horizontally`);
}

const cdp = await page.context().newCDPSession(page);
await cdp.send("Emulation.setEmulatedOSTextScale", { scale: 2 });
await page.setViewportSize({ width: 320, height: 932 });
assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "200% text scale at 320px must not overflow horizontally");
await cdp.send("Emulation.setEmulatedOSTextScale", { scale: 1 });

await browser.close();
if (errors.length) throw new Error(`Browser errors detected: ${errors.join(" | ")}`);
console.log("Accessibility smoke passed: dialog semantics, keyboard focus, live region, touch targets, zoom metadata, and responsive width.");
