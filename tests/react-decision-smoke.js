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
const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
await page.waitForSelector(".settings-page");
await page.evaluate(async () => {
  localStorage.clear();
  localStorage.setItem("mindpulseReactVaultCleared", "1");
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase("mindpulse-local-vault");
    request.onsuccess = request.onerror = request.onblocked = () => resolve();
  });
});
await page.reload({ waitUntil: "networkidle" });

await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await page.waitForSelector(".snapshot-panel");
const body = await page.locator("body").innerText();
assert(body.includes("暂不计算") && body.includes("暂时无法判断") && body.includes("已收集 0/4 项信号"), "empty record state should avoid a precise score and state the uncertainty");
assert(body.includes("还缺少：情绪、睡眠、活动、连接感"), "empty record state should list missing signals");
assert(body.includes("当前状态") && body.includes("数据不足") && body.includes("现在可以做") && body.includes("补充一条记录"), "empty record state should make the current state and next action explicit");
assert((await page.locator(".trace-panel .action-tags-allow").innerText()) === "补充记录", "data-insufficient trace should keep only check-in as the allowed path");
assert((await page.locator(".trace-panel .action-tags-block").innerText()) === "普通行动暂不建议", "data-insufficient trace should collapse ordinary blocked actions");
assert((await page.locator(".primary-action-row .button-primary").innerText()).includes("补充一条记录"), "home primary action should route to check-in when data is insufficient");

await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "切换到普通波动" }).click();
await page.waitForFunction(() => document.body.innerText.includes("已切换到普通波动演示"));
await page.goto(`${baseUrl}/` , { waitUntil: "networkidle" });
assert((await page.locator("body").innerText()).includes("示例记录"), "demo switcher should restore the normal fixture");

await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "切换到空白档案" }).click();
await page.waitForFunction(() => document.body.innerText.includes("已切换到空白档案演示"));
await page.goto(`${baseUrl}/` , { waitUntil: "networkidle" });
assert((await page.locator("body").innerText()).includes("还没有记录"), "demo switcher should clear to the empty fixture");

const demoContext = await browser.newContext({ viewport: { width: 430, height: 932 } });
const demoPage = await demoContext.newPage();
await demoPage.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
await demoPage.getByRole("button", { name: "切换到高风险演示" }).click();
await demoPage.waitForURL(/\/help$/);
assert((await demoPage.locator("body").innerText()).includes("现在先联系一个真实的人"), "demo switcher should open the high-risk help fixture");
await demoContext.close();

await page.waitForFunction(() => {
  const route = document.querySelector(".route-transition");
  return Boolean(route && route.getAnimations().every((animation) => animation.playState === "finished"));
});
const insufficientPrimaryAction = page.getByRole("button", { name: /补充一条记录/ });
await insufficientPrimaryAction.click();
await page.waitForURL(/\/checkin$/);
await page.waitForFunction(() => document.body.innerText.includes("记录现在"));
assert((await page.locator("body").innerText()).includes("记录现在"), "data-insufficient primary action should open check-in");
await page.locator(".mood-option").filter({ hasText: "平稳" }).click();
await page.getByRole("button", { name: "保存并查看解释" }).click();
await page.waitForURL(/\/insight$/);
await page.waitForFunction(() => {
  const text = document.body.innerText;
  return text.includes("暂定参考") && text.includes("已收集 1/4 项") && text.includes("完整状态分暂不计算");
});
const partialBody = await page.locator("body").innerText();
assert(partialBody.includes("暂定参考") && partialBody.includes("已收集 1/4 项") && partialBody.includes("完整状态分暂不计算"), "partial record should show a provisional reference score without a complete-state score");

await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
await page.locator(".resource-form input").nth(0).fill("12356");
await page.locator(".resource-form input").nth(6).fill("https://example.edu/support");
await page.getByRole("button", { name: "我确认这个资源可用" }).click();
await page.waitForFunction(() => document.body.innerText.includes("已核验"));
assert((await page.locator(".resource-status strong").innerText()).includes("已核验"), "resource verification should show the confirmed state");
await page.getByRole("button", { name: "资源已经失效" }).click();
await page.waitForFunction(() => document.body.innerText.includes("已标记为失效"));
await page.goto(`${baseUrl}/checkin`, { waitUntil: "networkidle" });
await page.locator(".note-input").fill("我想从这个世界上消失");
await page.getByRole("button", { name: "保存并查看解释" }).click();
await page.waitForURL(/\/help$/);
assert((await page.locator('a[href^="tel:"]').count()) === 0, "a resource marked invalid must not render a hotline link");
assert((await page.locator("a.resource-card-campus").count()) === 0, "a resource marked invalid must not render a campus link");
assert((await page.locator("body").innerText()).includes("已标记为失效"), "help page should disclose the invalid resource state");

assert(await page.locator('[data-testid="offline-support-fallback"]').count() === 1, "invalid resources must retain an offline fallback action");
assert((await page.locator('[data-testid="offline-support-fallback"]').innerText()).includes("急救号码"), "offline fallback should explain the local emergency path");

await browser.close();
if (errors.length) throw new Error(`React decision browser errors: ${errors.join(" | ")}`);
console.log("React decision smoke passed: baseline gate, missing signals, and action boundary.");
