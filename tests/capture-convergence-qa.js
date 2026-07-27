import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const entry = readdirSync(resolve(".")).find((name) => name.includes("Web原型") && !name.includes("备份") && name.endsWith(".html"));
const output = resolve("tmp_convergence_visual");
mkdirSync(output, { recursive: true });
const edgeCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || edgeCandidates.find(existsSync);
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
const url = pathToFileURL(resolve(entry)).href + "?smoke=1";
await page.goto(url, { waitUntil: "load" });
await page.evaluate(() => { localStorage.clear(); localStorage.setItem("mindpulseSessionProfileReady", "1"); });
await page.reload({ waitUntil: "load" });
await page.waitForSelector("#spotlightGo");
await page.screenshot({ path: resolve(output, "01-home.png") });

await page.click("#homeMemo");
await page.click("#memoCreate");
await page.fill("#memoTitle", "国赛答辩准备");
await page.fill("[data-memo-item-input]", "检查比赛材料和报名文件");
await page.locator("[data-memo-insert-after]").first().click();
await page.locator("[data-memo-item-input]").nth(1).fill("完善答辩稿并确认演示顺序");
await page.locator("[data-memo-insert-after]").nth(1).click();
await page.locator("[data-memo-item-input]").nth(2).fill("补充国赛规则实验室截图");
await page.waitForTimeout(420);
await page.screenshot({ path: resolve(output, "02-memo-detail.png") });
await page.click("#memoBack");
await page.fill("#memoSearch", "竞赛");
await page.waitForTimeout(420);
await page.screenshot({ path: resolve(output, "03-memo-search.png") });
await page.click("#memoListBack");

await page.click("#homeSchedule");
const tomorrow = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
await page.fill("#scheduleTitle", "提交国赛材料");
await page.fill("#scheduleDate", tomorrow);
await page.click("#scheduleAdd");
await page.waitForTimeout(420);
await page.screenshot({ path: resolve(output, "04-schedule.png") });
await page.click("#scheduleBack");

await page.click('[data-tab="help"]');
await page.click("#openBottleSea");
await page.fill("#bottleContent", "最近准备比赛有点累，希望有人听见。");
await page.click("#bottleThrow");
await page.click("#bottleDraw");
await page.waitForTimeout(420);
await page.screenshot({ path: resolve(output, "05-bottle.png") });
await page.click("#bottleBack");
await page.click("#goSettings");
await page.click("#goRuleLab");
await page.click('[data-lab-scenario="LAB-03"]');
await page.waitForTimeout(420);
await page.screenshot({ path: resolve(output, "06-rule-lab.png") });

await page.evaluate(() => {
  localStorage.setItem("mindpulse:local-demo:recs", JSON.stringify([
    { id: "safe", createdAt: new Date(Date.now() - 3600000).toISOString(), mood: "calm", sleepHours: 7, steps: 6000, socialScore: 60, note: "今天还好" },
    { id: "risk", createdAt: new Date().toISOString(), mood: "sad", sleepHours: 4, steps: 900, socialScore: 5, note: "我很绝望，想从这个世界上消失" }
  ]));
});
await page.goto(url, { waitUntil: "load" });
await page.waitForSelector("#spotlightGo");
await page.waitForTimeout(420);
await page.screenshot({ path: resolve(output, "07-high-risk-home.png") });
await page.click("#spotlightGo");
await page.waitForTimeout(420);
await page.screenshot({ path: resolve(output, "08-high-risk-help.png") });

await browser.close();
console.log(output);
