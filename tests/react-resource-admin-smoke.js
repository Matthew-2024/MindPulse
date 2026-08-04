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

await page.addInitScript(() => {
  const events = Array.from({ length: 5 }, (_, index) => ({
    id: `operation-${index}`,
    tenantId: "local-resource-review",
    resourceId: "offline-support-fallback",
    kind: "copy-requested",
    createdAt: "2026-08-04T00:00:00.000Z"
  }));
  localStorage.setItem("mindpulse:resourceOperations", JSON.stringify(events));
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await page.goto(`${baseUrl}/resource-admin`, { waitUntil: "networkidle" });
await page.waitForSelector(".resource-admin-page");
const initialBody = await page.locator("body").innerText();
assert(initialBody.includes("Development-only local admin boundary"), "admin route should disclose its development-only boundary");
assert(initialBody.includes("cannot read student records"), "admin route should disclose its record boundary");
assert(initialBody.includes("Resource health signals"), "admin route should show resource-only local health metadata");
assert(initialBody.includes("link opens: 0; copies: 5"), "admin metrics should reveal only aggregate counts after the five-action minimum");

await page.getByRole("button", { name: "Publish demo pack locally" }).click();
await page.waitForFunction(() => document.body.innerText.includes("Demo campus resource pack published locally."));
await page.locator("select").selectOption("demo-campus-support");
await page.getByRole("button", { name: "Mark invalid" }).click();
await page.waitForFunction(() => document.body.innerText.includes("RESOURCE_INVALIDATION_REASON_REQUIRED"));
await page.locator('input[placeholder="Required before invalidating"]').fill("link was manually checked and is unavailable");
await page.getByRole("button", { name: "Mark invalid" }).click();
await page.waitForFunction(() => document.body.innerText.includes("Selected resource marked invalid locally."));

const state = await page.evaluate(async () => {
  const pack = JSON.parse(localStorage.getItem("mindpulse:resourcePack") || "{}");
  const indexedDbNames = await indexedDB.databases();
  const operations = JSON.parse(localStorage.getItem("mindpulse:resourceOperations") || "[]");
  return { pack, indexedDbNames: indexedDbNames.map((database) => database.name), operations };
});
assert(state.pack.resources.find((resource) => resource.id === "demo-campus-support")?.verificationStatus === "invalid", "admin invalidation should update only the selected cached resource");
assert(!state.indexedDbNames.includes("mindpulse-local-vault"), "admin route should not create or read a student vault");
assert(state.operations.every((event) => Object.keys(event).every((key) => ["id", "tenantId", "resourceId", "kind", "createdAt"].includes(key))), "admin operation cache must remain metadata-only");

await browser.close();
console.log("React resource-admin smoke passed: local review boundary, publish, reasoned invalidation, and no student vault access.");
