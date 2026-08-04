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
const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
const page = await context.newPage();
const outbound = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

page.on("request", (request) => {
  if (!request.url().startsWith(baseUrl) && !request.url().startsWith("data:") && !request.url().startsWith("blob:")) outbound.push(request.url());
});

await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
await page.waitForSelector(".settings-page");
await page.locator(".resource-form input").nth(0).fill("12356");
await page.locator(".resource-form input").nth(6).fill("https://example.edu/support");
await page.getByRole("button", { name: "我确认这个资源可用" }).click();
await page.waitForFunction(() => document.body.innerText.includes("已核验"));
assert(await page.evaluate(() => Boolean(localStorage.getItem("mindpulse:resourcePack"))), "verified resources should refresh the local resource-pack cache");

await context.setOffline(true);
await page.locator('.bottom-nav a[href="/checkin"]').click();
await page.waitForURL(/\/checkin$/);
await page.waitForSelector(".checkin-form");
await page.locator(".note-input").fill("我想从这个世界上消失");
await page.getByRole("button", { name: "保存并查看解释" }).click();
await page.waitForURL(/\/help$/);
await page.waitForSelector(".safety-gate");

assert(await page.locator('a[href="tel:12356"]').count() === 1, "offline high-risk Help should retain the verified call action");
assert(await page.locator('a.resource-card-campus[href^="https://example.edu/"]').count() === 1, "offline high-risk Help should retain the verified campus action");
assert(await page.locator('[data-testid="offline-support-fallback"]').count() === 1, "offline high-risk Help should retain the local fallback action");
await page.getByRole("button", { name: "复制草稿" }).click();
await page.waitForFunction(() => document.querySelector(".composer-footer button")?.textContent?.includes("已复制"));
const operations = await page.evaluate(() => JSON.parse(localStorage.getItem("mindpulse:resourceOperations") || "[]"));
assert(operations.some((event) => event.resourceId === "offline-support-fallback" && event.kind === "copy-requested"), "copying fallback text should record only a resource-operation metadata event");
assert(operations.every((event) => Object.keys(event).every((key) => ["id", "tenantId", "resourceId", "kind", "createdAt"].includes(key))), "resource-operation cache must not contain user fields");
assert(outbound.length === 0, `offline high-risk flow must not send outbound requests: ${outbound.join(", ")}`);

await context.close();
await browser.close();
console.log("React resource-pack smoke passed: verified call/campus actions, offline fallback, local cache, copy path, and no automatic contact.");
