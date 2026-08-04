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

await page.goto(`${baseUrl}/circle`, { waitUntil: "networkidle" });
await page.waitForSelector(".trusted-circle-page");
const boundary = page.locator('[data-testid="trusted-circle-boundary"]');
assert((await boundary.innerText()).includes("不读取"), "Trusted Circle must disclose no contact import");
assert((await boundary.innerText()).includes("仅复制"), "Trusted Circle must disclose user-triggered copy only");

await page.locator('[data-testid="trusted-circle-recipient"]').fill("室友");
await page.locator('[data-scope="company"]').click();
const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16);
await page.locator('[data-testid="trusted-circle-expiry"]').fill(expiresAt);
await page.locator('[data-testid="trusted-circle-consent"]').check();
await page.locator('[data-testid="create-trusted-circle"]').click();
await page.waitForSelector('[data-testid="trusted-circle-invitation"]');

const invitation = page.locator('[data-testid="trusted-circle-invitation"]');
await invitation.locator('[data-testid="copy-circle-draft"]').click();
await page.waitForFunction(() => document.body.innerText.includes("应用没有发送任何消息"));
await invitation.locator('[data-testid="schedule-circle-checkback"]').click();
await page.waitForSelector('[data-testid="complete-circle-checkback"]');
await invitation.locator('[data-testid="complete-circle-checkback"]').click();

const saved = await page.evaluate(async () => {
  const vaultId = localStorage.getItem("mindpulseReactVaultId");
  return await new Promise((resolve) => {
    const request = indexedDB.open("mindpulse-local-vault", 2);
    request.onsuccess = () => {
      const db = request.result;
      const read = db.transaction("vault_records", "readonly").objectStore("vault_records").get(vaultId);
      read.onsuccess = () => { db.close(); resolve(read.result || null); };
      read.onerror = () => { db.close(); resolve(null); };
    };
    request.onerror = () => resolve(null);
  });
});
assert(saved?.trustedCircleInvitations?.length === 1, "consented local invitation should persist");
assert(saved.trustedCircleInvitations[0].noContactImport === true, "stored invitation must retain no-contact-import boundary");
assert(!Object.hasOwn(saved.trustedCircleInvitations[0], "phone") && !Object.hasOwn(saved.trustedCircleInvitations[0], "history"), "stored invitation must not contain contact details or raw history");
assert(saved.trustedCircleCheckbacks?.[0]?.status === "completed", "check-back completion should persist locally");

await invitation.locator('[data-testid="revoke-circle-invitation"]').click();
await page.waitForFunction(() => document.querySelector('[data-testid="trusted-circle-invitation"]')?.getAttribute("data-status") === "revoked");
await browser.close();
console.log("React Trusted Circle smoke passed: explicit consent, copy-only invitation, local check-back, revocation, and no contact import.");
