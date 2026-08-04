import "../security/risk-gate.js";
import { calculatePersonalBaseline, personalizeRecommendation } from "../rules/personalization.js";
import { recommendPath } from "../rules/recommendation.js";
import { calculateRecoveryScore } from "../rules/recovery-score.js";
import { assessRisk } from "../rules/risk-assessment.js";
import { POLICY_PACKAGE } from "../rules/policy-sdk.js";
import { dataCompletenessOf, SIGNAL_LABELS, signalSourceOf } from "../rules/signals.js";
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

export interface EvaluationOptions {
  includeHistoricalCrisis?: boolean;
  historyAfter?: string;
  now?: string | number;
}

const ORDINARY_ACTIONS = [
  "breathe",
  "walk",
  "journal",
  "sleep",
  "focus",
  "friend",
  "self_check",
  "ordinary_intervention",
  "companion",
  "bottle"
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

function traceEvidenceFor(risk: RiskStrategy, baseline: BaselineResult) {
  const missing = baseline.dataCompleteness.missing.map((key) => SIGNAL_LABELS[key] || key);
  const additions = [
    missing.length ? "当前记录中有 " + missing.length + " 项信号缺失：" + missing.join("、") : "",
    ...baseline.flags
  ].filter(Boolean);
  return Array.from(new Set([...additions, ...userFacingEvidence(risk.evidence || [])]));
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
  const codes: ReasonCode[] = [];
  if (baseline.flags.length) codes.push("BASELINE_DEVIATION");
  if (risk.riskCode === "normal") codes.push("SINGLE_WAVE");
  if (risk.riskCode === "stable" && !codes.length) codes.push("STABLE_BASELINE");
  return codes.length ? codes : ["STABLE_BASELINE"];
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
      allowedActions: ["checkin"],
      blockedActions: Array.from(new Set([...ORDINARY_ACTIONS, "help", ...(risk.blockedActions || [])])),
      shouldRecommendSelfHelp: false,
      policyVersion: risk.policyVersion || "strategy-v1"
    };
    return {
      risk: safeRisk,
      recommendation: {
        ...recommendation,
        path: ["checkin"],
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

function applyBaselineDataGate(risk: RiskStrategy, baseline: BaselineResult) {
  if (isHighRisk(risk) || isInsufficient(risk) || risk.riskCode === "medium" || baseline.baselineReady) return risk;
  const historyMessage = baseline.historyRecords
    ? "目前只有 " + baseline.historyRecords + " 条过往记录，个人基线还在建立"
    : "还没有过往记录，个人基线尚未建立";
  return {
    ...risk,
    riskCode: "insufficient",
    risk: "数据不足",
    level: "数据不足",
    mode: "ask" as const,
    tag: "先建立个人基线",
    reason: "个人基线尚未建立，请先补充一条记录。",
    desc: "在个人基线建立前，心晴不会给出普通行动建议或具体状态分数。",
    evidence: [historyMessage, ...(risk.evidence || [])],
    explanation: "个人基线尚未建立；先补充记录，再比较你和自己平时的节奏。",
    allowedActions: ["checkin"],
    blockedActions: Array.from(new Set([...ORDINARY_ACTIONS, "help", ...(risk.blockedActions || [])])),
    shouldRecommendSelfHelp: false,
    dataCompleteness: baseline.dataCompleteness,
    baselineStatus: "cold_start",
    confidence: baseline.confidence,
    policyVersion: risk.policyVersion || "strategy-v1"
  } as RiskStrategy;
}

function applyBaselineThresholds(risk: RiskStrategy, baseline: BaselineResult, latest: MindPulseRecord) {
  if (latest.dataMode === "synthetic-demo" || isHighRisk(risk) || isInsufficient(risk) || risk.riskCode === "medium" || !baseline.baselineReady || baseline.flags.length < 2) return risk;
  return {
    ...risk,
    riskCode: "medium",
    risk: "中度关注",
    level: "中度关注",
    tag: "多项节奏偏离",
    reason: "多项当前信号同时偏离你的个人基线，先把支持和低负担行动放在前面。",
    desc: "个人基线的多项偏离会触发中度关注；它不覆盖危机文本或绝对安全阈值。",
    evidence: [...(risk.evidence || []), ...baseline.flags],
    shouldRecommendSelfHelp: true,
    policyVersion: risk.policyVersion || "strategy-v1"
  } as RiskStrategy;
}

function applySafetyHold(risk: RiskStrategy, safetyHold: SafetyHold | null, now: number) {
  const expiresAt = safetyHold?.expiresAt ? new Date(safetyHold.expiresAt).getTime() : Number.POSITIVE_INFINITY;
  const holdExpired = safetyHold?.active === true && Number.isFinite(expiresAt) && expiresAt <= now;
  if (!safetyHold?.active || holdExpired || isHighRisk(risk)) return risk;
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
  if (isInsufficient(risk)) return actionId === "checkin";
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
  safetyHold: SafetyHold | null = null,
  options: EvaluationOptions = {}
): MindPulseDecision {
  const safeRecords = Array.isArray(records) ? records : [];
  const latest = safeRecords.at(-1) || {};
  const now = new Date(options.now ?? Date.now()).getTime();
  const historyAfter = options.historyAfter || (!safetyHold?.active ? safetyHold?.releasedAt : undefined);
  const baseline = calculatePersonalBaseline(safeRecords) as unknown as BaselineResult;
  const assessedRisk = assessRisk(safeRecords, currentText, {
    includeHistoricalCrisis: options.includeHistoricalCrisis,
    historyAfter,
    now
  }) as RiskStrategy;
  const risk = applySafetyHold(applyBaselineDataGate(applyBaselineThresholds(assessedRisk, baseline, latest), baseline), safetyHold, now);
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
    evaluatedAt: new Date(now).toISOString(),
    reasonCodes: reasonCodesFor(safe.risk, baseline),
    mode: safe.risk.mode,
    riskCode: safe.risk.riskCode,
    allowedActions: safe.risk.allowedActions || [],
    blockedActions: safe.risk.blockedActions || [],
    evidence: traceEvidenceFor(safe.risk, baseline),
    explanation: safe.risk.explanation || safe.risk.reason,
    policyVersion: POLICY_PACKAGE.version,
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
