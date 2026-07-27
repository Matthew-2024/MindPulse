import {
  SIGNAL_KEYS,
  SIGNAL_LABELS,
  dataCompletenessOf,
  normalizeRecords,
  signalPresent,
  signalSourceOf,
  signalValueOf,
  unique
} from "./signals.js";

export const PERSONALIZATION_MIN_SAFE_FEEDBACK = 3;

const BASELINE_WINDOW = 7;
const MIN_BASELINE_SAMPLES = 3;
const MIN_LEARNING_SAMPLES = 3;

function round(value, digits = 0) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(Number(value))).map(Number).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentDelta(current, baseline) {
  if (current === null || baseline === null || !baseline) return null;
  return round(((current - baseline) / baseline) * 100);
}

function confidenceLabel(score) {
  if (score >= 0.8) return "high";
  if (score >= 0.55) return "medium";
  return "low";
}

function confidenceText(label) {
  return label === "high" ? "较高" : label === "medium" ? "中等" : "较低";
}

function signalDescription(key, current, baseline, delta) {
  if (current === null) return `${SIGNAL_LABELS[key]}还没记录，不参与这次判断`;
  if (baseline === null) return `${SIGNAL_LABELS[key]}已经记录，我们还在了解你的平时状态`;
  if (key === "sleep" || key === "steps") {
    return `${SIGNAL_LABELS[key]}和你平时相比${delta >= 0 ? "多了" : "少了"} ${Math.abs(delta || 0)}%`;
  }
  return `${SIGNAL_LABELS[key]}和你平时相比${delta >= 0 ? "高了" : "低了"} ${Math.abs(delta || 0)}${key === "mood" ? "级" : "点"}`;
}

function emptyLearningRow(id) {
  return {
    id,
    count: 0,
    avgDelta: 0,
    weightedDelta: 0,
    eligible: false,
    status: "insufficient",
    explanation: "目前记录还不够，暂时看不出哪种做法更适合你"
  };
}

function isHighRiskEvent(event = {}) {
  return event.riskCode === "high" || event.mode === "help" || event.risk === "高风险" || event.level === "高风险";
}

function eventId(event = {}) {
  return event.interventionId || event.id || "";
}

function eventDelta(event = {}) {
  const delta = Number(event.delta);
  return Number.isFinite(delta) ? delta : null;
}

