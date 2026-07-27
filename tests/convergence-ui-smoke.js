import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-gpu", "--disable-features=msEdgeImportBrowserDataFlow"]
});
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, acceptDownloads: true });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

const url = pathToFileURL(resolve(entry)).href + "?smoke=1";
await page.goto(url, { waitUntil: "load" });
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem("mindpulseSessionProfileReady", "1");
});
await page.reload({ waitUntil: "load" });
await page.waitForSelector("#spotlightGo");

let body = await page.locator("body").innerText();
for (const copy of ["个人节奏偏移", "数据完整度", "当前安全策略", "当前策略允许的下一步"]) {
  assert(body.includes(copy), `home should show ${copy}`);
}
assert(await page.locator("#homeMemo").isVisible(), "home should expose memo entry");
assert(await page.locator("#homeSchedule").isVisible(), "home should expose schedule entry");

await page.click("#homeMemo");
await page.waitForSelector("#memoCreate");
assert((await page.locator(".nb h1").innerText()).includes("备忘录"));
await page.click("#memoCreate");
await page.waitForSelector("#memoTitle");
await page.fill("#memoTitle", "国赛准备");
await page.fill("[data-memo-item-input]", "检查比赛材料");
await page.locator("[data-memo-insert-after]").first().click();
await page.locator("[data-memo-item-input]").nth(1).fill("完善答辩稿");
await page.waitForTimeout(80);
assert.deepEqual(await page.locator("[data-memo-number]").allInnerTexts(), ["1", "2"]);
await page.locator("[data-memo-delete]").first().click();
await page.waitForTimeout(80);
assert.deepEqual(await page.locator("[data-memo-number]").allInnerTexts(), ["1"]);
await page.click("#memoBack");
await page.waitForSelector("#memoSearch");
await page.fill("#memoSearch", "竞赛");
await page.waitForTimeout(80);
assert((await page.locator("[data-memo-card]").innerText()).includes("国赛准备"));
assert((await page.locator("[data-memo-match]").innerText()).includes("联想"));
await page.click("#memoListBack");
await page.waitForSelector("#homeSchedule");

await page.click("#homeSchedule");
await page.waitForSelector("#scheduleTitle");
const dates = await page.evaluate(() => {
  const format = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const eighth = new Date();
  eighth.setDate(eighth.getDate() + 7);
  return { tomorrow: format(tomorrow), eighth: format(eighth) };
});
await page.fill("#scheduleTitle", "明天提交摘要");
await page.fill("#scheduleDate", dates.tomorrow);
await page.click("#scheduleAdd");
await page.fill("#scheduleTitle", "第八天提交材料");
await page.fill("#scheduleDate", dates.eighth);
await page.click("#scheduleAdd");
await page.click('[data-schedule-range="8"]');
await page.waitForTimeout(80);
assert.deepEqual(await page.locator("#scheduleRangeResults [data-schedule-title]").allInnerTexts(), ["明天提交摘要", "第八天提交材料"]);
for (const view of ["month", "year", "week"]) {
  await page.click(`[data-schedule-view="${view}"]`);
  assert((await page.locator(`[data-schedule-view="${view}"]`).getAttribute("class")).includes("active"));
}
await page.click("#scheduleBack");
await page.waitForSelector("#homeMemo");

await page.click('[data-tab="help"]');
await page.waitForSelector("#openBottleSea");
await page.click("#openBottleSea");
await page.waitForSelector("#bottleContent");
body = await page.locator("body").innerText();
assert(body.includes("本机演示海域"));
await page.fill("#bottleContent", "最近准备比赛有点累");
await page.click("#bottleThrow");
assert((await page.locator("#ownBottleCount").innerText()) === "1");
await page.click("#bottleDraw");
await page.waitForSelector("[data-drawn-bottle]");
await page.fill("#bottleReplyInput", "希望你今晚能休息一下");
await page.click("#bottleReply");
assert((await page.locator("#bottleReplyStatus").innerText()).includes("已放回海里"));
await page.click("#bottleBack");
await page.waitForSelector("#goSettings");

await page.click("#goSettings");
await page.waitForSelector("#goRuleLab");
body = await page.locator("body").innerText();
assert(body.includes("当前个人倾向：仍在建立"));
assert(body.includes("有效反馈次数：0 / 3"));
assert(body.includes("高风险事件：已排除 0 次"));
const downloadPromise = page.waitForEvent("download");
await page.click("#exportRecords");
const download = await downloadPromise;
const exportPath = await download.path();
const exported = JSON.parse(readFileSync(exportPath, "utf8"));
assert(exported.memos.some((memo) => memo.title === "国赛准备"));
assert(exported.scheduleItems.some((item) => item.title === "明天提交摘要"));
assert.equal(exported.bottles.length, 1);
assert.equal(exported.decisionTrace.policyVersion, "mindpulse-policy-2.0");
await page.click("#goRuleLab");
await page.waitForSelector('[data-lab-scenario="LAB-01"]');
for (const scenario of ["LAB-01", "LAB-02", "LAB-03"]) {
  await page.click(`[data-lab-scenario="${scenario}"]`);
  const output = await page.locator("[data-lab-result]").innerText();
  assert(output.includes(scenario));
}
assert((await page.locator("[data-lab-result]").innerText()).includes("只允许求助"));

await page.evaluate(() => {
  const now = new Date().toISOString();
  localStorage.setItem("mindpulse:local-demo:recs", JSON.stringify([
    { id: "safe", createdAt: new Date(Date.now() - 3600000).toISOString(), mood: "calm", sleepHours: 7, steps: 6000, socialScore: 60, note: "今天还好" },
    { id: "risk", createdAt: now, mood: "sad", sleepHours: 4, steps: 900, socialScore: 5, note: "我很绝望，想从这个世界上消失" }
  ]));
});
await page.goto(url, { waitUntil: "load" });
await page.waitForSelector("#spotlightGo");
body = await page.locator("body").innerText();
assert(body.includes("只允许求助"));
const blockedMessage = await page.evaluate(() => {
  try {
    window.MindPulseDebug.openIntervention("breathe");
    return "allowed";
  } catch (error) {
    return error.message;
  }
});
assert(blockedMessage.includes("SAFETY_GATE_BLOCKED"));
await page.click('[data-tab="companion"]');
await page.waitForTimeout(100);
body = await page.locator("body").innerText();
assert(body.includes("求助") && body.includes("暂停普通"));

assert.deepEqual(errors, [], `page should not emit errors: ${errors.join(" | ")}`);
await browser.close();
console.log("Convergence UI smoke passed.");
