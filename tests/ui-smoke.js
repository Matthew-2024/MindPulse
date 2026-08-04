import { existsSync, readFileSync, readdirSync } from "node:fs";
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

await page.goto(pathToFileURL(resolve(entry)).href, { waitUntil: "load" });
await page.evaluate(() => localStorage.removeItem("mindpulseSessionProfileReady"));
await page.reload({ waitUntil: "load" });
await page.waitForSelector("#loginEnter");
let body = await page.locator("body").innerText();
assert(body.includes("匿名档案"), "login should present anonymous profile entry");
assert(body.includes("不需要手机号"), "login should explain no phone/student id");
await page.click("#loginEnter");
await page.waitForSelector("#spotlightGo");

body = await page.locator("body").innerText();
assert(body.includes("本次记录指数"), "home should keep the score as a secondary record index");
assert(body.includes("当前安全策略") && body.includes("Safety Gate"), "home should show the current safety strategy and gate");
assert(!(await page.locator("#homeTrendLink").count()), "home should not show the flow bridge card");
assert(await page.locator("#spotlightGo").isVisible(), "home should expose primary action");

await page.click('[data-tab="map"]');
await page.waitForSelector("#trendToCompanion");
body = await page.locator("body").innerText();
assert(body.includes("今日记录") && body.includes("周报"), "trend should show daily and weekly reports");
assert(await page.locator("#todayReport").isVisible(), "trend should render today's report card");
assert(await page.locator("#weeklyReport").isVisible(), "trend should render weekly report card");
assert(await page.locator("#trendHomeLink").isVisible(), "trend should expose home linkage");
await page.click("#trendHomeLink");
await page.waitForSelector("#spotlightGo");

await page.click("#homeFlip");
await page.waitForSelector("#pulseAgent");
body = await page.locator("body").innerText();
assert(body.includes("判断证据"), "home back side should show auditable evidence");
await page.click("#pulseAgent");
await page.waitForSelector("#detailBack");
body = await page.locator("body").innerText();
assert(body.includes("分数拆解"), "detail overlay should show score breakdown");
assert(body.includes("RISE 方法"), "detail overlay should explain RISE");
for (const auditField of ["决策编号", "Reason Code", "允许动作", "阻断动作", "策略版本"]) {
  assert(body.includes(auditField), `detail overlay should show ${auditField}`);
}
await page.click("#detailBack");
await page.click("#homeBack");
await page.waitForSelector("#spotlightGo");
assert(await page.locator(".survey-strip").isVisible(), "home should show the survey entry strip");
await page.click("#openSurveyHome");
await page.waitForSelector(".survey-overlay");
assert(await page.locator('[data-survey-start="phq"]').isVisible(), "survey overlay should first show survey choices");
assert(await page.locator("[data-survey-answer]").count() === 0, "survey choices should not render questions yet");
await page.click('[data-survey-start="phq"]');
await page.waitForSelector("[data-survey-answer]");
assert(await page.locator("[data-survey-answer]").count() === 4, "survey should render one four-option question at a time");
for (let i = 0; i < 9; i += 1) {
  await page.click(`[data-survey-answer="${i}"][data-survey-value="1"]`);
  if (i < 8) {
    await page.waitForSelector("#surveyNext:not([disabled])");
    await page.click("#surveyNext");
    await page.waitForSelector(`[data-survey-answer="${i + 1}"]`);
  }
}
await page.waitForSelector("#surveyNext:not([disabled])");
await page.click("#surveyNext");
await page.waitForSelector("#surveyNextAction");
assert(await page.locator(".survey-result-title").isVisible(), "survey should return a rule-agent conclusion");
await page.click("#surveyBack");
await page.waitForSelector("#spotlightGo");

await page.click('[data-tab="workspace"]');
await page.waitForSelector("#taskInput");
assert(await page.locator(".comfort-card").isVisible(), "workspace should show comfort copy for the active task");
const taskCountBefore = await page.locator(".task-item").count();
await page.fill("#taskInput", "review outline");
await page.click("#taskAdd");
await page.waitForTimeout(120);
assert(await page.locator(".task-item").count() === taskCountBefore + 1, "workspace should add a new task");
await page.click("#activeTaskToggle");
await page.waitForTimeout(120);
assert(await page.locator(".task-item.done").count() >= 1, "workspace should mark the active task done");
await page.locator(".task-delete").first().click();
await page.waitForTimeout(120);
assert(await page.locator(".task-item").count() === taskCountBefore, "workspace should delete the selected task");
await page.click('[data-tab="home"]');

