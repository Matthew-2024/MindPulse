import "../security/risk-gate.js";
import { calculatePersonalBaseline, personalizeRecommendation } from "../rules/personalization.js";
import { recommendPath } from "../rules/recommendation.js";
import { calculateRecoveryScore } from "../rules/recovery-score.js";
import { assessRisk } from "../rules/risk-assessment.js";
import { dataCompletenessOf, signalSourceOf } from "../rules/signals.js";
import { policyNotesFor, policyReferencesFor } from "./policy-basis";
import type {
  BaselineResult,
  DecisionTrace,
  InterventionEvent,
  MindPulseDecision,
  MindPulseRecord,
  RecommendationPlan,
  ReasonCode,
  RiskStrategy,
  ScoreResult,
  SafetyHold
} from "./types";

const ORDINARY_ACTIONS = [
  "breathe",
  "walk",
  "journal",
  "sleep",
  "focus",
  "friend",
  "self_check",
  "ordinary_intervention"
];

function isHighRisk(risk: RiskStrategy) {
  return risk.riskCode === "high" || risk.mode === "help" || risk.level === "高风险";
}

function isInsufficient(risk: RiskStrategy) {
  return risk.riskCode === "insufficient" || risk.mode === "ask" || risk.level === "数据不足";
}

function sourceLabel(record: MindPulseRecord) {
  const completeness = dataCompletenessOf(record);
  const sources = Object.values(completeness.sources || {}).filter(Boolean);
  if (record.dataMode === "synthetic-demo") return "示例记录";
  if (record.dataMode === "real-trial") return "匿名记录";
  if (record.dataMode === "public-reference") return "公开资料";
  if (!sources.length) return "暂无可用来源";
  if (sources.every((source) => source === "device")) return "设备数据";
  if (sources.every((source) => source === "manual" || source === "self-report")) return "自我记录";
  return "混合来源";
}

function userFacingEvidence(evidence: string[]) {
  return evidence.map((item) => {
    if (item.startsWith("pattern:") || item.startsWith("Safety Gate:")) return "文字里出现了需要优先关注的内容";
    if (item.startsWith("safety-hold:")) return "之前的求助提醒还在";
    return item;
  });
}

function reasonCodesFor(risk: RiskStrategy, baseline: BaselineResult): ReasonCode[] {
  if (isHighRisk(risk)) {
    if (risk.evidence.some((item) => item.startsWith("safety-hold:"))) return ["SAFETY_HOLD"];
    return risk.evidence.some((item) => item.startsWith("pattern:") || item.includes("需要优先求助") || item.includes("需要关注"))
      ? ["TEXT_CRISIS_SIGNAL"]
      : ["BASELINE_DEVIATION"];
  }
  if (isInsufficient(risk)) return ["DATA_INSUFFICIENT"];
  if (risk.riskCode === "medium") {
    const codes: ReasonCode[] = [];
    if (risk.evidence.some((item) => item.includes("睡眠"))) codes.push("LOW_SLEEP_REPEATED");
    if (risk.evidence.some((item) => item.includes("负向"))) codes.push("NEGATIVE_MOOD_REPEATED");
    if (baseline.flags.length) codes.push("BASELINE_DEVIATION");
    return codes.length ? codes : ["LOW_CONNECTION_REPEATED"];
  }
  if (risk.riskCode === "normal") return ["SINGLE_WAVE"];
  return ["STABLE_BASELINE"];
}

