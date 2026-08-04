import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import packageInfo from "../package.json" with { type: "json" };
import { POLICY_PACKAGE, POLICY_PACKAGE_HASH } from "../src/rules/policy-sdk.js";

const root = process.cwd();
const evidenceRoot = resolve(root, "output", "playwright");
const artifactRoot = resolve(root, "output", "regression-artifacts");
const generatedAt = process.env.REGRESSION_ARTIFACT_AT || new Date().toISOString();
const artifactId = `mindpulse-${packageInfo.version}-${generatedAt.replace(/[:.]/g, "-")}`;
const verifiedByPreflight = process.argv.includes("--after-preflight");

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function screenshotsIn(directory) {
  if (!existsSync(directory)) return [];
  const entries = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const candidate = resolve(directory, entry.name);
    if (entry.isDirectory()) entries.push(...screenshotsIn(candidate));
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) entries.push(candidate);
  }
  return entries;
}

const screenshots = screenshotsIn(evidenceRoot).map((filePath) => ({
  path: relative(root, filePath).split(sep).join("/"),
  bytes: statSync(filePath).size,
  sha256: sha256(filePath)
})).sort((left, right) => left.path.localeCompare(right.path));

if (!screenshots.length) throw new Error("REGRESSION_ARTIFACT_EVIDENCE_MISSING: no Playwright PNG evidence found");

const artifact = {
  schemaVersion: 1,
  artifactId,
  generatedAt,
  scope: "local canonical React regression evidence",
  app: { name: packageInfo.name, version: packageInfo.version },
  policy: { id: POLICY_PACKAGE.id, version: POLICY_PACKAGE.version, hash: POLICY_PACKAGE_HASH },
  verification: {
    command: "npm.cmd run preflight",
    status: verifiedByPreflight ? "passed" : "not-asserted",
    statusBasis: verifiedByPreflight
      ? "This artifact was emitted as the final preflight step."
      : "Direct artifact capture does not assert that preflight passed."
  },
  evidence: screenshots,
  limitations: [
    "Local artifact only; it is not evidence of remote CI execution.",
    "Screenshot hashes prove captured files, not real-user validation or professional approval.",
    "The artifact contains filenames, byte counts, hashes, and release metadata only."
  ]
};

mkdirSync(artifactRoot, { recursive: true });
const artifactPath = resolve(artifactRoot, `${artifactId}.json`);
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(`Regression artifact written to ${relative(root, artifactPath)} (${screenshots.length} screenshot hash(es)).`);
