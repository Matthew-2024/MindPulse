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
const context = await browser.newContext({ viewport: { width: 487, height: 872 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

async function clearLocalData() {
  await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem("mindpulseReactVaultCleared", "1");
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase("mindpulse-local-vault");
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
  });
  await page.reload({ waitUntil: "networkidle" });
}

async function capture(name) {
  await page.waitForTimeout(450);
  await page.screenshot({ path: resolve(outputDir, name) });
}

await clearLocalData();
await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await page.waitForSelector(".snapshot-panel");
await capture("evidence-empty-487x872.png");

await page.goto(`${baseUrl}/checkin`, { waitUntil: "networkidle" });
await page.locator(".mood-option").filter({ hasText: "平稳" }).click();
await page.getByRole("button", { name: "保存并查看解释" }).click();
await page.waitForFunction(() => window.location.pathname === "/insight");
await capture("evidence-partial-487x872.png");

await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "恢复演示数据" }).click();
await page.waitForFunction(() => document.body.innerText.includes("示例记录"));
await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await page.waitForSelector(".snapshot-panel");
await capture("evidence-normal-487x872.png");

await page.goto(`${baseUrl}/checkin`, { waitUntil: "networkidle" });
await page.locator(".note-input").fill("我很绝望，想从这个世界上消失");
await page.getByRole("button", { name: "保存并查看解释" }).click();
await page.waitForFunction(() => window.location.pathname === "/help");
await capture("evidence-high-risk-487x872.png");
await page.locator('[data-testid="privacy-receipt"]').scrollIntoViewIfNeeded();
await capture("evidence-help-receipt-487x872.png");

await page.getByRole("button", { name: "我已联系支持，重新评估" }).click();
await page.waitForFunction(() => window.location.pathname === "/checkin");
await page.locator(".mood-option").filter({ hasText: "平稳" }).click();
await page.getByRole("button", { name: "保存并查看解释" }).click();
await page.waitForFunction(() => window.location.pathname === "/insight");
await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "恢复演示数据" }).click();
await page.waitForFunction(() => document.body.innerText.includes("示例记录"));
await page.goto(`${baseUrl}/bottle`, { waitUntil: "networkidle" });
await page.waitForSelector(".bottle-page");
await capture("evidence-bottle-487x872.png");

await context.close();
await browser.close();
if (errors.length) throw new Error(`React evidence browser errors: ${errors.join(" | ")}`);
console.log(`React evidence screenshots written to ${outputDir}`);