export function calculatePersonalBaseline(records) {
  const safeRecords = normalizeRecords(records);
  const latest = safeRecords[safeRecords.length - 1] || {};
  const history = safeRecords.slice(0, -1).slice(-BASELINE_WINDOW);
  const currentData = dataCompletenessOf(latest);
  const historySignals = {};
  const stats = {};
  let readySignalCount = 0;

  for (const key of SIGNAL_KEYS) {
    const validHistory = history.filter((record) => signalPresent(record, key));
    const current = signalPresent(latest, key) ? signalValueOf(latest, key) : null;
    const baseline = median(validHistory.map((record) => signalValueOf(record, key)));
    const ready = validHistory.length >= MIN_BASELINE_SAMPLES;
    if (ready) readySignalCount += 1;
    const delta = current === null || baseline === null ? null : round(current - baseline, key === "mood" ? 1 : 0);
    const relativeDelta = percentDelta(current, baseline);
    historySignals[key] = {
      baseline: round(baseline, key === "mood" || key === "sleep" ? 1 : 0),
      current: round(current, key === "mood" || key === "sleep" ? 1 : 0),
      delta,
      relativeDelta,
      sampleCount: validHistory.length,
      ready,
      present: current !== null,
      source: signalSourceOf(latest, key),
      explanation: signalDescription(key, current, baseline, relativeDelta ?? delta)
    };
    stats[key] = historySignals[key];
  }

  const historyCoverage = SIGNAL_KEYS.reduce((sum, key) => {
    return sum + Math.min(1, (stats[key].sampleCount || 0) / MIN_BASELINE_SAMPLES);
  }, 0) / SIGNAL_KEYS.length;
  const depthCoverage = Math.min(1, history.length / MIN_BASELINE_SAMPLES);
  const confidenceScore = round(currentData.ratio * 0.5 + historyCoverage * 0.3 + depthCoverage * 0.2, 2);
  const confidence = confidenceLabel(confidenceScore);
  const coldStart = history.length < MIN_BASELINE_SAMPLES;
  const baselineReady = !coldStart && readySignalCount > 0;

  const base = {
    days: history.length,
    mood: stats.mood.baseline,
    sleep: stats.sleep.baseline,
    steps: stats.steps.baseline,
    social: stats.social.baseline
  };
  const delta = {
    mood: stats.mood.delta,
    sleepPct: stats.sleep.relativeDelta,
    stepsPct: stats.steps.relativeDelta,
    social: stats.social.delta
  };

  const flags = [];
  if (baselineReady) {
    if (stats.sleep.relativeDelta !== null && stats.sleep.relativeDelta <= -25) {
      flags.push(`睡眠比平时少 ${Math.abs(stats.sleep.relativeDelta)}%`);
    }
    if (stats.steps.relativeDelta !== null && stats.steps.relativeDelta <= -40) {
      flags.push(`活动比平时少 ${Math.abs(stats.steps.relativeDelta)}%`);
    }
    if (stats.social.delta !== null && stats.social.delta <= -20) {
      flags.push(`和人联系的感觉比平时低 ${Math.abs(stats.social.delta)} 点`);
    }
    if (stats.mood.delta !== null && stats.mood.delta <= -1) {
      flags.push(`情绪比平时低 ${Math.abs(stats.mood.delta).toFixed(1)} 级`);
    }
  }

  const currentInsufficient = currentData.available < 2;
  const level = coldStart || currentInsufficient
    ? "数据不足"
    : flags.length >= 2
      ? "明显偏离"
      : flags.length === 1
        ? "轻度偏离"
        : "接近基线";
  const title = level === "数据不足"
    ? "还在了解你的平时状态"
    : level === "接近基线"
      ? "今天和自己平时差不多"
      : level === "轻度偏离"
        ? "今天有一项和往常不太一样"
        : "今天有几项和往常不太一样";
  const desc = level === "数据不足"
    ? `现在有 ${currentData.available}/${currentData.required} 项记录，过去至少需要 ${MIN_BASELINE_SAMPLES} 条记录；暂时还不能充分判断。`
    : flags.length
      ? `${flags.join("；")}。这是和你过去的记录比较，不是和别人比较。`
      : "现在没有明显低于你最近几次记录的地方。";

  return {
    base,
    delta,
    flags,
    level,
    title,
    desc,
    status: coldStart ? "cold_start" : currentInsufficient ? "insufficient" : "ready",
    coldStart,
    baselineReady,
    historyRecords: history.length,
    readySignalCount,
    confidence,
    confidenceText: confidenceText(confidence),
    confidenceScore,
    dataCompleteness: currentData,
    signals: stats
  };
}

