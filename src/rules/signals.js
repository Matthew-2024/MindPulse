export const NEGATIVE_MOODS = new Set(["sad", "anxious", "tired", "angry"]);

export const MOOD_LEVELS = {
  happy: 5,
  calm: 4,
  anxious: 3,
  sad: 2,
  tired: 2,
  angry: 2
};

export const SCORE_LIMITS = {
  mood: 60,
  sleep: 18,
  steps: 14,
  social: 12,
  intervention: 8
};

export const DANGER_PATTERNS = [
  { re: /自[杀傷伤]|自杀/, level: "critical", tag: "direct-self-harm" },
  { re: /伤害\s*(自己|自身|我)/, level: "critical", tag: "self-harm-ideation" },
  { re: /自残/, level: "critical", tag: "self-injury" },
  { re: /不想活|不想[再在]?活|活不下去|活着.*累|活着.*痛苦/, level: "critical", tag: "death-wish" },
  { re: /想[要去]?死|想消失|想[从]?[这這]个世界上?消失/, level: "critical", tag: "disappear-or-die" },
  { re: /没有意义|毫无意义|活着.*没有.*意义/, level: "high", tag: "meaninglessness" },
  { re: /撑不住|撑不下去|受不了了|忍不了了/, level: "high", tag: "cannot-cope" },
  { re: /绝望|看不到希望|没有任何希望/, level: "high", tag: "hopelessness" },
  { re: /不想[存在存]在|想要结束/, level: "high", tag: "ending" },
  { re: /解脱|一了百了|不如[死消失]/, level: "high", tag: "implicit-ending" },
  { re: /留[不没]?住|没有人在乎|没人.*在乎/, level: "medium", tag: "isolation" }
];

export const SAFE_PHRASES = [
  /不想活在.*里/,
  /不想活[着得].*但是/,
  /不想活[着得].*不过/,
  /活着.*[但虽].*还/,
  /撑不住.*[但虽].*还是/,
  /(?:没有|并无|无)\s*(?:自杀|自伤|自残|伤害\s*(?:自己|自身|我))(?:的)?\s*(?:想法|念头|计划|冲动)/,
  /(?:没有|并无|无)\s*想过\s*(?:自杀|自伤|自残|伤害\s*(?:自己|自身|我))/
];

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function textOf(record = {}) {
  return String(record.note || record.text || record.checkinNote || "");
}

export function moodOf(record = {}) {
  return record.mood || record.et || "calm";
}

export function moodLevelOf(record = {}) {
  return toNumber(record.moodScore ?? record.ii ?? MOOD_LEVELS[moodOf(record)], 3);
}

export function sleepOf(record = {}) {
  return toNumber(record.sleepHours ?? record.sleep, 0);
}

export function stepsOf(record = {}) {
  return toNumber(record.steps ?? record.step, 0);
}

export function socialOf(record = {}) {
  return toNumber(record.socialScore ?? record.sc, 0);
}

export function normalizeRecords(records) {
  return Array.isArray(records) ? records : [];
}

export function unique(list) {
  const out = [];
  for (const item of list) {
    if (item && !out.includes(item)) out.push(item);
  }
  return out;
}
