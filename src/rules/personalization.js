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
import { isEligibleFeedbackEvent } from "./intervention-feedback.js";

export const PERSONALIZATION_MIN_SAFE_FEEDBACK = 3;

function percentDelta(current, baseline) {
  if (current === null || baseline === null || baseline === 0) return null;
  return Math.round(((current - baseline) / baseline) * 100);
}

function average(values, fallback = null) {
  if (!values.length) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value, digits = 1) {
  return Number(Number(value).toFixed(digits));
}

function confidenceFor(historyRecords, dataCompleteness, baselineReady) {
  const historyScore = Math.min(1, historyRecords / 5);
  const readinessScore = baselineReady ? 1 : Math.min(0.75, historyRecords / 3);
  const score = round(historyScore * 0.55 + dataCompleteness.ratio * 0.3 + readinessScore * 0.15, 2);
  const confidence = score >= 0.75 ? "high" : score >= 0.45 ? "medium" : "low";
  return {
    score,
    confidence,
    text: confidence === "high" ? "较高" : confidence === "medium" ? "中等" : "较低"
  };
}

export function calculatePersonalBaseline(records) {
  const safeRecords = normalizeRecords(records);
  const latest = safeRecords[safeRecords.length - 1] || {};
  let history = safeRecords.slice(0, -1).slice(-6);
  if (!history.length) history = safeRecords.slice(0, -1);

  const dataCompleteness = dataCompletenessOf(latest);
  const signals = Object.fromEntries(SIGNAL_KEYS.map((key) => {
    const values = history
      .filter((record) => signalPresent(record, key))
      .map((record) => signalValueOf(record, key));
    const current = signalPresent(latest, key) ? signalValueOf(latest, key) : null;
    const baseline = average(values, current);
    const delta = current === null || baseline === null ? null : round(current - baseline, key === "steps" ? 0 : 1);
    const relativeDelta = percentDelta(current, baseline);
    const ready = values.length >= 2 && baseline !== null;
    return [key, {
      baseline,
      current,
      delta,
      relativeDelta,
      sampleCount: values.length,
      ready,
      present: current !== null,
      source: current === null ? "unknown" : signalSourceOf(latest, key),
      explanation: ready
        ? `${SIGNAL_LABELS[key]}基于 ${values.length} 次过往记录比较`
        : `${SIGNAL_LABELS[key]}还在建立个人基线`
    }];
  }));
  const readySignalCount = Object.values(signals).filter((signal) => signal.ready).length;
  const baselineReady = history.length >= 2 && readySignalCount >= 2;

  const base = {
    days: history.length,
    mood: average(history.filter((record) => signalPresent(record, "mood")).map((record) => signalValueOf(record, "mood")), signalValueOf(latest, "mood")),
    sleep: average(history.filter((record) => signalPresent(record, "sleep")).map((record) => signalValueOf(record, "sleep")), signalValueOf(latest, "sleep")),
    steps: average(history.filter((record) => signalPresent(record, "steps")).map((record) => signalValueOf(record, "steps")), signalValueOf(latest, "steps")),
    social: average(history.filter((record) => signalPresent(record, "social")).map((record) => signalValueOf(record, "social")), signalValueOf(latest, "social"))
  };

  const current = {
    mood: signals.mood.current,
    sleep: signals.sleep.current,
    steps: signals.steps.current,
    social: signals.social.current
  };

  const delta = {
    mood: current.mood === null || base.mood === null ? null : round(current.mood - base.mood, 1),
    sleepPct: percentDelta(current.sleep, base.sleep),
    stepsPct: percentDelta(current.steps, base.steps),
    social: current.social === null || base.social === null ? null : round(current.social - base.social, 0)
  };

  const flags = [];
  if (signals.sleep.ready && delta.sleepPct <= -25) flags.push(`睡眠低于个人基线 ${Math.abs(delta.sleepPct)}%`);
  if (signals.steps.ready && delta.stepsPct <= -40) flags.push(`活动低于个人基线 ${Math.abs(delta.stepsPct)}%`);
  if (signals.social.ready && delta.social <= -20) flags.push(`连接感低于个人基线 ${Math.abs(delta.social)} 点`);
  if (signals.mood.ready && delta.mood <= -1) flags.push(`情绪低于个人基线 ${Math.abs(delta.mood).toFixed(1)} 级`);

  const level = !baselineReady ? "数据不足" : flags.length >= 2 ? "明显偏离" : flags.length === 1 ? "轻度偏离" : "接近基线";
  const confidence = confidenceFor(history.length, dataCompleteness, baselineReady);
  return {
    base,
    delta,
    flags,
    level,
    title: level === "数据不足"
      ? "先记录几次，再建立你的平时节奏"
      : level === "接近基线"
        ? "今天接近自己的正常节奏"
        : (level === "轻度偏离" ? "今天有一个信号偏离基线" : "今天多个信号偏离个人基线"),
    desc: level === "数据不足"
      ? "现在的记录还不够比较个人基线，先补充几次，不给出假精确结论。"
      : flags.length
      ? `${flags.join("；")}。这是按个人历史节奏判断，不是和别人比较。`
      : "睡眠、活动和连接感没有明显低于你的近几天基线。",
    coldStart: safeRecords.length < 2,
    baselineReady,
    historyRecords: history.length,
    readySignalCount,
    confidence: confidence.confidence,
    confidenceText: confidence.text,
    confidenceScore: confidence.score,
    dataCompleteness,
    signals
  };
}

