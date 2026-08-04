import { readFile } from "node:fs/promises";
import { calculateRecoveryScore } from "../src/rules/recovery-score.js";
import { assessRisk } from "../src/rules/risk-assessment.js";
import { recommendPath } from "../src/rules/recommendation.js";
import { calculatePersonalBaseline, personalizeRecommendation } from "../src/rules/personalization.js";

const raw = await readFile(new URL("./rule-cases.json", import.meta.url), "utf8");
const cases = JSON.parse(raw);

let failed = 0;
let passed = 0;

for (const item of cases) {
  // 支持多记录场景（R09 连续低睡眠测试）
  const records = item.expectedRecords 
    ? item.expectedRecords 
    : [item.input];
  
  const risk = assessRisk(records);
  const latestRecord = records[records.length - 1];
  const recommendation = recommendPath(latestRecord, risk);
  const score = calculateRecoveryScore(latestRecord, latestRecord.completedInterventions || []);

  const riskOk = risk.level === item.expectedRisk;
  const pathOk = JSON.stringify(recommendation.path) === JSON.stringify(item.expectedPath);

  if (!riskOk || !pathOk) {
    failed += 1;
    console.error(`[FAIL] ${item.id} ${item.name}`);
    console.error(`  risk: expected ${item.expectedRisk}, got ${risk.level}`);
    console.error(`  path: expected ${JSON.stringify(item.expectedPath)}, got ${JSON.stringify(recommendation.path)}`);
    continue;
  }

  console.log(`[PASS] ${item.id} ${item.name} | risk=${risk.level} | score=${score.total}`);
  passed++;
}

if (failed > 0) {
  console.error(`\n${failed} rule case(s) failed.`);
  process.exit(1);
}

const baseline = calculatePersonalBaseline([
  { mood: "calm", sleepHours: 7.2, steps: 7200, socialScore: 68 },
  { mood: "calm", sleepHours: 7, steps: 6800, socialScore: 64 },
  { mood: "happy", sleepHours: 7.4, steps: 7600, socialScore: 72 },
  { mood: "anxious", sleepHours: 4.9, steps: 1800, socialScore: 28 }
]);

if (baseline.level !== "明显偏离" || baseline.flags.length < 2) {
  console.error("[FAIL] P01 personal baseline deviation");
  console.error(`  expected obvious deviation, got ${baseline.level} ${baseline.flags.join(" / ")}`);
  process.exit(1);
}
console.log(`[PASS] P01 personal baseline deviation | level=${baseline.level}`);

const personalizedPath = personalizeRecommendation(["breathe", "walk", "journal"], {}, [
  { interventionId: "journal", eventType: "outcome-feedback", outcome: "better", riskCode: "normal", riskMode: "action", eligibleForLearning: true, feedbackTimingValid: true, feedbackCompletionEventId: "completion-p02-1", feedbackContext: { dataMode: "real-trial" } },
  { interventionId: "journal", eventType: "outcome-feedback", outcome: "better", riskCode: "normal", riskMode: "action", eligibleForLearning: true, feedbackTimingValid: true, feedbackCompletionEventId: "completion-p02-2", feedbackContext: { dataMode: "real-trial" } },
  { interventionId: "journal", eventType: "outcome-feedback", outcome: "better", riskCode: "normal", riskMode: "action", eligibleForLearning: true, feedbackTimingValid: true, feedbackCompletionEventId: "completion-p02-3", feedbackContext: { dataMode: "real-trial" } },
  { interventionId: "journal", eventType: "outcome-feedback", outcome: "better", riskCode: "normal", riskMode: "action", eligibleForLearning: true, feedbackTimingValid: true, feedbackCompletionEventId: "completion-p02-4", feedbackContext: { dataMode: "real-trial" } },
  { interventionId: "journal", eventType: "outcome-feedback", outcome: "better", riskCode: "normal", riskMode: "action", eligibleForLearning: true, feedbackTimingValid: true, feedbackCompletionEventId: "completion-p02-5", feedbackContext: { dataMode: "real-trial" } }
]);
if (personalizedPath[0] !== "journal") {
  console.error("[FAIL] P02 adaptive recommendation");
  console.error(`  expected journal first, got ${personalizedPath.join(" -> ")}`);
  process.exit(1);
}
console.log(`[PASS] P02 adaptive recommendation | path=${personalizedPath.join(" -> ")}`);

console.log(`\n✅ All ${passed + 2} rule case(s) passed.`);
