import {
  MOOD_LEVELS,
  SCORE_LIMITS,
  clamp,
  moodOf,
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

  return {
    total,
    breakdown,
    explanation:
      `情绪 ${breakdown.mood} 分、睡眠 ${breakdown.sleep} 分、步数 ${breakdown.steps} 分、` +
      `社交 ${breakdown.social} 分、干预 ${breakdown.intervention} 分，合成当前恢复指数。`
  };
}

export function explainRecoveryScore(scoreResult) {
  const b = scoreResult.breakdown;
  return `恢复指数 ${scoreResult.total}：情绪 ${b.mood}、睡眠 ${b.sleep}、步数 ${b.steps}、社交 ${b.social}、干预 ${b.intervention}。`;
}
