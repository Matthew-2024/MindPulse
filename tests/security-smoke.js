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

const payload = '</textarea><img src=x onerror="window.__mindpulseXss=1"><svg onload="window.__mindpulseXss=1"></svg><script>window.__mindpulseXss=1</script>';
await page.click("#tabCheckin");
await page.waitForSelector(".sheet");
await page.click('[data-em="sad"]');
await page.click("#checkNext");
await page.click('[data-check-field="ciSleep"][data-check-value="ok"]');
await page.click('[data-check-field="ciEnergy"][data-check-value="mid"]');
await page.click('[data-check-field="ciConnect"][data-check-value="ok"]');
await page.click("#checkNext2");
await page.click("#checkNext3");
await page.fill("#checkInput", payload);
await page.click("#checkSave");
await page.waitForSelector("#checkStartAction");
const checkinSecurity = await page.evaluate(() => ({
  xss: window.__mindpulseXss,
  injectedImage: Boolean(document.querySelector('img[src="x"]')),
  injectedHandler: Boolean(document.querySelector("[onerror],[onload]")),
  text: document.querySelector(".sheet")?.innerText || ""
}));
assert(checkinSecurity.xss === undefined, "check-in note should not execute script payload");
assert(!checkinSecurity.injectedImage && !checkinSecurity.injectedHandler, "check-in note should not create active HTML nodes");
assert(checkinSecurity.text.includes("</textarea><img src=x onerror=..."), "check-in note prefix should remain visible as text");
await page.click("#checkClose");

await page.click('[data-tab="workspace"]');
await page.waitForSelector("#taskInput");
await page.fill("#taskInput", payload);
await page.click("#taskAdd");
await page.waitForSelector(".task-title");
const taskSecurity = await page.evaluate(() => ({
  xss: window.__mindpulseXss,
  injectedImage: Boolean(document.querySelector('img[src="x"]')),
  texts: Array.from(document.querySelectorAll(".task-title")).map((node) => node.innerText)
}));
assert(taskSecurity.xss === undefined && !taskSecurity.injectedImage, "task title should not execute HTML");
assert(taskSecurity.texts.some((text) => text.includes("</textarea><img src=x")), "task title should remain visible as text");

await page.click('[data-tab="help"]');
await page.waitForSelector("#goSettings");
await page.click("#goSettings");
await page.waitForSelector("#openProfileLogin");
await page.click("#openProfileLogin");
await page.waitForSelector("#loginCreate");
await page.evaluate(() => localStorage.setItem("mindpulseSplashSeen", "1"));
await page.fill("#loginProfileName", payload);
await page.click("#loginCreate");
if (await page.locator(".splash").count()) {
  await page.waitForSelector(".splash", { state: "detached", timeout: 5000 });
}
await page.waitForSelector("#profileName");
const profileSecurity = await page.evaluate(() => ({
  xss: window.__mindpulseXss,
  injectedImage: Boolean(document.querySelector('img[src="x"]')),
  injectedHandler: Boolean(document.querySelector("[onerror],[onload]")),
  texts: Array.from(document.querySelectorAll(".setting-title")).map((node) => node.innerText)
}));
assert(profileSecurity.xss === undefined, "profile name should not execute HTML");
assert(!profileSecurity.injectedImage && !profileSecurity.injectedHandler, "profile name should not create active HTML nodes");
assert(profileSecurity.texts.some((text) => text.includes("</textarea><img")), "profile name should remain visible as text");

await page.click('[data-tab="home"]');
await page.waitForSelector("#spotlightGo");

await page.evaluate(() => window.MindPulseDebug.openAction("journal"));
await page.waitForSelector("#journalInput");
await page.fill("#journalInput", payload);
const journalInputSecurity = await page.evaluate(() => ({
  xss: window.__mindpulseXss,
  injectedImage: Boolean(document.querySelector('img[src="x"]')),
  injectedHandler: Boolean(document.querySelector("[onerror],[onload]")),
  textareaCount: document.querySelectorAll("#journalInput").length
}));
assert(journalInputSecurity.xss === undefined, "journal draft should not execute HTML");
assert(!journalInputSecurity.injectedImage && !journalInputSecurity.injectedHandler, "journal draft should stay inside the textarea");
assert(journalInputSecurity.textareaCount === 1, "journal draft should not break the textarea markup");
await page.click("#journalSave");
await page.waitForSelector("#journalAgain");
await page.click("#intvBack");
await page.waitForSelector("#spotlightGo");
await page.click('[data-tab="map"]');
await page.waitForSelector(".timeline-text");
assert((await page.locator(".timeline-text").allInnerTexts()).some((text) => text.includes("</textarea><img src=x")), "saved journal text should remain text in the timeline");

await page.click('[data-tab="home"]');
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
await page.click("#quickHelp");
await page.click('[data-agent-value="listen"]');
await page.fill("#agentInput", payload);
await page.click("#agentFinish");
await page.waitForSelector("#agentCopy");
const agentSecurity = await page.evaluate(() => ({
  xss: window.__mindpulseXss,
  injectedImage: Boolean(document.querySelector('img[src="x"]')),
  injectedHandler: Boolean(document.querySelector("[onerror],[onload]")),
  text: document.querySelector(".agent-overlay")?.innerText || ""
}));
assert(agentSecurity.xss === undefined, "help draft should not execute script payload");
assert(!agentSecurity.injectedImage && !agentSecurity.injectedHandler, "help draft should not create active HTML nodes");
assert(agentSecurity.text.includes(payload), "help draft should preserve input as text");

await browser.close();
if (errors.length) throw new Error(`Browser errors detected: ${errors.join(" | ")}`);
console.log("Security smoke passed: check-in, task, and help-draft input stayed text-only.");
