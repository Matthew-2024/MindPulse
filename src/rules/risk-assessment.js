import {
  DANGER_PATTERNS,
  NEGATIVE_MOODS,
  SAFE_PHRASES,
  moodOf,
  normalizeRecords,
  sleepOf,
  textOf
} from "./signals.js";

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

function recentNegativeCount(records) {
  return normalizeRecords(records).slice(-4).filter((record) => NEGATIVE_MOODS.has(moodOf(record))).length;
}

function lowSleepDays(records) {
  return normalizeRecords(records).slice(-4).filter((record) => sleepOf(record) < 6).length;
}

export function assessRisk(records, currentText = "") {
  const safeRecords = normalizeRecords(records);
  const latest = safeRecords[safeRecords.length - 1] || {};
  const mergedText = `${textOf(latest)} ${currentText}`;
  const lowSleep = lowSleepDays(safeRecords);
  const negative = recentNegativeCount(safeRecords);

  const dangerResult = hasDangerSignal(mergedText);
  if (dangerResult.hasDanger) {
    return {
      level: "高风险",
      tag: "优先求助",
      reason: `文本中出现危机信号（${dangerResult.level}级），停止普通自助建议，优先连接热线、老师、家人或专业资源。`,
      desc: "文本中出现危机信号时，心晴会先停下普通自助建议，优先展示热线、老师、家人和专业机构入口。",
      evidence: [`Safety Gate: ${dangerResult.level}`, `pattern: ${dangerResult.matchedPattern}`],
      shouldRecommendSelfHelp: false
    };
  }

  if (lowSleep >= 3 || negative >= 3) {
    const evidence = [];
    if (lowSleep >= 3) evidence.push(`近 4 次记录中 ${lowSleep} 次睡眠低于 6 小时`);
    if (negative >= 3) evidence.push(`近 4 次记录中 ${negative} 次为负向状态`);
    return {
      level: "中度关注",
      tag: "建议连接他人",
      reason: "最近低睡眠或负面状态连续出现，建议联系可信任的人或校内支持资源。",
      desc: "本周低睡眠或负面状态连续出现，心晴会优先推荐低负担行动，并提示联系可信任的人。",
      evidence,
      shouldRecommendSelfHelp: true
    };
  }

  if (NEGATIVE_MOODS.has(moodOf(latest))) {
    return {
      level: "普通波动",
      tag: "先做轻干预",
      reason: "当前更像日常压力波动，可先完成一个低负担行动。",
      desc: "当前更像日常压力波动，建议先完成呼吸、散步、记录或睡前放松中的一步。",
      evidence: [`当前情绪: ${moodOf(latest)}`],
      shouldRecommendSelfHelp: true
    };
  }

  return {
    level: "稳定观察",
    tag: "保持记录",
    reason: "当前状态较平稳，继续保持记录和节奏观察。",
    desc: "当前状态较平稳，心晴会继续记录节奏变化，提醒你维持睡眠和连接感。",
    evidence: ["未触发危机词、连续低睡眠或连续负面状态规则"],
    shouldRecommendSelfHelp: true
  };
}

// 向后兼容：导出危险模式供外部使用
export const dangerWords = DANGER_PATTERNS.map(({ re }) => re.source);
export const dangerPatterns = DANGER_PATTERNS;
export const safePhrases = SAFE_PHRASES;
export { hasDangerSignal, lowSleepDays, recentNegativeCount };