function stableDecisionId(policyVersion: string, records: MindPulseRecord[], risk: RiskStrategy) {
  const latest = records.at(-1) || {};
  const seed = [
    policyVersion,
    latest.id || latest.createdAt || "empty",
    risk.riskCode,
    risk.mode,
    risk.evidence?.join("|") || "none"
  ].join("::");
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `decision-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function enforceSafetyPolicy(risk: RiskStrategy, recommendation: RecommendationPlan) {
  if (isHighRisk(risk)) {
    const safeRisk = {
      ...risk,
      mode: "help" as const,
      riskCode: "high",
      allowedActions: ["help"],
      blockedActions: Array.from(new Set([...ORDINARY_ACTIONS, ...(risk.blockedActions || [])])),
      shouldRecommendSelfHelp: false,
      policyVersion: risk.policyVersion || "strategy-v1"
    };
    return {
      risk: safeRisk,
      recommendation: {
        ...recommendation,
        path: ["help"],
        mode: "help" as const,
        riskCode: "high",
        allowedActions: ["help"],
        blockedActions: safeRisk.blockedActions,
        explanation: safeRisk.explanation
      }
    };
  }

  if (isInsufficient(risk)) {
    const safeRisk = {
      ...risk,
      mode: "ask" as const,
      riskCode: "insufficient",
      allowedActions: ["checkin", "ask"],
      blockedActions: Array.from(new Set(["ordinary_intervention", "self_check", ...(risk.blockedActions || [])])),
      shouldRecommendSelfHelp: false,
      policyVersion: risk.policyVersion || "strategy-v1"
    };
    return {
      risk: safeRisk,
      recommendation: {
        ...recommendation,
        path: ["ask"],
        mode: "ask" as const,
        riskCode: "insufficient",
        allowedActions: safeRisk.allowedActions,
        blockedActions: safeRisk.blockedActions,
        explanation: safeRisk.explanation
      }
    };
  }

  return { risk, recommendation };
}

function applySafetyHold(risk: RiskStrategy, safetyHold: SafetyHold | null) {
  if (!safetyHold?.active || isHighRisk(risk)) return risk;
  return {
    ...risk,
    riskCode: "high",
    risk: "高风险",
    level: "高风险",
    mode: "help" as const,
    tag: "求助提醒还在",
    reason: "之前的记录提示需要先求助，请先联系一个真实的人，再重新记录现在的状态。",
    desc: "在你联系支持并重新记录前，普通建议会先暂停。",
    evidence: [...(risk.evidence || []), `safety-hold: ${safetyHold.triggerReason}`],
    explanation: "之前的记录提示需要先求助；在重新记录前，普通建议会先暂停。",
    allowedActions: ["help"],
    blockedActions: Array.from(new Set([...ORDINARY_ACTIONS, ...(risk.blockedActions || [])])),
    shouldRecommendSelfHelp: false,
    policyVersion: risk.policyVersion || "strategy-v1"
  } as RiskStrategy;
}

export function canStartAction(actionId: string, risk: RiskStrategy) {
  if (typeof window !== "undefined" && window.MindPulseRiskGate?.canStartAction) {
    return window.MindPulseRiskGate.canStartAction(actionId, risk);
  }
  if (isHighRisk(risk)) return actionId === "help";
  if (isInsufficient(risk)) return actionId === "checkin" || actionId === "ask";
  return !(risk.blockedActions || []).includes(actionId);
}

export function canEnterCompanion(risk: RiskStrategy) {
  return !isHighRisk(risk) && !isInsufficient(risk) && risk.mode === "action";
}

export function evaluateState(
  records: MindPulseRecord[] = [],
  currentText = "",
  interventionEvents: InterventionEvent[] = [],
  interventionStats: Record<string, unknown> = {},
  safetyHold: SafetyHold | null = null
): MindPulseDecision {
  const safeRecords = Array.isArray(records) ? records : [];
  const latest = safeRecords.at(-1) || {};
  const baseline = calculatePersonalBaseline(safeRecords) as unknown as BaselineResult;
  const risk = applySafetyHold(assessRisk(safeRecords, currentText) as RiskStrategy, safetyHold);
  const score = calculateRecoveryScore(latest, latest.completedInterventions || []) as ScoreResult;
  const baseRecommendation = recommendPath(latest, risk) as RecommendationPlan;
  let personalizedPath = isHighRisk(risk) || isInsufficient(risk)
    ? baseRecommendation.path
    : personalizeRecommendation(baseRecommendation.path, interventionStats, interventionEvents);
  if (risk.riskCode === "medium" && !personalizedPath.includes("friend")) {
    personalizedPath = ["friend", ...personalizedPath].slice(0, 3);
  }
  const recommendation = {
    ...baseRecommendation,
    path: personalizedPath
  } as RecommendationPlan;
  const safe = enforceSafetyPolicy(risk, recommendation);
  const completeness = dataCompletenessOf(latest);
  const trace: DecisionTrace = {
    decisionId: stableDecisionId(safe.risk.policyVersion || "strategy-v1", safeRecords, safe.risk),
    evaluatedAt: new Date().toISOString(),
    reasonCodes: reasonCodesFor(safe.risk, baseline),
    mode: safe.risk.mode,
    riskCode: safe.risk.riskCode,
    allowedActions: safe.risk.allowedActions || [],
    blockedActions: safe.risk.blockedActions || [],
    evidence: userFacingEvidence(safe.risk.evidence || []),
    explanation: safe.risk.explanation || safe.risk.reason,
    policyVersion: safe.risk.policyVersion || "strategy-v1",
    dataSource: sourceLabel(latest),
    confidence: safe.risk.confidence || baseline.confidence || (completeness.ratio >= 0.75 ? "medium" : "low"),
    policyReferences: policyReferencesFor(safe.risk.mode),
    policyNotes: policyNotesFor(safe.risk.mode)
  };

  return {
    score,
    baseline,
    risk: safe.risk,
    recommendation: safe.recommendation,
    trace
  };
}

export { isHighRisk, isInsufficient, ORDINARY_ACTIONS, signalSourceOf };
