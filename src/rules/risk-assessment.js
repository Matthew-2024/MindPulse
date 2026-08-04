import {
  DANGER_PATTERNS,
  NEGATIVE_MOODS,
  SAFE_PHRASES,
  dataCompletenessOf,
  moodOf,
  normalizeRecords,
  signalPresent,
  sleepOf,
  textOf
} from "./signals.js";

const SAFE_ACTIONS = ["breathe", "walk", "focus", "journal", "sleep", "friend", "help"];
const ORDINARY_ACTIONS = ["breathe", "walk", "focus", "journal", "sleep", "friend", "self_check", "ordinary_intervention", "companion", "bottle"];
export const CRISIS_HISTORY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const ABSOLUTE_SLEEP_FLOOR_HOURS = 4.5;
export const REPEATED_NEGATIVE_WINDOW_COUNT = 3;

function riskShape({
  riskCode,
  mode,
  level,
  tag,
  reason,
  desc,
  evidence,
  shouldRecommendSelfHelp,
  dataCompleteness,
  records
}) {
  return {
    riskCode,
    risk: level,
    level,
    mode,
    tag,
    reason,
    desc,
    evidence,
    explanation: reason,
    allowedActions: mode === "help" ? ["help"] : mode === "ask" ? ["checkin", "ask"] : SAFE_ACTIONS,
    blockedActions: mode === "help" ? [...ORDINARY_ACTIONS, "checkin", "ask"] : mode === "ask" ? [...ORDINARY_ACTIONS, "help"] : [],
    shouldRecommendSelfHelp,
    dataCompleteness,
    baselineStatus: records.length >= 2 ? "ready" : "cold_start",
    confidence: records.length >= 5 ? "high" : records.length >= 2 ? "medium" : "low",
    policyVersion: "strategy-v1"
  };
}

/**
 * 检测文本中的危机信号
 * @param {string} text - 用户输入文本
 * @returns {{ hasDanger: boolean, matchedPattern: string|null, level: string|null }}
 */
function hasDangerSignal(text) {
  let normalized = text.toLowerCase().trim();

  // 只移除安全短语片段，再继续扫描剩余文本，避免一句话里还有真实危机信号时被整体放过。
  for (const safe of SAFE_PHRASES) {
    normalized = normalized.replace(safe, " ");
  }

  // 检查危险模式
  for (const { re, level } of DANGER_PATTERNS) {
    if (re.test(normalized)) {
      return { hasDanger: true, matchedPattern: re.source, level };
    }
  }
  
  return { hasDanger: false, matchedPattern: null, level: null };
}

