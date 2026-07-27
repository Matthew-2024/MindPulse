import {
  SCORE_LIMITS,
  SIGNAL_KEYS,
  SIGNAL_LABELS,
  clamp,
  dataCompletenessOf,
  signalPresent,
  signalValueOf
} from "./signals.js";

const COMPONENTS = [
  { key: "mood", max: SCORE_LIMITS.mood },
  { key: "sleep", max: SCORE_LIMITS.sleep },
  { key: "steps", max: SCORE_LIMITS.steps },
  { key: "social", max: SCORE_LIMITS.social }
];

function componentValue(key, value) {
  if (key === "mood") return clamp(Math.round(Number(value) * 12), 0, SCORE_LIMITS.mood);
  if (key === "sleep") return clamp(Math.round((Number(value) / 8) * SCORE_LIMITS.sleep), 0, SCORE_LIMITS.sleep);
  if (key === "steps") return clamp(Math.round((Number(value) / 8000) * SCORE_LIMITS.steps), 0, SCORE_LIMITS.steps);
  if (key === "social") return clamp(Math.round((Number(value) / 100) * SCORE_LIMITS.social), 0, SCORE_LIMITS.social);
  return 0;
}

function confidenceFor(ratio) {
  if (ratio >= 0.9) return "high";
  if (ratio >= 0.6) return "medium";
  return "low";
}

export function calculateRecoveryScore(record = {}, completedInterventions = []) {
  const safeRecord = record || {};
  const completed = Array.isArray(completedInterventions)
    ? completedInterventions.length
    : (Array.isArray(safeRecord.completedInterventions) ? safeRecord.completedInterventions.length : 0);
  const data = dataCompletenessOf(safeRecord);
  const breakdown = {
    mood: 0,
    sleep: 0,
    steps: 0,
    social: 0,
    intervention: completed > 0 ? SCORE_LIMITS.intervention : 0
  };
  const contributions = [];
  let availableMax = 0;
  let availableCoreCount = 0;

  for (const component of COMPONENTS) {
    const { key, max } = component;
    const present = signalPresent(safeRecord, key);
    const value = present ? signalValueOf(safeRecord, key) : null;
    const score = present ? componentValue(key, value) : 0;
    breakdown[key] = score;
    if (present) {
      availableCoreCount += 1;
      availableMax += max;
    }
    contributions.push({
      signal: key,
      label: SIGNAL_LABELS[key],
      value,
      score,
      max,
      present,
      source: data.sources[key],
      reason: present
        ? `${SIGNAL_LABELS[key]}已经算进这次记录`
        : `${SIGNAL_LABELS[key]}还没填，不会按 0 分计算`
    });
  }

  if (availableCoreCount > 0) {
    availableMax += SCORE_LIMITS.intervention;
    contributions.push({
      signal: "intervention",
      label: "行动反馈",
      value: completed,
      score: breakdown.intervention,
      max: SCORE_LIMITS.intervention,
      present: true,
      source: "local-event",
      reason: completed > 0 ? `已经完成 ${completed} 个小行动` : "还没有完成小行动"
    });
  }

  const rawTotal = contributions.reduce((sum, item) => sum + (item.present ? item.score : 0), 0);
  const total = availableMax && availableCoreCount > 0
    ? clamp(Math.round((rawTotal / availableMax) * 100), 0, 100)
    : 0;
  const normalizedContributions = contributions.map((item) => ({
    ...item,
    share: item.present && availableMax ? Math.round((item.score / availableMax) * 100) : 0
  }));
  const missingText = data.missing.length ? `还没填：${data.missing.map((key) => SIGNAL_LABELS[key]).join("、")}。` : "主要记录都填好了。";
  const usedText = data.available ? `这次参考了 ${data.available}/${data.required} 项记录。` : "现在还没有足够的记录。";

  return {
    total,
    breakdown,
    contributions: normalizedContributions,
    dataCompleteness: data,
    missingSignals: data.missing,
    confidence: confidenceFor(data.ratio),
    availableMax,
    explanation: `${usedText}${missingText}没填的项目不会被当成 0 分。`
  };
}

export function explainRecoveryScore(scoreResult) {
  const b = scoreResult.breakdown || {};
  const missing = scoreResult.missingSignals || [];
  const suffix = missing.length ? ` 缺失信号未按 0 分计入：${missing.join("、")}。` : "";
  return `这次状态分 ${scoreResult.total}：情绪 ${b.mood || 0}、睡眠 ${b.sleep || 0}、活动 ${b.steps || 0}、连接 ${b.social || 0}、行动 ${b.intervention || 0}。${suffix}`;
}

export { COMPONENTS };
