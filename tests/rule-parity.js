import { readFileSync } from "node:fs";
import { strictEqual } from "node:assert";
import { runInNewContext } from "node:vm";
import cases from "./rule-cases.json" with { type: "json" };
import { calculateRecoveryScore } from "../src/rules/recovery-score.js";
import { assessRisk } from "../src/rules/risk-assessment.js";
import { recommendPath } from "../src/rules/recommendation.js";
import { calculatePersonalBaseline } from "../src/rules/personalization.js";

const browserContext = { window: {} };
runInNewContext(
  readFileSync("src/rules/browser-engine.js", "utf8"),
  browserContext,
  { filename: "src/rules/browser-engine.js" }
);
const browserRules = browserContext.window.MindPulseRules;
if (!browserRules) throw new Error("browser rules engine did not expose MindPulseRules");

function shapeRisk(result) {
  return {
    riskCode: result.riskCode,
    level: result.level,
    mode: result.mode,
    allowedActions: result.allowedActions || [],
    blockedActions: result.blockedActions || [],
    evidence: result.evidence || [],
    shouldRecommendSelfHelp: result.shouldRecommendSelfHelp,
    dataCompleteness: result.dataCompleteness || null,
    baselineStatus: result.baselineStatus || null
  };
}

for (const item of cases) {
  const records = item.expectedRecords || item.records || [item.input];
  const latest = records.at(-1);
  const nodeRisk = assessRisk(records);
  const browserRisk = browserRules.assessRisk(records);
  strictEqual(JSON.stringify(shapeRisk(browserRisk)), JSON.stringify(shapeRisk(nodeRisk)), `${item.id} risk parity failed`);

  const nodePath = recommendPath(latest, nodeRisk);
  const browserPath = browserRules.recommendPath(latest, browserRisk);
  strictEqual(JSON.stringify(browserPath.path), JSON.stringify(nodePath.path), `${item.id} recommendation path parity failed`);

  const nodeScore = calculateRecoveryScore(latest, latest.completedInterventions || []);
  const browserScore = browserRules.calculateRecoveryScore(latest, latest.completedInterventions || []);
  strictEqual(JSON.stringify(browserScore.breakdown), JSON.stringify(nodeScore.breakdown), `${item.id} score breakdown parity failed`);
  strictEqual(browserScore.total, nodeScore.total, `${item.id} score total parity failed`);
  strictEqual(JSON.stringify(browserScore.contributions), JSON.stringify(nodeScore.contributions), `${item.id} score contribution parity failed`);
  strictEqual(JSON.stringify(browserScore.missingSignals), JSON.stringify(nodeScore.missingSignals), `${item.id} score missing-signal parity failed`);
  strictEqual(browserScore.referenceScore, nodeScore.referenceScore, `${item.id} reference score parity failed`);
  strictEqual(browserScore.referenceRawTotal, nodeScore.referenceRawTotal, `${item.id} reference raw total parity failed`);
  strictEqual(browserScore.referenceMax, nodeScore.referenceMax, `${item.id} reference max parity failed`);
  strictEqual(browserScore.referenceSignalCount, nodeScore.referenceSignalCount, `${item.id} reference signal count parity failed`);
  strictEqual(browserScore.referenceSignalRequired, nodeScore.referenceSignalRequired, `${item.id} reference required count parity failed`);
}

const baselineRecords = [
  { mood: "calm", sleepHours: 7.2, steps: 7200, socialScore: 68 },
  { mood: "calm", sleepHours: 7, steps: 6800, socialScore: 64 },
  { mood: "happy", sleepHours: 7.4, steps: 7600, socialScore: 72 },
  { mood: "anxious", sleepHours: 4.9, steps: 1800, socialScore: 28 }
];
strictEqual(
  JSON.stringify(browserRules.calculatePersonalBaseline(baselineRecords)),
  JSON.stringify(calculatePersonalBaseline(baselineRecords)),
  "personal baseline parity failed"
);

console.log(`Rule parity passed: ${cases.length} shared case(s), risk/path/score fields aligned.`);
