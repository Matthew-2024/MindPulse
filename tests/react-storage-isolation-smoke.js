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
const alphaVaultId = "vault_storage_isolation_alpha";
const betaVaultId = "vault_storage_isolation_beta";
const alphaMarker = "storage-isolation-alpha-only";
const betaMarker = "storage-isolation-beta-only";

async function downloadJson(page) {
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#exportRecords").click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  assert(stream, "JSON export should expose a readable stream");
  let body = "";
  for await (const chunk of stream) body += chunk.toString();
  return JSON.parse(body);
}

async function selectVault(page, vaultId) {
  await page.evaluate((nextVaultId) => {
    localStorage.setItem("mindpulseReactVaultId", nextVaultId);
    localStorage.removeItem("mindpulseReactVaultCleared");
  }, vaultId);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".settings-page");
  await page.waitForFunction((expectedVaultId) => {
    return document.querySelector(".ledger-row code")?.textContent === expectedVaultId;
  }, vaultId);
}

const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-gpu"] });
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 430, height: 932 } });
const page = await context.newPage();

try {
  await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
  await page.waitForSelector(".settings-page");

  const source = await page.evaluate(async () => {
    const vaultId = localStorage.getItem("mindpulseReactVaultId");
    if (!vaultId || !window.MindPulseVaultStore) return null;
    return window.MindPulseVaultStore.readVault(vaultId);
  });
  assert(source && Array.isArray(source.records) && source.records.length > 0, "the fixture must provide a source vault snapshot");

  await page.evaluate(async ({ alphaVaultId: alphaId, betaVaultId: betaId, alphaMarker: alphaNote, betaMarker: betaNote, sourceSnapshot }) => {
    if (!window.MindPulseVaultStore) throw new Error("vault store is unavailable");
    const seedRecord = sourceSnapshot.records[0];
    const snapshotFor = (vaultId, marker) => ({
      ...sourceSnapshot,
      records: [{
        ...seedRecord,
        id: `record-${vaultId}`,
        createdAt: "2026-08-04T12:00:00.000Z",
        dataMode: "real-trial",
        dataInputMode: "manual-web",
        entryType: "instant",
        note: marker
      }],
      dataMode: "real-trial",
      tasks: [],
      interventionEvents: [],
      trustedCircleInvitations: [],
      trustedCircleCheckbacks: []
    });
    await window.MindPulseVaultStore.writeVault(alphaId, snapshotFor(alphaId, alphaNote));
    await window.MindPulseVaultStore.writeVault(betaId, snapshotFor(betaId, betaNote));
  }, { alphaVaultId, betaVaultId, alphaMarker, betaMarker, sourceSnapshot: source });

  await selectVault(page, alphaVaultId);
  const alphaExport = JSON.stringify(await downloadJson(page));
  assert(alphaExport.includes(alphaMarker), "alpha export should contain only alpha's record");
  assert(!alphaExport.includes(betaMarker), "alpha export must not contain beta's record");

  await selectVault(page, betaVaultId);
  const betaExport = JSON.stringify(await downloadJson(page));
  assert(betaExport.includes(betaMarker), "beta export should contain only beta's record");
  assert(!betaExport.includes(alphaMarker), "beta export must not contain alpha's record");

  const records = await page.evaluate(async ({ alphaVaultId: alphaId, betaVaultId: betaId }) => {
    const alpha = await window.MindPulseVaultStore.readVault(alphaId);
    const beta = await window.MindPulseVaultStore.readVault(betaId);
    return { alpha, beta };
  }, { alphaVaultId, betaVaultId });
  assert(records.alpha?.records?.[0]?.note === alphaMarker, "alpha vault record must remain addressable only by alpha key");
  assert(records.beta?.records?.[0]?.note === betaMarker, "beta vault record must remain addressable only by beta key");
} finally {
  await context.close();
  await browser.close();
}

console.log("React storage isolation smoke passed: deterministic vault-key selection and export boundaries.");
