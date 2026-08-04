import {
  MOOD_LEVELS,
  SCORE_LIMITS,
  SIGNAL_KEYS,
  SIGNAL_LABELS,
  clamp,
  dataCompletenessOf,
  moodOf,
  signalPresent,
  signalValueOf,
  sleepOf,
  socialOf,
  stepsOf
} from "./signals.js";

export function calculateRecoveryScore(record, completedInterventions = []) {
  record = record || {};
  const moodKey = moodOf(record);
  const moodLevel = MOOD_LEVELS[moodKey] || 3;
  const sleepHours = sleepOf(record);
  const steps = stepsOf(record);
  const socialScore = socialOf(record);
  const completed = completedInterventions.length ||
    (Array.isArray(record.completedInterventions) ? record.completedInterventions.length : 0);

  const breakdown = {
    mood: clamp(moodLevel * 12, 0, SCORE_LIMITS.mood),
    sleep: clamp(Math.round((sleepHours / 8) * SCORE_LIMITS.sleep), 0, SCORE_LIMITS.sleep),
    steps: clamp(Math.round((steps / 8000) * SCORE_LIMITS.steps), 0, SCORE_LIMITS.steps),
    social: clamp(Math.round((socialScore / 100) * SCORE_LIMITS.social), 0, SCORE_LIMITS.social),
    intervention: completed > 0 ? SCORE_LIMITS.intervention : 0
  };

  const total = clamp(
    breakdown.mood + breakdown.sleep + breakdown.steps + breakdown.social + breakdown.intervention,
    0,
    100
  );

  const dataCompleteness = dataCompletenessOf(record);
  const presentSignals = SIGNAL_KEYS.filter((key) => signalPresent(record, key));
  const referenceRawTotal = presentSignals.reduce((sum, key) => sum + breakdown[key], 0);
  const referenceMax = presentSignals.reduce((sum, key) => sum + SCORE_LIMITS[key], 0);
  const referenceScore = referenceMax ? Math.round((referenceRawTotal / referenceMax) * 100) : null;
  const contributions = SIGNAL_KEYS.map((key) => ({
    signal: key,
    label: SIGNAL_LABELS[key],
    value: signalPresent(record, key) ? signalValueOf(record, key) : null,
    score: breakdown[key],
    max: SCORE_LIMITS[key],
    present: signalPresent(record, key),
    source: dataCompleteness.sources[key],
    reason: signalPresent(record, key)
      ? `${SIGNAL_LABELS[key]}已经算进这次记录`
      : `${SIGNAL_LABELS[key]}还没填`
  }));

  return {
    total,
    referenceScore,
    referenceRawTotal,
    referenceMax,
    referenceSignalCount: presentSignals.length,
    referenceSignalRequired: SIGNAL_KEYS.length,
    breakdown,
    contributions,
    dataCompleteness,
    missingSignals: dataCompleteness.missing,
    confidence: dataCompleteness.ratio >= 0.75 ? "medium" : "low",
    availableMax: 100,
    explanation:
      `情绪 ${breakdown.mood} 分、睡眠 ${breakdown.sleep} 分、步数 ${breakdown.steps} 分、` +
      `社交 ${breakdown.social} 分、干预 ${breakdown.intervention} 分，合成当前恢复指数。没填的项目不会被当成 0 分。`
  };
}

export function explainRecoveryScore(scoreResult) {
  const b = scoreResult.breakdown;
  return `恢复指数 ${scoreResult.total}：情绪 ${b.mood}、睡眠 ${b.sleep}、步数 ${b.steps}、社交 ${b.social}、干预 ${b.intervention}。`;
}