export function summarizeInterventionFeedback(events = [], interventionStats = {}) {
  const grouped = {};
  const safeEvents = Array.isArray(events) ? events : [];
  safeEvents.forEach((event) => {
    const id = eventId(event);
    const delta = eventDelta(event);
    if (!id || id === "help" || delta === null || isHighRiskEvent(event) || event.eligibleForLearning === false) return;
    if (!grouped[id]) grouped[id] = [];
    grouped[id].push({ delta, event });
  });

  for (const [id, list] of Object.entries(grouped)) {
    let totalWeight = 0;
    let weightedSum = 0;
    list.forEach((item, index) => {
      const weight = 0.75 ** (list.length - index - 1);
      totalWeight += weight;
      weightedSum += item.delta * weight;
    });
    const count = list.length;
    const weightedDelta = totalWeight ? round(weightedSum / totalWeight, 1) : 0;
    grouped[id] = {
      id,
      count,
      avgDelta: round(list.reduce((sum, item) => sum + item.delta, 0) / count, 1),
      weightedDelta,
      eligible: count >= MIN_LEARNING_SAMPLES,
      status: count >= MIN_LEARNING_SAMPLES ? "ready" : "insufficient",
      explanation: count >= MIN_LEARNING_SAMPLES
        ? `根据你最近 ${count} 次相似记录，暂时看出一点规律；不代表因果或治疗效果`
        : "目前记录还不够，暂时看不出哪种做法更适合你"
    };
  }

  // 旧版只保存了汇总统计，无法证明其中没有高风险事件；只在没有事件明细时兼容读取。
  for (const [id, stat] of Object.entries(interventionStats || {})) {
    if (safeEvents.length) continue;
    if (grouped[id]) continue;
    const count = Number(stat?.count || 0);
    const totalDelta = Number(stat?.totalDelta || 0);
    if (!count) continue;
    const avgDelta = round(totalDelta / count, 1) || 0;
    grouped[id] = {
      id,
      count,
      avgDelta,
      weightedDelta: avgDelta,
      eligible: count >= MIN_LEARNING_SAMPLES,
      status: count >= MIN_LEARNING_SAMPLES ? "ready" : "insufficient",
      explanation: count >= MIN_LEARNING_SAMPLES
        ? `基于 ${count} 次同类反馈的个人倾向，不代表因果或治疗效果`
        : "样本不足，暂不形成个人倾向"
    };
  }

  return grouped;
}

export function personalizeRecommendation(path, interventionStats = {}, events = []) {
  const learning = summarizeInterventionFeedback(events, interventionStats);
  const status = personalizationStatus(interventionStats);
  if (!status.formed && !Object.values(learning).some((item) => item.eligible)) {
    return unique(path);
  }
  return unique(path)
    .map((id, index) => {
      const stat = learning[id] || emptyLearningRow(id);
      const boost = stat.eligible
        ? Math.min(2.4, stat.count * 0.35) + Math.max(0, stat.weightedDelta) / 8
        : 0;
      return {
        id,
        score: index - boost,
        avgDelta: stat.weightedDelta,
        count: stat.count,
        eligible: stat.eligible
      };
    })
    .sort((a, b) => a.score - b.score)
    .map((item) => item.id);
}

export function personalizationStatus(stats = {}) {
  const safeFeedbackCount = Object.entries(stats).reduce((sum, [key, stat]) => {
    if (key === "__meta" || !stat || typeof stat !== "object") return sum;
    return sum + Math.max(0, Number(stat.safeCount ?? stat.count) || 0);
  }, 0);
  return {
    formed: safeFeedbackCount >= PERSONALIZATION_MIN_SAFE_FEEDBACK,
    safeFeedbackCount,
    required: PERSONALIZATION_MIN_SAFE_FEEDBACK,
    excludedHighRisk: Math.max(0, Number(stats.__meta?.excludedHighRisk) || 0)
  };
}

export function recordSafeFeedback(stats = {}, feedback = {}) {
  const next = Object.fromEntries(Object.entries(stats).map(([key, value]) => [
    key,
    value && typeof value === "object" ? { ...value } : value
  ]));
  next.__meta = { ...(next.__meta || {}) };
  if (feedback.riskMode === "HIGH_RISK") {
    next.__meta.excludedHighRisk = (Number(next.__meta.excludedHighRisk) || 0) + 1;
    return next;
  }
  const actionId = String(feedback.actionId || "").trim();
  if (!actionId) return next;
  const current = next[actionId] && typeof next[actionId] === "object" ? next[actionId] : {};
  const count = Math.max(0, Number(current.safeCount ?? current.count) || 0) + 1;
  next[actionId] = {
    ...current,
    count,
    safeCount: count,
    totalDelta: (Number(current.totalDelta) || 0) + (Number(feedback.delta) || 0),
    lastDelta: Number(feedback.delta) || 0,
    lastAt: feedback.completedAt || new Date().toISOString()
  };
  return next;
}

export { MIN_BASELINE_SAMPLES, MIN_LEARNING_SAMPLES };
