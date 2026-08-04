import { evaluatePolicyCore, POLICY_PACKAGE, POLICY_PACKAGE_HASH } from "../rules/policy-sdk.js";

export const POLICY_RELEASE_SCHEMA_VERSION = 1;
export const POLICY_RELEASE_HISTORY_KEY = "mindpulse:policyReleaseHistory";

export const BASELINE_POLICY_RELEASE = Object.freeze({
  schemaVersion: POLICY_RELEASE_SCHEMA_VERSION,
  releaseId: "mindpulse-safety-core-2026.08.04.1",
  packageId: POLICY_PACKAGE.id,
  version: POLICY_PACKAGE.version,
  hash: POLICY_PACKAGE_HASH,
  goldenCaseSet: "policy-sdk-golden-v1",
  approvedBy: "local-review-pending",
  approvedAt: null,
  approvalNote: "Local baseline only; not a clinical or production approval.",
  status: "review"
});

export function validatePolicyRelease(release) {
  if (!release || typeof release !== "object") return { valid: false, errors: ["release is required"] };
  const errors = [];
  if (release.schemaVersion !== POLICY_RELEASE_SCHEMA_VERSION) errors.push("schemaVersion mismatch");
  if (!String(release.releaseId || "").trim()) errors.push("releaseId is required");
  if (release.packageId !== POLICY_PACKAGE.id) errors.push("packageId mismatch");
  if (release.version !== POLICY_PACKAGE.version) errors.push("version mismatch");
  if (release.hash !== POLICY_PACKAGE_HASH) errors.push("hash mismatch");
  if (!String(release.goldenCaseSet || "").trim()) errors.push("goldenCaseSet is required");
  if (!['review', 'approved', 'superseded', 'rolled-back'].includes(release.status)) errors.push("invalid status");
  if (release.status === "approved" && (!String(release.approvedBy || "").trim() || !String(release.approvedAt || "").trim())) errors.push("approved release requires approver and timestamp");
  return { valid: errors.length === 0, errors };
}

export function approvePolicyRelease(release, approval) {
  const candidate = {
    ...release,
    approvedBy: String(approval?.approvedBy || "").trim(),
    approvedAt: String(approval?.approvedAt || "").trim(),
    approvalNote: String(approval?.approvalNote || "").trim(),
    status: "approved"
  };
  const validation = validatePolicyRelease(candidate);
  if (!validation.valid) throw new Error(`POLICY_RELEASE_INVALID: ${validation.errors.join(", ")}`);
  return candidate;
}

export function replayGoldenCases(cases = [], evaluator = evaluatePolicyCore) {
  return cases.map((item) => ({
    id: item.id || item.name,
    name: item.name || item.id,
    decision: evaluator(item.records || [], item.currentText || "", item.options || {})
  }));
}

export function diffPolicyReplays(previous = [], next = []) {
  const before = new Map(previous.map((item) => [item.id, item.decision]));
  return next.map((item) => {
    const prior = before.get(item.id);
    const changed = JSON.stringify(prior) !== JSON.stringify(item.decision);
    return { id: item.id, changed, previous: prior || null, next: item.decision };
  });
}

export function rollbackPolicyRelease(history = [], releaseId) {
  const target = history.find((release) => release.releaseId === releaseId);
  if (!target || target.status !== "approved") throw new Error("POLICY_ROLLBACK_TARGET_INVALID");
  return { ...target, status: "rolled-back", rolledBackAt: new Date().toISOString() };
}

export function readPolicyReleaseHistory(storage) {
  if (!storage?.getItem) return [];
  try {
    const parsed = JSON.parse(storage.getItem(POLICY_RELEASE_HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((entry) => validatePolicyRelease(entry.release).valid) : [];
  } catch {
    return [];
  }
}

export function writePolicyReviewSnapshot(storage, release, replay, reviewedAt = new Date().toISOString()) {
  if (!storage?.setItem) throw new Error("POLICY_HISTORY_STORAGE_REQUIRED");
  const validation = validatePolicyRelease(release);
  if (!validation.valid) throw new Error(`POLICY_RELEASE_INVALID: ${validation.errors.join(", ")}`);
  const snapshot = {
    release,
    reviewedAt: String(reviewedAt),
    replaySummary: {
      caseCount: Array.isArray(replay) ? replay.length : 0,
      decisionIds: Array.isArray(replay) ? replay.map((item) => item.id) : []
    },
    replay: Array.isArray(replay) ? replay.map((item) => ({ id: item.id, name: item.name, decision: item.decision })) : []
  };
  const history = readPolicyReleaseHistory(storage).filter((entry) => entry.release.releaseId !== release.releaseId);
  const next = [...history, snapshot].slice(-20);
  storage.setItem(POLICY_RELEASE_HISTORY_KEY, JSON.stringify(next));
  return next;
}
