import { readFile, writeFile } from "node:fs/promises";
import { calculateRecoveryScore } from "../src/rules/recovery-score.js";
import { assessRisk } from "../src/rules/risk-assessment.js";
import { recommendPath, interventionLabels } from "../src/rules/recommendation.js";

const recordsUrl = new URL("../data/synthetic-mindpulse-30-records.json", import.meta.url);
const outputUrl = new URL("../data/synthetic-mindpulse-30-analysis.json", import.meta.url);

const records = JSON.parse(await readFile(recordsUrl, "utf8"));

const analyzed = records.map((record, index) => {
  const history = records.slice(0, index + 1);
  const risk = assessRisk(history);
  const score = calculateRecoveryScore(record, record.completedInterventions || []);
  const recommendation = recommendPath(record, risk);
  return {
    id: record.id,
    date: record.date,
    mood: record.mood,
    sleepHours: record.sleepHours,
    steps: record.steps,
    socialScore: record.socialScore,
    recoveryScore: score.total,
    scoreBreakdown: score.breakdown,
    riskLevel: risk.level,
    riskTag: risk.tag,
    riskReason: risk.reason,
    riskEvidence: risk.evidence || [],
    recommendedPath: recommendation.path,
    recommendedLabels: recommendation.path.map((id) => interventionLabels[id] || id),
    recommendationReason: recommendation.reason,
    dataSource: record.dataSource
  };
});

const riskDistribution = analyzed.reduce((acc, item) => {
  acc[item.riskLevel] = (acc[item.riskLevel] || 0) + 1;
  return acc;
}, {});

const averageScore = Math.round(
  analyzed.reduce((sum, item) => sum + item.recoveryScore, 0) / analyzed.length
);

const payload = {
  generatedAt: new Date().toISOString(),
  note: "This file is generated from synthetic demo records. It must not be presented as real user research data.",
  totalRecords: analyzed.length,
  averageRecoveryScore: averageScore,
  riskDistribution,
  analyzed
};

await writeFile(outputUrl, JSON.stringify(payload, null, 2), "utf8");

console.log(`Analyzed ${analyzed.length} synthetic record(s).`);
console.log(`Average recovery score: ${averageScore}`);
console.log(`Risk distribution: ${JSON.stringify(riskDistribution)}`);
console.log(`Wrote ${outputUrl.pathname}`);
