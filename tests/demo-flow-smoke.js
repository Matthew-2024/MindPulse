import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const entry = readdirSync(resolve(".")).find((name) => name.includes("Web原型") && !name.includes("备份") && name.endsWith(".html"));
if (!entry) {
  throw new Error("Web prototype HTML entry was not found.");
}

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

const page = await browser.newPage({ viewport: { width: 393, height: 852 }, acceptDownloads: true });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function pageText() {
  return page.locator("body").innerText();
}

await page.goto(pathToFileURL(resolve(entry)).href, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "load" });

await page.waitForSelector("#loginEnter");
let body = await pageText();
assert(body.includes("匿名档案") && body.includes("不需要手机号"), "demo should start with anonymous profile and data minimization");
await page.click("#loginEnter");
await page.waitForSelector("#spotlightGo");

body = await pageText();
assert(body.includes("本次记录指数"), "demo should keep the score as a secondary record index");
assert(body.includes("当前安全策略") && body.includes("Safety Gate"), "demo should explain the safety strategy and gate on home");

await page.click("#homeFlip");
await page.waitForSelector("#pulseAgent");
body = await pageText();
assert(body.includes("判断证据"), "demo should show auditable home evidence");
await page.click("#pulseAgent");
await page.waitForSelector("#detailBack");
body = await pageText();
assert(body.includes("分数拆解") && body.includes("RISE 方法"), "demo should show score breakdown and RISE explanation");
await page.click("#detailBack");
await page.click("#homeBack");
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
await page.fill("#checkInput", "最近学习压力有点大，但我想先缓一缓");
await page.click("#checkSave");
await page.waitForSelector("#checkClose");
await page.click("#checkClose");
await page.click('[data-tab="companion"]');
await page.waitForSelector("#currentStep");
await page.click("#currentStep");
await page.waitForSelector("#breatheRing");
body = await pageText();
assert(body.includes("4-4-4-4") && body.includes("不需要立刻改变状态"), "demo should show a low-burden intervention without cure promises");
await page.click("#breatheRing");
await page.waitForTimeout(120);
assert((await page.locator("#breatheToggle").innerText()).includes("结束这轮"), "demo should be able to start the breathing interaction");
await page.click("#intvBack");
await page.waitForSelector("#currentStep");

await page.click('[data-tab="map"]');
await page.waitForSelector("#todayReport");
body = await pageText();
assert(body.includes("今日记录") && body.includes("周报"), "demo should show daily and weekly report sections");
assert(body.includes("即时"), "demo should show instant records in the timeline");
await page.click('[data-tab="home"]');
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
body = await page.locator(".sheet").innerText();
assert(body.includes("高风险") && body.includes("打开求助入口"), "demo high-risk check-in should route to help");
await page.click("#checkStartAction");
await page.waitForTimeout(200);
body = await pageText();
assert(body.includes("热线") && body.includes("普通自助建议不会作为主路径"), "demo help page should prioritize help over ordinary self-help");

await page.click("#helpAgent");
await page.waitForSelector("[data-help-style]");
await page.click('[data-help-style="short"]');
await page.waitForSelector("#agentCopy");
body = await pageText();
assert(body.includes("话术草稿") && body.includes("很需要支持"), "demo help draft should use supportive wording");
assert(!body.includes("状态比较危险") && !body.includes("不太安全"), "demo help draft should avoid panic-amplifying wording");
await page.click("#agentBack");
await page.waitForSelector("#quickHelp");
await page.click("#goSettings");
await page.waitForSelector("#quickHelp");
assert((await pageText()).includes("普通自助建议不会作为主路径"), "high-risk state must block the settings route and preserve help");

await browser.close();

if (errors.length) {
  throw new Error(`Browser errors detected: ${errors.join(" | ")}`);
}

console.log("Demo flow smoke passed: score, explanation, intervention, high-risk help, and supportive draft.");
