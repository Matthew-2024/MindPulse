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
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-gpu"]
});
const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await page.waitForSelector(".snapshot-panel");
let body = await page.locator("body").innerText();
const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute("content");
assert(viewportMeta?.includes("viewport-fit=cover"), "mobile viewport should include iOS safe-area support");
assert(await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute("content") === "yes", "page should expose iOS standalone metadata");
assert(body.includes("我的节奏"), "home should expose the personal rhythm summary");
assert(body.includes("示例记录"), "home should mark synthetic demo data");
assert(body.includes("记录完整度") && body.includes("判断可靠度"), "home should expose record quality and confidence");

await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
await page.waitForSelector(".settings-page");
body = await page.locator("body").innerText();
assert(body.includes("资源状态") && body.includes("示例记录没有真实资源"), "settings should distinguish unconfigured synthetic demo resources");
await page.locator(".resource-form input").first().fill("not-a-phone");
await page.getByRole("button", { name: "保存资源" }).click();
await page.waitForFunction(() => document.body.innerText.includes("保存在本机，不自动联系、不上传"));

await page.goto(`${baseUrl}/insight`, { waitUntil: "networkidle" });
await page.waitForSelector(".contribution-section");
body = await page.locator("body").innerText();
assert(body.includes("各项记录的影响") && body.includes("判断过程"), "insight should explain contributions and decision process");
assert(body.includes("不是诊断") || body.includes("因果"), "insight should expose the interpretation boundary");

await page.goto(`${baseUrl}/companion`, { waitUntil: "networkidle" });
await page.waitForSelector(".companion-card");
await page.getByRole("button", { name: "看为什么" }).click();
await page.getByRole("button", { name: "完成这一步" }).click();
await page.waitForSelector(".feedback-result");
assert((await page.locator("body").innerText()).includes("本次记录的变化"), "companion should record this-session feedback without claiming treatment effect");
assert((await page.locator("body").innerText()).includes("更适合你的做法") && (await page.locator("body").innerText()).includes("有用记录"), "companion should expose the safe personalization threshold");

await page.goto(`${baseUrl}/checkin`, { waitUntil: "networkidle" });
await page.locator(".note-input").fill("我想从这个世界上消失");
await page.getByRole("button", { name: "保存并查看解释" }).click();
await page.waitForURL(/\/help$/);
await page.waitForSelector(".safety-gate");
body = await page.locator("body").innerText();
assert(body.includes("先连接一个真实的人"), "high-risk input should open the safety gate");
assert(body.includes("热线格式无效"), "invalid hotline should be clearly marked");
assert(body.includes("当前状态摘要") && body.includes("我现在是否需要马上联系"), "help bridge should expose state summary and urgency choice");
assert(!body.includes("现在只做这一件事") && !body.includes("做一轮低负担呼吸"), "high-risk help page must not render ordinary intervention copy");
const phoneLinks = await page.locator('a[href^="tel:"]').count();
assert(phoneLinks === 0, "invalid help resources must not render tel links");
const savedVault = await page.evaluate(async () => {
  const active = localStorage.getItem("mindpulseReactVaultId") || null;
  const result = await new Promise((resolve) => {
    const request = indexedDB.open("mindpulse-local-vault", 2);
    request.onsuccess = () => {
      const db = request.result;
      const read = db.transaction("vault_records", "readonly").objectStore("vault_records").get(active);
      read.onsuccess = () => { db.close(); resolve(read.result || null); };
      read.onerror = () => { db.close(); resolve(null); };
    };
    request.onerror = () => resolve(null);
  });
  return result;
});
assert(savedVault?.dataMode === "real-trial", "first manual check-in should move the vault out of synthetic demo mode");
assert(savedVault.records.length === 1, "first manual check-in should replace synthetic demo records");
assert(!savedVault.records.some((record) => String(record.id || "").startsWith("demo-")), "vault should not keep synthetic demo records after first manual check-in");
await page.getByRole("button", { name: "现在需要联系" }).click();
assert((await page.locator("#help-draft").inputValue()).includes("现在回复"), "urgent help choice should update the draft wording");
await page.getByRole("button", { name: "复制草稿" }).click();
await page.waitForFunction(() => document.querySelector(".composer-footer button")?.textContent?.includes("已复制"));
assert((await page.locator(".composer-footer button").innerText()) === "已复制", "help draft should be editable and copyable");
await page.getByRole("button", { name: "陪我保持联系" }).click();
assert((await page.locator("#help-draft").inputValue()).includes("保持联系"), "help draft should reflect the selected support need");
const helpEvents = await page.evaluate(async () => {
  const active = localStorage.getItem("mindpulseReactVaultId") || null;
  return await new Promise((resolve) => {
    const request = indexedDB.open("mindpulse-local-vault", 2);
    request.onsuccess = () => {
      const db = request.result;
      const read = db.transaction("vault_records", "readonly").objectStore("vault_records").get(active);
      read.onsuccess = () => { db.close(); resolve(read.result?.tasks || []); };
      read.onerror = () => { db.close(); resolve([]); };
    };
    request.onerror = () => resolve([]);
  });
});
assert(helpEvents.some((event) => event.type === "help-draft" && event.copied === false), "help draft generation should record anonymous copied=false metadata");
assert(helpEvents.some((event) => event.type === "help-draft" && event.copied === true), "help draft copy should record anonymous copied=true metadata");

for (const viewport of [{ width: 375, height: 667 }, { width: 430, height: 932 }, { width: 1024, height: 768 }]) {
  const viewportPage = await browser.newPage({ viewport });
  await viewportPage.goto(`${baseUrl}/help`, { waitUntil: "networkidle" });
  await viewportPage.waitForSelector(".help-page");
  const layout = await viewportPage.evaluate(() => {
    const nav = document.querySelector(".bottom-nav");
    const topbar = document.querySelector(".topbar");
    const primary = document.querySelector(".safety-actions .button, .composer-footer .button");
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      navPosition: nav ? getComputedStyle(nav).position : "missing",
      topbarPosition: topbar ? getComputedStyle(topbar).position : "missing",
      primaryHeight: primary ? Math.round(primary.getBoundingClientRect().height) : 0
    };
  });
  assert(!layout.overflow, `${viewport.width}x${viewport.height} should not overflow horizontally`);
  if (viewport.width <= 430) {
    assert(layout.navPosition === "fixed", `${viewport.width}px should use a fixed bottom tab bar`);
    assert(layout.topbarPosition === "sticky", `${viewport.width}px should use a sticky iOS-style top bar`);
    assert(layout.primaryHeight >= 44, `${viewport.width}px primary actions should be at least 44px tall`);
  }
  await viewportPage.close();
}

await browser.close();
if (errors.length) throw new Error(`React UI browser errors: ${errors.join(" | ")}`);
console.log("React UI smoke passed: home, insight, companion, high-risk help, copy, and responsive viewports.");