await page.click("#tabCheckin");
await page.waitForSelector(".sheet");
await page.click('[data-em="anxious"]');
await page.click("#checkNext");
await page.click('[data-check-field="ciSleep"][data-check-value="ok"]');
await page.click('[data-check-field="ciEnergy"][data-check-value="mid"]');
await page.click('[data-check-field="ciConnect"][data-check-value="ok"]');
await page.click("#checkNext2");
await page.click("#checkNext3");
await page.click("#checkSave");
await page.click("#checkClose");
await page.click('[data-tab="companion"]');
await page.waitForSelector("#currentStep");
await page.click("#currentStep");
await page.waitForSelector("#breatheRing");
assert(await page.locator("[data-breathe-phase]").count() === 4, "breathing page should show four phase segments");
const breatheColumns = await page.locator(".breathe-legend").evaluate((el) =>
  getComputedStyle(el).gridTemplateColumns.split(" ").length
);
assert(breatheColumns === 2, "breathing phases should be arranged in two columns");
body = await page.locator("body").innerText();
assert(body.includes("4-4-4-4") && body.includes("吐气"), "breathing page should use box breathing copy");
await page.click("#breatheRing");
await page.waitForTimeout(120);
assert((await page.locator("#breathePhase").innerText()).includes("吸气"), "clicking the breathing ring should start the session");
assert((await page.locator("#breatheToggle").innerText()).includes("结束这轮"), "ring click should sync with the main breathing button");
await page.click("#breatheRing");
await page.waitForTimeout(120);
assert((await page.locator("#breatheToggle").innerText()).includes("开始呼吸"), "clicking the breathing ring again should stop the session");
await page.click("#intvBack");
await page.click('[data-tab="home"]');
await page.waitForSelector("#spotlightGo");

await page.click('[data-tab="map"]');
await page.waitForSelector("#trendToCompanion");
await page.click("#trendToCompanion");
body = await page.locator("body").innerText();
assert(body.includes("陪伴路线"), "trend should hand off to companion page");
assert(await page.locator("#companionToTrend").isVisible(), "companion should expose trend feedback linkage");
assert(await page.locator("#companionNeedHelp").isVisible(), "companion should expose help linkage");
const companionSteps = [];
for (let i = 0; i < 4; i += 1) {
  companionSteps.push(await page.locator("#companionStepCard .quiet-title").innerText());
  if (await page.locator("#skipStep").isDisabled()) break;
  await page.click("#skipStep");
  await page.waitForTimeout(80);
}
assert(await page.locator("#skipStep").isDisabled(), "last companion step should stop the skip flow");
assert((await page.locator("#skipStep").innerText()).includes("已到最后一步"), "last companion step should say it has ended");
assert(new Set(companionSteps).size === companionSteps.length, "companion skip should not loop back to a previous step");
const finalCompanionStep = await page.locator("#companionStepCard .quiet-title").innerText();
await page.locator("#skipStep").evaluate((button) => button.click());
assert(await page.locator("#companionStepCard .quiet-title").innerText() === finalCompanionStep, "disabled skip should not change the current step");
assert((await page.locator("#companionStepCard .quiet-copy").innerText()).includes("完成后会回到第 1 步"), "last companion step should explain the completion loop");
await page.click('[data-tab="home"]');

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

const feedback = await page.locator(".sheet").innerText();
assert(feedback.includes("高风险"), "high-risk input should trigger high-risk feedback");
assert(feedback.includes("打开求助入口"), "high-risk feedback should route to help");
await page.click("#checkStartAction");
await page.waitForTimeout(200);
body = await page.locator("body").innerText();
assert(body.includes("求助") && body.includes("热线"), "high-risk action should open help page");

await page.click("#helpAgent");
await page.waitForSelector("[data-help-style]");
body = await page.locator("body").innerText();
assert(body.includes("换个说法"), "rewrite entry should open style selection first");
assert(!body.includes("复制草稿"), "rewrite style selection should not show copy action yet");
await page.click('[data-help-style="short"]');
await page.waitForSelector("#agentCopy");
body = await page.locator("body").innerText();
assert(body.includes("话术草稿"), "style selection should generate a draft");
assert(body.includes("复制草稿"), "draft screen should expose copy action after style selection");
await page.click("#agentRewrite");
await page.waitForSelector("[data-help-style]");
body = await page.locator("body").innerText();
assert(!body.includes("复制草稿"), "rewrite again should return to style selection");
await page.click("#agentBack");

await page.click("#goSettings");
await page.waitForSelector("#quickHelp");
assert(await page.locator("#goRuleLab").count() === 0, "high-risk state must not leave the help path for settings or rule tools");

await browser.close();

if (errors.length) {
  throw new Error(`Browser errors detected: ${errors.join(" | ")}`);
}

console.log("UI smoke passed: home, detail, manual input, and high-risk help.");
