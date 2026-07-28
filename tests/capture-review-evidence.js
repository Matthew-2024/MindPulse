import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const entry = readdirSync(resolve(".")).find((name) => name.includes("Web原型") && !name.includes("备份") && name.endsWith(".html"));
if (!entry) {
  throw new Error("Web prototype HTML entry was not found.");
}

const evidenceDir = resolve("docs", "review-evidence");
mkdirSync(evidenceDir, { recursive: true });

const edgeCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  edgeCandidates.find((candidate) => existsSync(candidate));

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-gpu", "--disable-features=msEdgeImportBrowserDataFlow"]
});

const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

async function screenshot(name) {
  const path = resolve(evidenceDir, name);
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function assertText(text, message) {
  const body = await page.locator("body").innerText();
  if (!body.includes(text)) throw new Error(message || `Expected page text: ${text}`);
}

await page.goto(pathToFileURL(resolve(entry)).href, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "load" });

await page.waitForSelector("#loginEnter");
await screenshot("01-anonymous-profile.png");
await assertText("不需要手机号", "anonymous profile should state no phone/student id");
await page.click("#loginEnter");
await page.waitForSelector("#spotlightGo");

await screenshot("02-home-status.png");
await page.click("#homeFlip");
await page.waitForSelector("#pulseAgent");
await assertText("判断依据", "home back should show evidence");
await screenshot("03-home-evidence.png");

await page.click("#pulseAgent");
await page.waitForSelector("#detailBack");
await assertText("分数拆解", "detail should show score breakdown");
await assertText("RISE 方法", "detail should explain RISE");
await screenshot("04-rise-detail.png");
await page.click("#detailBack");
await page.click("#homeBack");
await page.waitForSelector("#spotlightGo");

await page.click("#tabCheckin");
await page.waitForSelector(".sheet");
await page.click('[data-em="sad"]');
await page.click("#checkNext");
await page.click('[data-check-field="ciSleep"][data-check-value="low"]');
await page.click('[data-check-field="ciEnergy"][data-check-value="low"]');
await page.click('[data-check-field="ciConnect"][data-check-value="need"]');
await page.click("#checkNext2");
await page.fill("#realSleep", "4.4");
await page.fill("#realSteps", "1400");
await page.locator("#realSocial").evaluate((input) => {
  input.value = "9";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.click("#checkNext3");
await page.fill("#checkInput", "我很绝望，想从这个世界上消失");
await page.click("#checkSave");
await page.waitForSelector("#checkStartAction");
await assertText("高风险", "high-risk feedback should show high-risk level");
await assertText("打开求助入口", "high-risk feedback should route to help");
await screenshot("05-high-risk-feedback.png");

await page.click("#checkStartAction");
await page.waitForTimeout(200);
await assertText("求助", "high-risk action should open help page");
await assertText("热线", "help page should include hotline");
await screenshot("06-help-page.png");

await page.click("#goSettings");
await page.waitForSelector("#goRuleLab");
await screenshot("07-settings-evidence-board.png");
await page.click("#goRuleLab");
await assertText("自动化规则测试：20 / 20", "rule lab should show 20 / 20 automated tests");
await assertText("P01", "rule lab should show personalization cases");
await screenshot("08-rule-lab-20of20.png");

await browser.close();

if (errors.length) {
  throw new Error(`Browser errors detected: ${errors.join(" | ")}`);
}

console.log(`Review evidence screenshots written to ${evidenceDir}`);