function recordTimestamp(record) {
  const raw = record?.createdAt ?? record?.timestamp ?? record?.at ?? record?.t;
  const timestamp = new Date(raw).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function crisisText(records, currentText, now, options = {}) {
  const windowStart = now - CRISIS_HISTORY_WINDOW_MS;
  const includeHistoricalCrisis = options.includeHistoricalCrisis !== false;
  const historyAfter = Number.isFinite(new Date(options.historyAfter || "").getTime())
    ? new Date(options.historyAfter).getTime()
    : null;
  const historical = includeHistoricalCrisis
    ? records.filter((record) => {
      const timestamp = recordTimestamp(record);
      if (timestamp === null) return false;
      return timestamp >= windowStart && timestamp <= now && (historyAfter === null || timestamp > historyAfter);
    }).map(textOf)
    : [];
  const latest = records[records.length - 1];
  const latestTimestamp = recordTimestamp(latest);
  const latestIsCurrent = latestTimestamp === null || (
    latestTimestamp >= windowStart &&
    latestTimestamp <= now &&
    (historyAfter === null || latestTimestamp > historyAfter)
  );
  if (currentText) historical.push(String(currentText));
  else if (latestIsCurrent) historical.push(textOf(latest));
  return historical.join(" ");
}

function recentNegativeCount(records) {
  return normalizeRecords(records).slice(-4).filter((record) => NEGATIVE_MOODS.has(moodOf(record))).length;
}

function lowSleepDays(records) {
  return normalizeRecords(records).slice(-4).filter((record) => signalPresent(record, "sleep") && sleepOf(record) < 6).length;
}

export function assessRisk(records, currentText = "", options = {}) {
  const safeRecords = normalizeRecords(records);
  const latest = safeRecords[safeRecords.length - 1] || {};
  const suppliedNow = new Date(options.now ?? Date.now()).getTime();
  const now = Number.isFinite(suppliedNow) ? suppliedNow : Date.now();
  const mergedText = crisisText(safeRecords, currentText, now, options);
  const dataCompleteness = dataCompletenessOf(latest);
  const lowSleep = lowSleepDays(safeRecords);
  const negative = recentNegativeCount(safeRecords);
  const absoluteLowSleep = signalPresent(latest, "sleep") && sleepOf(latest) <= ABSOLUTE_SLEEP_FLOOR_HOURS;

  const dangerResult = hasDangerSignal(mergedText);
  if (dangerResult.hasDanger) {
    return riskShape({
      riskCode: "high",
      mode: "help",
      level: "高风险",
      tag: "优先求助",
      reason: `文本中出现危机信号（${dangerResult.level}级），停止普通自助建议，优先连接热线、老师、家人或专业资源。`,
      desc: "文本中出现危机信号时，心晴会先停下普通自助建议，优先展示热线、老师、家人和专业机构入口。",
      evidence: [`Safety Gate: ${dangerResult.level}`, `pattern: ${dangerResult.matchedPattern}`],
      shouldRecommendSelfHelp: false,
      dataCompleteness,
      records: safeRecords
    });
  }

  if (dataCompleteness.available < 2 && !absoluteLowSleep && lowSleep < 3 && negative < REPEATED_NEGATIVE_WINDOW_COUNT) {
    return riskShape({
      riskCode: "insufficient",
      mode: "ask",
      level: "数据不足",
      tag: "先补充记录",
      reason: "有效信号还不够建立个人基线，请先补充一条记录。",
      desc: "记录不足时，心晴不会给出普通行动建议，先把个人节奏记录完整。",
      evidence: ["有效信号少于 2 项，个人基线仍在建立"],
      shouldRecommendSelfHelp: false,
      dataCompleteness,
      records: safeRecords
    });
  }

  if (absoluteLowSleep || lowSleep >= 3 || negative >= REPEATED_NEGATIVE_WINDOW_COUNT) {
    const evidence = [];
    if (absoluteLowSleep) evidence.push(`当前睡眠不高于 ${ABSOLUTE_SLEEP_FLOOR_HOURS} 小时的绝对关注阈值`);
    if (lowSleep >= 3) evidence.push(`近 4 次记录中 ${lowSleep} 次睡眠低于 6 小时`);
    if (negative >= 3) evidence.push(`近 4 次记录中 ${negative} 次为负向状态`);
    return riskShape({
      riskCode: "medium",
      mode: "action",
      level: "中度关注",
      tag: "建议连接他人",
      reason: "最近低睡眠或负面状态连续出现，建议联系可信任的人或校内支持资源。",
      desc: "本周低睡眠或负面状态连续出现，心晴会优先推荐低负担行动，并提示联系可信任的人。",
      evidence,
      shouldRecommendSelfHelp: true,
      dataCompleteness,
      records: safeRecords
    });
  }

  if (NEGATIVE_MOODS.has(moodOf(latest))) {
    return riskShape({
      riskCode: "normal",
      mode: "action",
      level: "普通波动",
      tag: "先做轻干预",
      reason: "当前更像日常压力波动，可先完成一个低负担行动。",
      desc: "当前更像日常压力波动，建议先完成呼吸、散步、记录或睡前放松中的一步。",
      evidence: [`当前情绪: ${moodOf(latest)}`],
      shouldRecommendSelfHelp: true,
      dataCompleteness,
      records: safeRecords
    });
  }

  return riskShape({
    riskCode: "stable",
    mode: "action",
    level: "稳定观察",
    tag: "保持记录",
    reason: "当前状态较平稳，继续保持记录和节奏观察。",
    desc: "当前状态较平稳，心晴会继续记录节奏变化，提醒你维持睡眠和连接感。",
    evidence: ["未触发危机词、连续低睡眠或连续负面状态规则"],
    shouldRecommendSelfHelp: true,
    dataCompleteness,
    records: safeRecords
  });
}

// 向后兼容：导出危险模式供外部使用
export const dangerWords = DANGER_PATTERNS.map(({ re }) => re.source);
export const dangerPatterns = DANGER_PATTERNS;
export const safePhrases = SAFE_PHRASES;
export { hasDangerSignal, lowSleepDays, recentNegativeCount };
