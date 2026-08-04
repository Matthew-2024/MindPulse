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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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

await page.goto(`${baseUrl}/checkin`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="minimal-checkin-prompt"]');
assert(await page.locator('[data-testid="minimal-checkin-prompt"]').getAttribute("data-minimal-signal") === "mood", "empty check-in should ask the highest-value mood signal first");
await page.locator('[data-testid="minimal-checkin-skip"]').click();
await page.waitForFunction(() => document.querySelector('[data-testid="minimal-checkin-prompt"]')?.getAttribute("data-minimal-signal") === "sleep");

await page.goto(`${baseUrl}/reports`, { waitUntil: "networkidle" });
await page.waitForSelector(".reports-page");
assert(await page.locator(".mini-chart-column").count() === 7, "reports should reserve seven natural-day slots");
assert(await page.locator(".mini-bar-missing").count() === 14, "empty reports should show explicit missing markers instead of zero bars");
assert((await page.locator(".chart-legend-missing").innerText()).length > 0, "report legend should explain missing-data behavior");

await browser.close();
console.log("React Phase 21 smoke passed: one-question check-in skip and natural-day missing states.");
