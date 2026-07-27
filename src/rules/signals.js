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

export const SIGNAL_KEYS = ["mood", "sleep", "steps", "social"];

export const SIGNAL_LABELS = {
  mood: "情绪",
  sleep: "睡眠",
  steps: "活动",
  social: "连接"
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

function rawMoodLevelOf(record = {}) {
  const explicit = record.moodScore ?? record.ii;
  if (explicit !== undefined && explicit !== null && explicit !== "") {
    const parsed = Number(explicit);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const key = record.mood || record.et;
  return key && MOOD_LEVELS[key] ? MOOD_LEVELS[key] : null;
}

function rawNumberOf(record, primary, legacy) {
  const value = record[primary] ?? record[legacy];
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function signalValueOf(record = {}, key) {
  if (key === "mood") return rawMoodLevelOf(record);
  if (key === "sleep") return rawNumberOf(record, "sleepHours", "sleep");
  if (key === "steps") return rawNumberOf(record, "steps", "step");
  if (key === "social") return rawNumberOf(record, "socialScore", "sc");
  return null;
}

export function signalPresent(record = {}, key) {
  const presence = record.signalPresence;
  if (presence && Object.prototype.hasOwnProperty.call(presence, key)) {
    return Boolean(presence[key]);
  }
  const value = signalValueOf(record, key);
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return false;
  if (key === "mood") return Number(value) >= 1 && Number(value) <= 5;
  return Number(value) >= 0;
}

export function signalSourceOf(record = {}, key) {
  const sourceMaps = [record.signalSources, record.dataSources, record.sources];
  for (const sourceMap of sourceMaps) {
    if (sourceMap && typeof sourceMap === "object" && sourceMap[key]) {
      return String(sourceMap[key]);
    }
  }
  if (record.dataInputMode === "manual-web") return "manual";
  if (record.entryType === "device") return "device";
  if (record.dataSource) return String(record.dataSource);
  if (record.entryType === "instant" || record.entryType === "daily") return "self-report";
  return "unknown";
}

export function signalSnapshot(record = {}) {
  return SIGNAL_KEYS.reduce((snapshot, key) => {
    snapshot[key] = {
      value: signalValueOf(record, key),
      present: signalPresent(record, key),
      source: signalSourceOf(record, key),
      label: SIGNAL_LABELS[key]
    };
    return snapshot;
  }, {});
}

export function dataCompletenessOf(record = {}) {
  const signals = signalSnapshot(record);
  const available = SIGNAL_KEYS.filter((key) => signals[key].present);
  const missing = SIGNAL_KEYS.filter((key) => !signals[key].present);
  const ratio = SIGNAL_KEYS.length ? available.length / SIGNAL_KEYS.length : 0;
  return {
    available: available.length,
    required: SIGNAL_KEYS.length,
    ratio,
    percent: Math.round(ratio * 100),
    missing,
    sources: SIGNAL_KEYS.reduce((sources, key) => {
      sources[key] = signals[key].source;
      return sources;
    }, {}),
    signals
  };
}

export function moodLevelOf(record = {}) {
  return toNumber(rawMoodLevelOf(record), 3);
}

export function sleepOf(record = {}) {
  return toNumber(signalValueOf(record, "sleep"), 0);
}

export function stepsOf(record = {}) {
  return toNumber(signalValueOf(record, "steps"), 0);
}

export function socialOf(record = {}) {
  return toNumber(signalValueOf(record, "social"), 0);
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
