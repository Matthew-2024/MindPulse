import { assessRisk } from "./risk-assessment.js";
import { recommendPath } from "./recommendation.js";

export const POLICY_PACKAGE = Object.freeze({
  id: "mindpulse-safety-core",
  version: "2026.08.04.1",
  schemaVersion: 1,
  sourceModules: ["signals", "risk-assessment", "recommendation"]
});

function hash(value) {
  let valueHash = 2166136261;
  for (const character of value) {
    valueHash ^= character.charCodeAt(0);
    valueHash = Math.imul(valueHash, 16777619);
  }
  return `fnv1a-${(valueHash >>> 0).toString(16).padStart(8, "0")}`;
}

export const POLICY_PACKAGE_HASH = hash(JSON.stringify(POLICY_PACKAGE));

export function evaluatePolicyCore(records = [], currentText = "", options = {}) {
  const safeRecords = Array.isArray(records) ? records : [];
  const latest = safeRecords.at(-1) || {};
  const risk = assessRisk(safeRecords, currentText, options);
  const recommendation = recommendPath(latest, risk);
  let path = risk.riskCode === "insufficient" ? ["checkin"] : recommendation.path;
  if (risk.riskCode === "medium" && !path.includes("friend")) path = ["friend", ...path].slice(0, 3);
  return {
    policyId: POLICY_PACKAGE.id,
    policyVersion: POLICY_PACKAGE.version,
    policyHash: POLICY_PACKAGE_HASH,
    riskCode: risk.riskCode,
    mode: risk.mode,
    allowedActions: risk.allowedActions || [],
    blockedActions: risk.blockedActions || [],
    path,
    evidence: risk.evidence || []
  };
}

export function evaluateIosPolicyCore(records = [], currentText = "", options = {}) {
  return evaluatePolicyCore(records, currentText, options);
}
