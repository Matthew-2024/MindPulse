import assert from "node:assert/strict";
import {
  personalizationStatus,
  personalizeRecommendation,
  recordSafeFeedback
} from "../src/rules/personalization.js";
import { assessRisk, hasDangerSignal } from "../src/rules/risk-assessment.js";

globalThis.MindPulseRules = { assessRisk };

await import("../src/domain/decision-policy.js");

const policy = globalThis.MindPulseDecisionPolicy;
assert(policy, "MindPulseDecisionPolicy should be exposed on globalThis");

const insufficient = policy.evaluateState([
  { mood: "calm", note: "第一次记录", dataSource: "self" }
], { source: "自我记录", now: "2026-07-27T09:00:00.000Z" });

assert.deepEqual(insufficient.reasonCodes, ["DATA_INSUFFICIENT"]);
assert.equal(insufficient.mode, "DATA_INSUFFICIENT");
assert.deepEqual(insufficient.allowedActions, ["checkin"]);
assert(insufficient.blockedActions.includes("breathe"));
assert.equal(insufficient.dataSource, "自我记录");
assert.equal(insufficient.confidence, "低");

const crisis = policy.evaluateState([
  {
    mood: "sad",
    sleepHours: 4.4,
    steps: 1200,
    socialScore: 8,
    note: "我很绝望，想从这个世界上消失",
    dataSource: "self"
  }
], { source: "自我记录", now: "2026-07-27T10:00:00.000Z" });

assert.equal(crisis.mode, "HIGH_RISK");
assert.deepEqual(crisis.reasonCodes, ["TEXT_CRISIS_SIGNAL"]);
assert.deepEqual(crisis.allowedActions, ["help"]);
assert(crisis.blockedActions.includes("breathe"));
assert(crisis.evidence.some((item) => item.includes("危机文本信号")));
assert.throws(
  () => policy.assertActionAllowed(crisis, "breathe"),
  /SAFETY_GATE_BLOCKED: breathe/
);
assert.doesNotThrow(() => policy.assertActionAllowed(crisis, "help"));

const stable = policy.evaluateState([
  { mood: "calm", sleepHours: 7.2, steps: 6500, socialScore: 62 },
  { mood: "calm", sleepHours: 7.1, steps: 6300, socialScore: 60 },
  { mood: "happy", sleepHours: 7.4, steps: 6900, socialScore: 65 }
], { source: "合成演示", now: "2026-07-27T11:00:00.000Z" });

assert.equal(stable.mode, "STABLE");
assert(stable.reasonCodes.includes("STABLE_BASELINE"));
assert(stable.allowedActions.includes("focus"));
assert.doesNotThrow(() => policy.assertActionAllowed(stable, "breathe"));

for (const trace of [insufficient, crisis, stable]) {
  assert.match(trace.decisionId, /^decision_/);
  assert.equal(trace.evaluatedAt, trace.evaluatedAt.trim());
  assert(Array.isArray(trace.reasonCodes));
  assert(Array.isArray(trace.allowedActions));
  assert(Array.isArray(trace.blockedActions));
  assert(Array.isArray(trace.evidence));
  assert.equal(trace.policyVersion, policy.POLICY_VERSION);
}

assert.equal(policy.strategyLabel(insufficient), "补充一条记录");
assert.equal(policy.strategyLabel(crisis), "只允许求助");

const moderate = policy.evaluateState([
  { mood: "sad", sleepHours: 5.1, steps: 2400, socialScore: 28 },
  { mood: "anxious", sleepHours: 5.3, steps: 2600, socialScore: 24 },
  { mood: "tired", sleepHours: 5.2, steps: 2200, socialScore: 22 }
], { source: "合成演示", now: "2026-07-27T11:30:00.000Z" });
assert.equal(moderate.mode, "MODERATE");
assert.doesNotThrow(() => policy.assertActionAllowed(moderate, "breathe"));
assert.equal(policy.strategyLabel(moderate), "连接一个可信任的人");

const windowNow = "2026-07-27T12:00:00.000Z";
const currentRecord = {
  mood: "calm",
  sleepHours: 7,
  steps: 6000,
  socialScore: 60,
  note: "今天平稳",
  createdAt: windowNow
};
assert.equal(
  assessRisk([{ ...currentRecord, note: "自杀", createdAt: "2026-07-20T12:00:00.000Z" }, currentRecord], "", { now: windowNow }).mode,
  "help",
  "a crisis signal exactly seven days old must remain in the historical window"
);
assert.notEqual(
  assessRisk([{ ...currentRecord, note: "自杀", createdAt: "2026-07-20T11:59:59.999Z" }, currentRecord], "", { now: windowNow }).mode,
  "help",
  "a crisis signal older than seven days must not keep the gate open"
);
assert.notEqual(
  assessRisk([{ ...currentRecord, note: "自杀", createdAt: "2026-07-27T12:00:00.001Z" }, currentRecord], "", { now: windowNow }).mode,
  "help",
  "future timestamps must not count as historical crisis evidence"
);
assert.notEqual(
  assessRisk([{ mood: "sad", note: "自杀" }, currentRecord], "", { now: windowNow }).mode,
  "help",
  "an untimestamped legacy record must not become historical crisis evidence"
);
assert.equal(
  assessRisk([currentRecord], "自杀", { now: windowNow }).mode,
  "help",
  "current free text must always be assessed"
);
assert.equal(hasDangerSignal(`不想活在${"x".repeat(15)}里`).hasDanger, false);
assert.equal(hasDangerSignal(`不想活在${"x".repeat(16)}里`).hasDanger, true);

const basePath = ["breathe", "walk", "journal"];
assert.deepEqual(
  personalizeRecommendation(basePath, { journal: { count: 2, totalDelta: 20 } }),
  basePath,
  "fewer than three safe feedback events must not reorder the path"
);
assert.equal(
  personalizeRecommendation(basePath, { __meta: { learningSource: "subjective-outcome" }, journal: { count: 5, totalOutcome: 5, eligible: true } })[0],
  "journal"
);
assert.deepEqual(personalizationStatus({ journal: { count: 2 } }), {
  formed: false,
  safeFeedbackCount: 2,
  required: 3,
  eligibleActionCount: 0,
  excludedHighRisk: 0
});
assert.equal(personalizationStatus({ journal: { count: 3 } }).formed, true);

const excluded = recordSafeFeedback({}, {
  actionId: "breathe",
  outcome: "better",
  riskMode: "HIGH_RISK",
  completedAt: "2026-07-27T12:00:00.000Z"
});
assert.equal(excluded.breathe, undefined);
assert.equal(excluded.__meta.excludedHighRisk, 1);

console.log("Decision policy tests passed.");
