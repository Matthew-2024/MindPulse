import { strictEqual, deepStrictEqual, ok } from "node:assert/strict";
import { calculateRecoveryScore } from "../src/rules/recovery-score.js";
import { assessRisk } from "../src/rules/risk-assessment.js";
import { recommendPath } from "../src/rules/recommendation.js";
import {
  calculatePersonalBaseline,
  personalizeRecommendation,
  summarizeInterventionFeedback
} from "../src/rules/personalization.js";

const sparseRecord = {
  mood: "calm",
  note: "",
  signalPresence: { mood: true, sleep: false, steps: false, social: false }
};
const sparseBaseline = calculatePersonalBaseline([sparseRecord]);
strictEqual(sparseBaseline.level, "数据不足");
strictEqual(sparseBaseline.dataCompleteness.available, 1);
ok(sparseBaseline.dataCompleteness.missing.includes("sleep"));

const sparseScore = calculateRecoveryScore(sparseRecord);
ok(sparseScore.missingSignals.includes("sleep"));
strictEqual(sparseScore.contributions.find((item) => item.signal === "sleep").present, false);
strictEqual(sparseScore.referenceSignalCount, 1);
strictEqual(sparseScore.referenceSignalRequired, 4);
strictEqual(sparseScore.referenceScore, 80);
ok(sparseScore.explanation.includes("没填的项目不会被当成 0 分"));

const emptyScore = calculateRecoveryScore({});
strictEqual(emptyScore.referenceScore, null);
strictEqual(emptyScore.referenceSignalCount, 0);

const completeScore = calculateRecoveryScore({ mood: "happy", sleepHours: 8, steps: 8000, socialScore: 100 });
strictEqual(completeScore.referenceScore, 100);
strictEqual(completeScore.referenceSignalCount, 4);

const sparseRisk = assessRisk([sparseRecord]);
strictEqual(sparseRisk.mode, "ask");
deepStrictEqual(recommendPath(sparseRecord, sparseRisk).path, ["ask"]);
ok(sparseRisk.blockedActions.includes("ordinary_intervention"));

const crisisRisk = assessRisk([{
  mood: "sad",
  note: "我很绝望",
  signalPresence: { mood: true, sleep: false, steps: false, social: false }
}]);
strictEqual(crisisRisk.mode, "help");
deepStrictEqual(crisisRisk.allowedActions, ["help"]);
ok(crisisRisk.blockedActions.includes("breathe"));
deepStrictEqual(recommendPath({}, crisisRisk).path, ["help"]);

const baseline = calculatePersonalBaseline([
  { mood: "calm", sleepHours: 6, steps: 3000, socialScore: 40 },
  { mood: "calm", sleepHours: 8, steps: 7000, socialScore: 70 },
  { mood: "happy", sleepHours: 7, steps: 5000, socialScore: 60 },
  { mood: "anxious", sleepHours: 5, steps: 1500, socialScore: 20 }
]);
strictEqual(baseline.base.sleep, 7);
strictEqual(baseline.signals.sleep.sampleCount, 3);
strictEqual(baseline.baselineReady, true);
ok(baseline.flags.length >= 2);

const firstEvents = [
  { interventionId: "journal", eventType: "outcome-feedback", outcome: "better", riskCode: "normal", riskMode: "action", eligibleForLearning: true, feedbackTimingValid: true, feedbackCompletionEventId: "completion-1", feedbackContext: { dataMode: "real-trial" } },
  { interventionId: "journal", eventType: "outcome-feedback", outcome: "same", riskCode: "normal", riskMode: "action", eligibleForLearning: true, feedbackTimingValid: true, feedbackCompletionEventId: "completion-2", feedbackContext: { dataMode: "real-trial" } },
  { interventionId: "journal", eventType: "outcome-feedback", outcome: "better", riskCode: "high", riskMode: "help", eligibleForLearning: false, feedbackTimingValid: true, feedbackCompletionEventId: "completion-3", feedbackContext: { dataMode: "real-trial" } }
];
const insufficientLearning = summarizeInterventionFeedback(firstEvents);
strictEqual(insufficientLearning.journal.count, 2);
strictEqual(insufficientLearning.journal.eligible, false);
strictEqual(summarizeInterventionFeedback([{ interventionId: "breathe", eventType: "completion", delta: 5, riskCode: "normal", mode: "action" }]).breathe, undefined);
const readyLearning = summarizeInterventionFeedback([
  ...firstEvents,
  { interventionId: "journal", eventType: "outcome-feedback", outcome: "better", riskCode: "normal", riskMode: "action", eligibleForLearning: true, feedbackTimingValid: true, feedbackCompletionEventId: "completion-4", feedbackContext: { dataMode: "real-trial" } }
]);
strictEqual(readyLearning.journal.count, 3);
strictEqual(readyLearning.journal.eligible, true);
strictEqual(personalizeRecommendation(["breathe", "journal"], {}, [
  { interventionId: "journal", eventType: "outcome-feedback", outcome: "better", riskCode: "normal", riskMode: "action", eligibleForLearning: true, feedbackTimingValid: true, feedbackCompletionEventId: "completion-5", feedbackContext: { dataMode: "real-trial" } },
  { interventionId: "journal", eventType: "outcome-feedback", outcome: "better", riskCode: "normal", riskMode: "action", eligibleForLearning: true, feedbackTimingValid: true, feedbackCompletionEventId: "completion-6", feedbackContext: { dataMode: "real-trial" } },
  { interventionId: "journal", eventType: "outcome-feedback", outcome: "better", riskCode: "normal", riskMode: "action", eligibleForLearning: true, feedbackTimingValid: true, feedbackCompletionEventId: "completion-7", feedbackContext: { dataMode: "real-trial" } }
])[0], "journal");

strictEqual(personalizeRecommendation(["breathe", "journal"], { journal: { count: 3, totalDelta: 27 } })[0], "breathe");

console.log("Profile strategy smoke passed: missing-data semantics, median baseline, risk policy, score explanations, and protected N-of-1 learning.");
