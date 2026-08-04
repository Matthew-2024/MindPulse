import { existsSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const baseUrl = process.env.REACT_BASE_URL || "http://127.0.0.1:5180";
const edgeCandidates = ["C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"];
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || edgeCandidates.find((candidate) => existsSync(candidate));
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-gpu"] });
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 430, height: 932 } });
const page = await context.newPage();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await page.goto(`${baseUrl}/rules`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="policy-replay-lab"]');
assert((await page.locator('[data-testid="policy-replay-lab"]').innerText()).includes("2026.08.04.1"), "Rule Lab should disclose the canonical policy version");
await page.locator('[data-testid="save-policy-review"]').click();
const localReview = await page.evaluate(() => localStorage.getItem("mindpulse:policyReleaseHistory"));
assert(localReview?.includes("mindpulse-safety-core") && localReview.includes('"replay"') && !localReview.includes("vault_"), "local policy review snapshot should contain replay metadata without vault identifiers");
const downloadPromise = page.waitForEvent("download");
await page.locator('[data-testid="export-policy-review"]').click();
const download = await downloadPromise;
assert(download.suggestedFilename() === "mindpulse-policy-review.json", "Rule Lab should export a named policy-review artifact");
const evidence = await download.createReadStream();
let body = "";
for await (const chunk of evidence) body += chunk.toString();
assert(body.includes("mindpulse-safety-core") && body.includes("Local policy-review evidence"), "policy export should contain release and boundary metadata");
assert(!body.includes("vault_") && !body.includes("mindpulseReactVaultId"), "policy export must not include vault identifiers");

await browser.close();
console.log("React policy-lab smoke passed: replay evidence export has release metadata and no vault data.");