export function summarizeInterventionFeedback(events = [], interventionStats = {}) {
  const grouped = {};
  const safeEvents = Array.isArray(events) ? events : [];
  safeEvents.forEach((event) => {
    if (!isEligibleFeedbackEvent(event)) return;
    const actionId = String(event.interventionId || event.actionId || event.id || "").trim();
    if (!actionId || actionId === "help") return;
    if (event.riskMode === "HIGH_RISK" || event.riskLevel === "高风险" || event.riskCode === "high" || event.mode === "help") return;
    const current = grouped[actionId] || { count: 0, totalOutcome: 0 };
    const outcomeValue = event.outcome === "better" ? 1 : event.outcome === "worse" ? -1 : 0;
    current.count += 1;
    current.totalOutcome += outcomeValue;
    current.avgOutcome = Math.round(current.totalOutcome / current.count * 10) / 10;
    current.eligible = current.count >= PERSONALIZATION_MIN_SAFE_FEEDBACK;
    current.confidence = current.count >= 6 ? "high" : current.eligible ? "medium" : "low";
    current.confidenceText = current.count >= 6 ? "观察较稳定" : current.eligible ? "刚达到可比较样本" : "还在积累样本";
    grouped[actionId] = current;
  });
  if (!safeEvents.length) return interventionStats?.__meta?.learningSource === "subjective-outcome" ? interventionStats : {};
  return grouped;
}

export function personalizeRecommendation(path, interventionStats = {}, events = []) {
  const feedback = Array.isArray(events) && events.length
    ? summarizeInterventionFeedback(events, interventionStats)
    : interventionStats?.__meta?.learningSource === "subjective-outcome" ? interventionStats : {};
  const status = personalizationStatus(feedback);
  if (!status.formed) return unique(path);
  return unique(path)
    .map((id, index) => {
      const stat = feedback[id];
      const avgOutcome = stat?.avgOutcome ?? (stat?.count ? Number(stat.totalOutcome || 0) / stat.count : 0);
      const boost = stat?.eligible ? Math.min(2.4, stat.count * 0.35) + Math.max(0, avgOutcome) * 0.6 : 0;
      return { id, score: index - boost, avgOutcome, count: stat?.count || 0 };
    })
    .sort((a, b) => a.score - b.score)
    .map((item) => item.id);
}

export function personalizationStatus(stats = {}) {
  const safeFeedbackCount = Object.entries(stats).reduce((sum, [key, stat]) => {
    if (key === "__meta" || !stat || typeof stat !== "object") return sum;
    return sum + Math.max(0, Number(stat.safeCount ?? stat.count) || 0);
  }, 0);
  const eligibleActionCount = Object.entries(stats).reduce((sum, [key, stat]) => (
    key !== "__meta" && stat && typeof stat === "object" && Number(stat.safeCount ?? stat.count) >= PERSONALIZATION_MIN_SAFE_FEEDBACK
      ? sum + 1
      : sum
  ), 0);
  return {
    formed: eligibleActionCount > 0,
    safeFeedbackCount,
    required: PERSONALIZATION_MIN_SAFE_FEEDBACK,
    eligibleActionCount,
    excludedHighRisk: Math.max(0, Number(stats.__meta?.excludedHighRisk) || 0)
  };
}

export function recordSafeFeedback(stats = {}, feedback = {}) {
  const next = Object.fromEntries(Object.entries(stats).map(([key, value]) => [
    key,
    value && typeof value === "object" ? { ...value } : value
  ]));
  next.__meta = { ...(next.__meta || {}) };
  if (feedback.riskMode === "HIGH_RISK" || feedback.riskLevel === "高风险" || feedback.riskCode === "high" || feedback.mode === "help") {
    next.__meta.excludedHighRisk = (Number(next.__meta.excludedHighRisk) || 0) + 1;
    return next;
  }
  const actionId = String(feedback.actionId || "").trim();
  if (!actionId || !["better", "same", "worse"].includes(feedback.outcome)) return next;
  next.__meta.learningSource = "subjective-outcome";
  const current = next[actionId] && typeof next[actionId] === "object" ? next[actionId] : {};
  const count = Math.max(0, Number(current.safeCount ?? current.count) || 0) + 1;
  const outcomeValue = feedback.outcome === "better" ? 1 : feedback.outcome === "worse" ? -1 : 0;
  next[actionId] = {
    ...current,
    count,
    safeCount: count,
    eligible: count >= PERSONALIZATION_MIN_SAFE_FEEDBACK,
    totalOutcome: (Number(current.totalOutcome) || 0) + outcomeValue,
    lastOutcome: feedback.outcome,
    lastAt: feedback.outcomeRecordedAt || new Date().toISOString()
  };
  return next;
}
