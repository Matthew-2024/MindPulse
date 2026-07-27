import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const entry = readdirSync(resolve(".")).find((name) => name.includes("Web原型") && !name.includes("备份") && name.endsWith(".html"));
assert(entry, "Web prototype HTML entry should exist");
const edgeCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || edgeCandidates.find(existsSync);
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-gpu"] });
const url = pathToFileURL(resolve(entry)).href + "?smoke=1";
const viewports = [
  { width: 393, height: 852, expectedAppWidth: 393 },
  { width: 375, height: 667, expectedAppWidth: 375 },
  { width: 430, height: 932, expectedAppWidth: 393 },
  { width: 1024, height: 768, expectedAppWidth: 393 }
];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("mindpulseSessionProfileReady", "1");
  });
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector("#spotlightGo");

  const homeMetrics = await page.evaluate(() => {
    const app = document.querySelector("#app").getBoundingClientRect();
    const primary = document.querySelector("#spotlightGo").getBoundingClientRect();
    const title = document.querySelector(".status-title");
    const nav = document.querySelector(".tb").getBoundingClientRect();
    return {
      appWidth: Math.round(app.width),
      appLeft: Math.round(app.left),
      bodyClientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.documentElement.scrollWidth,
      primaryHeight: primary.height,
      titleOverflow: title.scrollWidth > title.clientWidth + 1,
      navBottom: nav.bottom,
      navTop: nav.top
    };
  });
  assert(Math.abs(homeMetrics.appWidth - viewport.expectedAppWidth) <= 1, `${viewport.width} viewport should use ${viewport.expectedAppWidth}px app canvas, got ${homeMetrics.appWidth}`);
  assert(homeMetrics.bodyScrollWidth <= homeMetrics.bodyClientWidth, `${viewport.width} viewport should not scroll horizontally`);
  assert(homeMetrics.primaryHeight >= 44, `${viewport.width} primary action should be at least 44px high`);
  assert.equal(homeMetrics.titleOverflow, false, `${viewport.width} home title should not overflow`);
  assert(homeMetrics.navTop >= 0 && homeMetrics.navBottom <= viewport.height + 1, `${viewport.width} bottom navigation should stay in the viewport`);

  await page.click("#homeMemo");
  await page.click("#memoCreate");
  await page.waitForSelector("#memoTitle");
  const memoMetrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    editorWidth: document.querySelector(".memo-editor").getBoundingClientRect().width,
    appWidth: document.querySelector("#app").getBoundingClientRect().width,
    titleOverflow: document.querySelector("#memoTitle").scrollWidth > document.querySelector("#memoTitle").clientWidth + 1,
    iconButtons: Array.from(document.querySelectorAll(".memo-icon-btn")).map((button) => button.getBoundingClientRect().width)
  }));
  assert(memoMetrics.scrollWidth <= memoMetrics.clientWidth, `${viewport.width} memo editor should not scroll horizontally`);
  assert(memoMetrics.editorWidth <= memoMetrics.appWidth - 30, `${viewport.width} memo editor should fit the app canvas`);
  assert.equal(memoMetrics.titleOverflow, false, `${viewport.width} memo title should fit`);
  assert(memoMetrics.iconButtons.every((width) => width >= 32), `${viewport.width} memo tools should keep stable dimensions`);
  assert.deepEqual(errors, [], `${viewport.width} viewport should not emit page errors`);
  await page.close();
}

await browser.close();
console.log("Convergence visual smoke passed for 393/375/430/1024 viewports.");
