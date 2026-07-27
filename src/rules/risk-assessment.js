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
import { calculatePersonalBaseline } from "./personalization.js";

const ORDINARY_ACTIONS = ["breathe", "walk", "journal", "sleep", "focus", "friend"];

/**
 * 检测文本中的危机信号
 * @param {string} text - 用户输入文本
 * @returns {{ hasDanger: boolean, matchedPattern: string|null, level: string|null }}
 */
function hasDangerSignal(text) {
  let normalized = String(text || "").toLowerCase().trim();

  // 只移除安全短语片段，再继续扫描剩余文本，避免一句话里还有真实危机信号时被整体放过。
  for (const safe of SAFE_PHRASES) {
    normalized = normalized.replace(safe, " ");
  }

  // 检查危险模式。
  for (const { re, level } of DANGER_PATTERNS) {
    if (re.test(normalized)) {
      return { hasDanger: true, matchedPattern: re.source, level };
    }
  }

  return { hasDanger: false, matchedPattern: null, level: null };
}

function recentNegativeCount(records) {
  return normalizeRecords(records).slice(-4).filter((record) => {
    return signalPresent(record, "mood") && NEGATIVE_MOODS.has(moodOf(record));
  }).length;
}

function lowSleepDays(records) {
  return normalizeRecords(records).slice(-4).filter((record) => {
    return signalPresent(record, "sleep") && sleepOf(record) < 6;
  }).length;
}

function strategy({ riskCode, level, mode, tag, reason, desc, evidence, data, baseline, explanation }) {
  const highRisk = riskCode === "high";
  const dataShortage = riskCode === "insufficient";
  const allowedActions = highRisk
    ? ["help"]
    : dataShortage
      ? ["checkin", "ask"]
      : ["checkin", "light_intervention", "contact_support"];
  const blockedActions = highRisk
    ? [...ORDINARY_ACTIONS, "self_check", "ordinary_intervention"]
    : dataShortage
      ? ["ordinary_intervention", "self_check"]
      : [];
  return {
    riskCode,
    risk: level,
    level,
    mode,
    tag,
    reason,
    desc,
    evidence,
    explanation: explanation || reason,
    allowedActions,
    blockedActions,
    shouldRecommendSelfHelp: !highRisk && !dataShortage,
    dataCompleteness: data,
    baselineStatus: baseline?.status || "unknown",
    confidence: baseline?.confidence || (data.ratio >= 0.75 ? "medium" : "low"),
    policyVersion: "strategy-v1"
  };
}

export function assessRisk(records, currentText = "") {
  const safeRecords = normalizeRecords(records);
  const latest = safeRecords[safeRecords.length - 1] || {};
  const data = dataCompletenessOf(latest);
  const baseline = calculatePersonalBaseline(safeRecords);
  const mergedText = `${textOf(latest)} ${currentText}`;
  const lowSleep = lowSleepDays(safeRecords);
  const negative = recentNegativeCount(safeRecords);

  const dangerResult = hasDangerSignal(mergedText);
  if (dangerResult.hasDanger) {
    return strategy({
      riskCode: "high",
      level: "高风险",
      mode: "help",
      tag: "优先求助",
      reason: "文字中出现了需要优先求助的内容。现在先联系热线、老师、家人或身边可信任的人。",
      desc: "这时先停下普通建议，优先找到一个真实的人。",
      evidence: ["需要优先求助", "文字中出现了需要关注的内容"],
      explanation: "现在先联系一个真实的人，普通建议暂时暂停。",
      data,
      baseline
    });
  }

  // 冷启动和信号缺失优先于普通波动判断，避免一条负面记录被误读成稳定建议。
  if (!safeRecords.length || data.available < 2 || baseline.status !== "ready") {
    return strategy({
      riskCode: "insufficient",
      level: "数据不足",
      mode: "ask",
      tag: "补充最少记录",
      reason: "现在记录还不够，先补充一点信息，再看看下一步。",
      desc: "先补充最少的一项记录，等更了解你的平时状态后再决定下一步。",
      evidence: [
        `现在已有 ${data.available}/${data.required} 项记录`,
        `过去已有 ${baseline.historyRecords}/${3} 条记录`
      ],
      explanation: "记录还不够，我先不急着下确定结论。",
      data,
      baseline
    });
  }

  if (lowSleep >= 3 || negative >= 3) {
    const evidence = [];
    if (lowSleep >= 3) evidence.push(`近 4 次记录中 ${lowSleep} 次睡眠低于 6 小时`);
    if (negative >= 3) evidence.push(`近 4 次记录中 ${negative} 次为负向状态`);
    return strategy({
      riskCode: "medium",
      level: "中度关注",
      mode: "action",
      tag: "建议连接他人",
      reason: "最近低睡眠或负面状态连续出现，建议联系可信任的人或校内支持资源。",
      desc: "本周低睡眠或负面状态连续出现，心晴会优先推荐低负担行动，并提示联系可信任的人。",
      evidence,
      explanation: "最近几次状态都有变化，可以先做小事，同时找人聊聊。",
      data,
      baseline
    });
  }

  if (signalPresent(latest, "mood") && NEGATIVE_MOODS.has(moodOf(latest))) {
    return strategy({
      riskCode: "normal",
      level: "普通波动",
      mode: "action",
      tag: "先做一件小事",
      reason: "现在更像日常压力波动，可以先做一件不费力的小事。",
      desc: "可以先试试呼吸放松、走动、写下来或早点休息中的一步。",
      evidence: [`当前情绪: ${moodOf(latest)}`],
      explanation: "目前没有出现需要马上求助或连续变差的提示，可以先做一个小行动。",
      data,
      baseline
    });
  }

  return strategy({
    riskCode: "stable",
    level: "稳定观察",
    mode: "action",
    tag: "保持记录",
    reason: "当前状态较平稳，继续保持记录和节奏观察。",
    desc: "当前状态较平稳，心晴会继续记录节奏变化，提醒你维持睡眠和连接感。",
    evidence: ["未触发危机词、连续低睡眠或连续负面状态规则"],
    explanation: "目前记录比较完整，也没有出现需要升级支持的提示。",
    data,
    baseline
  });
}

// 向后兼容：导出危险模式供外部使用。
export const dangerWords = DANGER_PATTERNS.map(({ re }) => re.source);
export const dangerPatterns = DANGER_PATTERNS;
export const safePhrases = SAFE_PHRASES;
export { hasDangerSignal, lowSleepDays, recentNegativeCount, ORDINARY_ACTIONS };
