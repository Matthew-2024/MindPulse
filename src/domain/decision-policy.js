import { evaluatePolicyCore, POLICY_PACKAGE } from "../rules/policy-sdk.js";

const MODE_BY_RISK = Object.freeze({
  high: "HIGH_RISK",
  insufficient: "DATA_INSUFFICIENT",
  medium: "MODERATE",
  normal: "NORMAL",
  stable: "STABLE"
});

const REASON_BY_RISK = Object.freeze({
  high: "TEXT_CRISIS_SIGNAL",
  insufficient: "DATA_INSUFFICIENT",
  medium: "LOW_SLEEP_REPEATED",
  normal: "SINGLE_WAVE",
  stable: "STABLE_BASELINE"
});

function traceId(core, options) {
  const seed = [core.policyHash, options?.now || "", core.riskCode, core.path.join("|")].join("::");
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `decision_${(hash >>> 0).toString(36)}`;
}

function evaluateState(records, options = {}) {
  const core = evaluatePolicyCore(records, "", { now: options.now });
  const mode = MODE_BY_RISK[core.riskCode] || "NORMAL";
  const allowedActions = core.riskCode === "high" ? ["help"] : core.riskCode === "insufficient" ? ["checkin"] : core.allowedActions;
  return {
    decisionId: traceId(core, options),
    evaluatedAt: String(options.now || new Date().toISOString()).trim(),
    reasonCodes: [REASON_BY_RISK[core.riskCode] || "STABLE_BASELINE"],
    mode,
    riskCode: core.riskCode,
    allowedActions,
    blockedActions: core.blockedActions,
    evidence: core.riskCode === "high" ? ["危机文本信号", ...core.evidence] : core.evidence,
    policyVersion: core.policyVersion,
    policyHash: core.policyHash,
    dataSource: options.source || "self-report",
    confidence: Array.isArray(records) && records.length >= 5 ? "高" : Array.isArray(records) && records.length >= 2 ? "中" : "低"
  };
}

function assertActionAllowed(trace, action) {
  if (!trace?.allowedActions?.includes(action)) throw new Error(`SAFETY_GATE_BLOCKED: ${action}`);
  return true;
}

function strategyLabel(trace) {
  if (!trace || trace.mode === "DATA_INSUFFICIENT") return "补充一条记录";
  if (trace.mode === "HIGH_RISK") return "只允许求助";
  if (trace.mode === "MODERATE") return "连接一个可信任的人";
  return "允许低负担行动";
}

globalThis.MindPulseDecisionPolicy = Object.freeze({
  POLICY_VERSION: POLICY_PACKAGE.version,
  evaluateState,
  assertActionAllowed,
  strategyLabel
});
