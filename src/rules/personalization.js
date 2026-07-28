import { moodLevelOf, normalizeRecords, sleepOf, socialOf, stepsOf, unique } from "./signals.js";

export const PERSONALIZATION_MIN_SAFE_FEEDBACK = 3;

function avg(records, selector, fallback) {
  if (!records.length) return fallback;
  return records.reduce((sum, record) => sum + selector(record), 0) / records.length;
}

function percentDelta(current, baseline) {
  if (!baseline) return 0;
  return Math.round(((current - baseline) / baseline) * 100);
}

export function calculatePersonalBaseline(records) {
  const safeRecords = normalizeRecords(records);
  const latest = safeRecords[safeRecords.length - 1] || {};
  let history = safeRecords.slice(0, -1).slice(-6);
  if (!history.length) history = safeRecords.slice(0, -1);

  const base = {
    days: history.length,
    mood: avg(history, moodLevelOf, moodLevelOf(latest)),
    sleep: avg(history, sleepOf, sleepOf(latest)),
    steps: avg(history, stepsOf, stepsOf(latest)),
    social: avg(history, socialOf, socialOf(latest))
  };

  const current = {
    mood: moodLevelOf(latest),
    sleep: sleepOf(latest),
    steps: stepsOf(latest),
    social: socialOf(latest)
  };

  const delta = {
    mood: +(current.mood - base.mood).toFixed(1),
    sleepPct: percentDelta(current.sleep, base.sleep),
    stepsPct: percentDelta(current.steps, base.steps),
    social: +(current.social - base.social).toFixed(0)
  };

  const flags = [];
  if (delta.sleepPct <= -25) flags.push(`睡眠低于个人基线 ${Math.abs(delta.sleepPct)}%`);
  if (delta.stepsPct <= -40) flags.push(`活动低于个人基线 ${Math.abs(delta.stepsPct)}%`);
  if (delta.social <= -20) flags.push(`连接感低于个人基线 ${Math.abs(delta.social)} 点`);
  if (delta.mood <= -1) flags.push(`情绪低于个人基线 ${Math.abs(delta.mood).toFixed(1)} 级`);

  const level = flags.length >= 2 ? "明显偏离" : flags.length === 1 ? "轻度偏离" : "接近基线";
  return {
    base,
    delta,
    flags,
    level,
    title: level === "接近基线"
      ? "今天接近自己的正常节奏"
      : (level === "轻度偏离" ? "今天有一个信号偏离基线" : "今天多个信号偏离个人基线"),
    desc: flags.length
      ? `${flags.join("；")}。这是按个人历史节奏判断，不是和别人比较。`
      : "睡眠、活动和连接感没有明显低于你的近几天基线。"
  };
}

export function personalizeRecommendation(path, interventionStats = {}) {
  const status = personalizationStatus(interventionStats);
  if (!status.formed) return unique(path);
  return unique(path)
    .map((id, index) => {
      const stat = interventionStats[id];
      const avgDelta = stat?.count ? Math.round(stat.totalDelta / stat.count) : 0;
      const boost = stat ? Math.min(2.4, stat.count * 0.35) + Math.max(0, avgDelta) / 8 : 0;
      return { id, score: index - boost, avgDelta, count: stat?.count || 0 };
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
  if (feedback.riskMode === "HIGH_RISK" || feedback.riskLevel === "高风险") {
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
