import { dataCompletenessOf, normalizeRecords, signalPresent } from "./signals.js";

const QUESTION_ORDER = ["mood", "sleep", "social", "steps"];

const QUESTIONS = {
  mood: { label: "当前情绪", prompt: "此刻最接近哪一种感受？", why: "情绪是当前安全判断最直接的自我报告。" },
  sleep: { label: "昨晚睡眠", prompt: "昨晚大约睡了多久？", why: "睡眠能帮助区分短暂疲惫与需要优先关注的节奏变化。" },
  social: { label: "连接感", prompt: "今天和他人的连接感大约如何？", why: "连接感能补足当前支持需要的信息。" },
  steps: { label: "今日活动", prompt: "今天大约活动了多少？", why: "活动是较低优先级的节奏参考，可以之后再补。" }
};

function scoreFor(signal, latest, history, options) {
  const completeness = dataCompletenessOf(latest);
  if (signalPresent(latest, signal)) return Number.NEGATIVE_INFINITY;
  const historyCount = history.filter((record) => signalPresent(record, signal)).length;
  const uncertaintyBoost = completeness.available < 2 ? 4 : 0;
  const safetyBoost = signal === "mood" ? 5 : signal === "sleep" ? 4 : signal === "social" ? 2 : 1;
  const baselineBoost = historyCount < 2 ? 2 : 0;
  const skippedPenalty = options.skippedSignals?.includes(signal) ? 100 : 0;
  return safetyBoost + uncertaintyBoost + baselineBoost - skippedPenalty;
}

export function nextCheckinPrompt(records = [], options = {}) {
  const normalized = normalizeRecords(records);
  const latest = normalized.at(-1) || {};
  const history = normalized.slice(0, -1);
  const candidates = QUESTION_ORDER
    .map((signal) => ({ signal, score: scoreFor(signal, latest, history, options) }))
    .filter((candidate) => Number.isFinite(candidate.score))
    .sort((a, b) => b.score - a.score || QUESTION_ORDER.indexOf(a.signal) - QUESTION_ORDER.indexOf(b.signal));
  const candidate = candidates[0];
  if (!candidate) return null;
  const question = QUESTIONS[candidate.signal];
  return { signal: candidate.signal, score: candidate.score, label: question.label, prompt: question.prompt, why: question.why, remaining: candidates.map((item) => item.signal) };
}

export { QUESTIONS };
