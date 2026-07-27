import { moodOf, sleepOf, toNumber, unique } from "./signals.js";

const PATHS = {
  anxious: ["breathe", "walk", "journal"],
  sad: ["breathe", "friend", "sleep"],
  tired: ["sleep", "breathe", "focus"],
  angry: ["breathe", "walk", "friend"],
  calm: ["focus", "journal", "walk"],
  happy: ["focus", "journal", "walk"]
};

const PATH_REASONS = {
  anxious: "先降低生理唤醒，再把注意力从压力源中移开。",
  sad: "先稳定状态，再建立连接，避免独自承受。",
  tired: "优先恢复身体电量，再恢复掌控感。",
  angry: "先把身体带离情绪中心，再表达。",
  calm: "顺势完成小目标，保留稳定节奏。",
  happy: "利用较好状态推进小目标，并留下正向记录。"
};

function completePath(chain, mood) {
  const base = PATHS[mood] || PATHS.calm;
  const fallback = ["breathe", "journal", "friend", "sleep", "walk", "focus"];
  return unique([...chain, ...base, ...fallback]).slice(0, 3);
}

export function recommendPath(record, risk) {
  record = record || {};
  if (risk && (risk.level === "高风险" || risk.mode === "help" || risk.riskCode === "high")) {
    return {
      path: ["help"],
      reason: "遇到需要优先求助的情况，先联系一个真实的人。",
      reasons: ["出现危机信号"],
      mode: "help",
      risk: risk.level || "高风险",
      riskCode: "high",
      allowedActions: ["help"],
      blockedActions: ["breathe", "walk", "journal", "sleep", "focus", "friend", "self_check", "ordinary_intervention"],
      evidence: risk.evidence || ["出现危机信号"],
      explanation: "现在先联系一个真实的人，普通建议暂时暂停。"
    };
  }

  if (risk && (risk.level === "数据不足" || risk.mode === "ask" || risk.riskCode === "insufficient")) {
    return {
      path: ["ask"],
      reason: "记录还不够，先补充一点信息，再决定下一步。",
      reasons: ["过去记录还不够或有项目没填"],
      mode: "ask",
      risk: risk.level || "数据不足",
      riskCode: "insufficient",
      allowedActions: ["checkin", "ask"],
      blockedActions: ["ordinary_intervention", "self_check"],
      evidence: risk.evidence || ["数据不足"],
      explanation: "记录还不够，我先不急着下确定结论。"
    };
  }

  const mood = moodOf(record);
  const sleepHours = sleepOf(record);
  const socialScore = toNumber(record.socialScore ?? record.sc, 50);
  const energyLevel = record.energyLevel || "mid";
  const connectionNeed = record.connectionNeed || "ok";
  const reasons = [];
  let chain = (PATHS[mood] || PATHS.calm).slice();

  if (connectionNeed === "need" || socialScore < 25) {
    chain = ["friend", ...chain];
    reasons.push(connectionNeed === "need" ? "用户主动表达需要连接" : "社交连接偏低");
  } else if (connectionNeed === "avoid") {
    chain = [...chain.filter((id) => id !== "friend"), "friend"];
    reasons.push("用户暂时不想联系别人");
  }

  if (sleepHours > 0 && sleepHours < 5.2) {
    chain = ["sleep", "breathe", "journal", ...chain.filter((id) => id !== "focus")];
    reasons.push("睡眠明显不足");
  } else if (sleepHours > 0 && sleepHours < 6) {
    chain = mood === "tired" ? ["sleep", "breathe", ...chain] : ["breathe", "sleep", ...chain];
    reasons.push("睡眠低于 6 小时");
  }

  if (energyLevel === "low") {
    chain = ["breathe", "journal", "sleep", ...chain.filter((id) => id !== "focus")];
    reasons.push("精力偏低");
  } else if (energyLevel === "high" && ["happy", "calm"].includes(mood)) {
    chain = ["focus", ...chain];
    reasons.push("精力较高");
  }

  if (mood === "angry") {
    chain = ["walk", "breathe", ...chain];
    reasons.push("烦躁状态更适合先离开原地");
  }

  const path = completePath(chain, mood);
  return {
    path,
    reason: reasons.length
      ? `根据${reasons.join("、")}调整推荐顺序。`
      : PATH_REASONS[mood] || PATH_REASONS.calm,
    reasons: reasons.length ? unique(reasons) : ["当前状态较平稳"],
    mode: risk?.mode || "action",
    risk: risk?.level || "普通波动",
    riskCode: risk?.riskCode || "normal",
    allowedActions: risk?.allowedActions || ["checkin", "light_intervention", "contact_support"],
    blockedActions: risk?.blockedActions || [],
    evidence: risk?.evidence || [],
    explanation: risk?.explanation || PATH_REASONS[mood] || PATH_REASONS.calm
  };
}

export const interventionLabels = {
  breathe: "先把身体降下来",
  walk: "离开原地 10 分钟",
  journal: "把脑子里的话倒出来",
  friend: "让一个人知道你",
  sleep: "今晚先收住",
  focus: "只做一件小事",
  ask: "补充最少的一项记录",
  help: "打开求助入口"
};
