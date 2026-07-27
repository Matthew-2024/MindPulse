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

await page.goto(`${baseUrl}/rules`, { waitUntil: "networkidle" });
await page.waitForSelector(".rule-lab-page");
let body = await page.locator("body").innerText();
assert(body.includes("安全检查通过"), "rule lab should verify the high-risk gate");
assert(body.includes("高风险：先求助") && body.includes("联系支持"), "rule lab should route high-risk fixture to help");
assert(body.includes("示例场景") && body.includes("TEXT_CRISIS_SIGNAL") && body.includes("DATA_INSUFFICIENT"), "rule lab should expose labelled scenarios and concrete reason codes");
const highRiskAllowed = await page.locator(".contract-grid > div").filter({ hasText: "高风险时可以做" }).innerText();
assert(highRiskAllowed.includes("联系支持"), "rule lab should expose help as the only high-risk allowed action");
assert(body.includes("高风险时的普通行动") && body.includes("已暂停"), "rule lab should show the domain command guard");
assert(body.includes("记录不够时的普通行动") && body.includes("已暂停"), "rule lab should block ordinary actions when data is insufficient");
assert(body.includes("高风险时进入陪伴") && body.includes("高风险记录用于学习") && body.includes("不会使用"), "rule lab should expose route and learning safety contracts");
await page.locator('[data-fixture-id="LAB-02"]').click();
assert((await page.locator(".fixture-detail").innerText()).includes("普通波动"), "rule lab should update the selected scenario detail");
await page.locator('[data-fixture-id="LAB-03"]').click();
assert((await page.locator(".fixture-detail").innerText()).includes("联系支持"), "rule lab should switch back to the high-risk help output");

await page.goto(`${baseUrl}/checkin`, { waitUntil: "networkidle" });
await page.locator(".note-input").fill("我想从这个世界上消失");
await page.getByRole("button", { name: "保存并查看解释" }).click();
await page.waitForURL(/\/help$/);
await page.waitForSelector(".safety-gate");
body = await page.locator("body").innerText();
assert(body.includes("现在先联系一个真实的人"), "high-risk input should expose the help-only policy");
assert(!body.includes("完成这一步") && !body.includes("做一轮低负担呼吸"), "high-risk page must not expose ordinary actions");

await page.waitForFunction(async () => {
  const vaultId = localStorage.getItem("mindpulseReactVaultId");
  if (!vaultId) return false;
  return await new Promise((resolve) => {
    const request = indexedDB.open("mindpulse-local-vault", 2);
    request.onsuccess = () => {
      const db = request.result;
      const read = db.transaction("vault_records", "readonly").objectStore("vault_records").get(vaultId);
      read.onsuccess = () => { db.close(); resolve(Boolean(read.result?.safetyHold?.active)); };
      read.onerror = () => { db.close(); resolve(false); };
    };
    request.onerror = () => resolve(false);
  });
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForURL(/\/help$/);
assert((await page.locator("body").innerText()).includes("现在先联系一个真实的人"), "persisted safety hold should survive a reload");

await page.getByRole("button", { name: "我已联系支持，重新评估" }).click();
await page.waitForURL(/\/checkin$/);
assert((await page.locator("body").innerText()).includes("重新评估"), "explicit support confirmation should open safety reassessment");
await page.locator(".note-input").fill("我已经联系支持，现在重新记录当前状态");
await page.getByRole("button", { name: "保存并查看解释" }).click();
await page.waitForURL(/\/insight$/);
assert(page.url().endsWith("/insight"), "safe reassessment should leave the help-only route");

await page.goto(`${baseUrl}/companion`, { waitUntil: "networkidle" });
await page.waitForURL(/\/(checkin|companion)$/);
assert(!page.url().endsWith("/help"), "released safety hold should not force the user back to help");

await browser.close();
console.log("React security smoke passed: rule lab gate, high-risk redirect, help-only UI, and blocked ordinary actions.");
