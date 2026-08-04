import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const baseUrl = process.env.REACT_BASE_URL || "http://127.0.0.1:5180";
const edgeCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || edgeCandidates.find((candidate) => existsSync(candidate));
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-gpu"] });
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 430, height: 932 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await page.getByRole("link", { name: "进入海域" }).click();
await page.waitForSelector(".bottle-page");
let body = await page.locator("body").innerText();
assertCondition(body.includes("本机演示海域") && body.includes("未连接真实社区"), `bottle demo should show its local-only boundary (url: ${page.url()}, body: ${body.slice(0, 240)})`);
assertCondition(await page.getByRole("link", { name: "导出或删除本机数据" }).count() === 1, "bottle demo should expose its export and deletion handoff");

await page.getByRole("button", { name: "投放漂流瓶" }).click();
assertCondition((await page.locator("body").innerText()).includes("先写下一句话"), "empty bottle content should be rejected");
await page.getByRole("textbox", { name: "此刻想留下什么？" }).fill("最近准备比赛有点累，但我想先完成最小的一步");
await page.getByRole("button", { name: "投放漂流瓶" }).dblclick();
await page.waitForFunction(() => document.querySelector("#own-bottle-count")?.textContent === "1");
assertCondition(JSON.parse(await page.evaluate(() => localStorage.getItem("mindpulse:bottleSea") || "[]")).length === 1, "double click should create one bottle");

await page.getByRole("button", { name: "随机捞取" }).click();
await page.waitForSelector("[data-drawn-bottle]");
assertCondition((await page.locator("[data-drawn-bottle]").innerText()).includes("匿名同学"), "draw should return a seeded anonymous bottle");
await page.getByRole("textbox", { name: "留一句匿名回应" }).fill("我看见了，今晚先照顾好自己");
await page.getByRole("button", { name: "放回一条回应" }).dblclick();
await page.waitForFunction(() => document.body.innerText.includes("回应已放回海里"));
await page.getByRole("button", { name: "隐藏这只" }).click();
assertCondition((await page.locator("body").innerText()).includes("已在本机隐藏"), "hidden bottle should be acknowledged locally");

await page.reload({ waitUntil: "networkidle" });
assertCondition(await page.locator("#own-bottle-count").textContent() === "1", "own bottle should survive a page reload");

for (const viewport of [{ width: 375, height: 667 }, { width: 430, height: 932 }, { width: 1024, height: 768 }]) {
  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}/bottle`, { waitUntil: "networkidle" });
  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    buttonHeight: Math.round(document.querySelector("#bottle-throw")?.getBoundingClientRect().height || 0),
    navPosition: getComputedStyle(document.querySelector(".bottom-nav")).position
  }));
  assertCondition(!layout.overflow, `${viewport.width}px bottle page should not overflow horizontally`);
  assertCondition(layout.buttonHeight >= 40, `${viewport.width}px bottle primary action should keep a usable target`);
  if (viewport.width <= 430) assertCondition(layout.navPosition === "relative", `${viewport.width}px should keep the bottom navigation in the shell layout`);
}

const profileId = await page.evaluate(() => localStorage.getItem("mindpulseReactVaultId"));
const ownBottleContent = "最近准备比赛有点累，但我想先完成最小的一步";
const replyFixture = await page.evaluate((ownerId) => {
  const sea = JSON.parse(localStorage.getItem("mindpulse:bottleSea") || "[]");
  const own = sea.find((item) => item.ownerId === ownerId);
  if (!own || !window.MindPulseBottleRepository) return null;
  return window.MindPulseBottleRepository.createLocalBottleRepository(window.localStorage)
    .replyToBottle("secondary-anonymous-profile", own.id, "我看见了，你不用一次解决所有事");
}, profileId);
assertCondition(Boolean(replyFixture), "a secondary anonymous profile should be able to create a visible reply fixture");

await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
const exportDownloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "导出 JSON" }).click();
const exportDownload = await exportDownloadPromise;
const exportPath = await exportDownload.path();
const fs = await import("node:fs/promises");
const exported = JSON.parse(await fs.readFile(exportPath, "utf8"));
assertCondition(exported.bottles.some((bottle) => bottle.content === ownBottleContent), "export should include the current profile's bottles");
assertCondition(exported.bottleReplies.some((reply) => reply.content.includes("我看见了") && !Object.prototype.hasOwnProperty.call(reply, "senderId")), "export should include visible anonymous replies without another profile id");

let deletionDialogSeen = false;
page.once("dialog", async (dialog) => {
  deletionDialogSeen = dialog.message().includes("确定删除本机记录");
  await dialog.accept();
});
await page.getByRole("button", { name: "删除本地记录" }).click();
await page.waitForFunction(() => document.body.innerText.includes("还没有记录"));
assertCondition(deletionDialogSeen, "bottle data deletion should require the existing confirmation");
const bottleKeysAfterDelete = await page.evaluate(() => Object.keys(localStorage).filter((key) => key === "mindpulse:bottleSea" || key.endsWith(":bottleReplies") || key.endsWith(":bottleHidden") || key.endsWith(":bottleReports")));
assertCondition(bottleKeysAfterDelete.length === 0, `deleting the local profile should clear bottle-related keys (${bottleKeysAfterDelete.join(", ")})`);

await page.goto(`${baseUrl}/checkin`, { waitUntil: "networkidle" });
await page.getByRole("textbox", { name: "例如：考试前有点紧张，但我还想把今天过完。" }).fill("我想从这个世界上消失");
await page.getByRole("button", { name: "保存并查看解释" }).click();
await page.waitForFunction(() => window.location.pathname === "/help");
await page.goto(`${baseUrl}/bottle`, { waitUntil: "networkidle" });
assertCondition(page.url().endsWith("/help"), "high-risk state should not enter the bottle demo");
assertCondition(!(await page.locator("body").innerText()).includes("本机演示海域"), "high-risk help page should not render the bottle demo");

await context.close();
await browser.close();
if (errors.length) throw new Error(`Bottle UI browser errors: ${errors.join(" | ")}`);
console.log("React bottle smoke passed: local demo, safe boundaries, duplicate-click guard, persistence, responsive layout, and high-risk redirect.");
