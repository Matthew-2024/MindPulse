import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const baseUrl = process.env.REACT_BASE_URL || "http://127.0.0.1:5180";
const outputDir = resolve("output", "playwright");
mkdirSync(outputDir, { recursive: true });

const edgeCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || edgeCandidates.find((candidate) => existsSync(candidate));
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-gpu"] });
const errors = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function checkPage(page, label) {
  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    bodyHeight: document.body.scrollHeight,
    navPosition: getComputedStyle(document.querySelector(".bottom-nav")).position,
    topbarPosition: getComputedStyle(document.querySelector(".topbar")).position
  }));
  assert(!layout.overflow, `${label} has horizontal overflow`);
  assert(layout.bodyHeight > 400, `${label} is unexpectedly blank`);
  return layout;
}

async function openContext(viewport, name) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${name}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${name}: ${message.text()}`);
  });
  return { context, page };
}

{
  const { context, page } = await openContext({ width: 430, height: 932 }, "accessibility-430");
  const externalRequests = [];
  page.on("request", (request) => {
    const url = request.url();
    if (!url.startsWith(baseUrl) && !url.startsWith("data:") && !url.startsWith("blob:")) externalRequests.push(url);
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.locator(".button").first().focus();
  const accessibility = await page.evaluate(() => {
    const active = document.activeElement;
    const focusStyle = active ? getComputedStyle(active) : null;
    const animatedButton = document.querySelector(".button");
    const reducedStyle = animatedButton ? getComputedStyle(animatedButton) : null;
    return {
      focused: Boolean(active && focusStyle && focusStyle.outlineStyle !== "none" && parseFloat(focusStyle.outlineWidth) >= 2),
      reducedMotion: Boolean(reducedStyle && (parseFloat(reducedStyle.transitionDuration) <= 0.001 || parseFloat(reducedStyle.animationDuration) <= 0.001))
    };
  });
  assert(accessibility.focused, "keyboard focus should remain visible on mobile");
  assert(accessibility.reducedMotion, "reduced motion should shorten transitions and animations");
  assert(externalRequests.length === 0, `offline demo should not request external resources: ${externalRequests.join(", ")}`);
  await context.close();
}

for (const viewport of [{ width: 375, height: 667 }, { width: 430, height: 932 }, { width: 1024, height: 768 }]) {
  const name = `home-${viewport.width}`;
  const { context, page } = await openContext(viewport, name);
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.waitForSelector(".snapshot-panel");
  const body = await page.locator("body").innerText();
  assert(body.includes("我的节奏"), `${name} missing personal rhythm summary`);
  assert(body.includes("这次状态分") && body.includes("不是健康分数"), `${name} missing score boundary`);
  await checkPage(page, name);
  await page.screenshot({ path: resolve(outputDir, `react-v2-home-${viewport.width}.png`), fullPage: true });
  await context.close();
}

{
  const { context, page } = await openContext({ width: 430, height: 932 }, "rules-430");
  await page.goto(`${baseUrl}/rules`, { waitUntil: "networkidle" });
  await page.waitForSelector(".rule-lab-page");
  assert((await page.locator("body").innerText()).includes("示例场景"), "rules-430 missing synthetic scenario boundary");
  await page.locator('[data-fixture-id="LAB-01"]').click();
  assert((await page.locator(".fixture-detail").innerText()).includes("DATA_INSUFFICIENT"), "rules-430 missing data-insufficient reason code");
  await page.locator('[data-fixture-id="LAB-03"]').click();
  assert((await page.locator(".fixture-detail").innerText()).includes("TEXT_CRISIS_SIGNAL"), "rules-430 missing crisis reason code");
  await checkPage(page, "rules-430");
  await page.screenshot({ path: resolve(outputDir, "react-v2-rules-430.png"), fullPage: true });
  await context.close();
}

{
  const { context, page } = await openContext({ width: 430, height: 932 }, "insight-430");
  await page.goto(`${baseUrl}/insight`, { waitUntil: "networkidle" });
  await page.waitForSelector(".insight-overview");
  await page.waitForSelector(".trace-panel");
  await checkPage(page, "insight-430");
  await page.screenshot({ path: resolve(outputDir, "react-v2-insight-430.png"), fullPage: true });
  await context.close();
}

{
  const { context, page } = await openContext({ width: 430, height: 932 }, "help-430");
  await page.goto(`${baseUrl}/checkin`, { waitUntil: "networkidle" });
  await page.locator(".note-input").fill("我想从这个世界上消失");
  await page.getByRole("button", { name: "保存并查看解释" }).click();
  await page.waitForURL(/\/help$/);
  await page.waitForSelector(".safety-gate");
  const body = await page.locator("body").innerText();
  assert(body.includes("暂不建议") && body.includes("生成第一句话"), "help-430 missing safety gate evidence");
  assert(!body.includes("现在只做这一件事") && !body.includes("做一轮低负担呼吸"), "help-430 exposed ordinary intervention copy");
  await checkPage(page, "help-430");
  await page.screenshot({ path: resolve(outputDir, "react-v2-help-430.png"), fullPage: true });
  await context.close();
}

await browser.close();
if (errors.length) throw new Error(`React visual browser errors: ${errors.join(" | ")}`);
console.log(`React visual smoke passed: screenshots written to ${outputDir}`);
