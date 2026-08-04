import { existsSync, readFileSync } from "node:fs";
import { strictEqual } from "node:assert";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const policyPath = "src/domain/policy-basis.ts";
const typesPath = "src/domain/types.ts";
const evaluatorPath = "src/domain/evaluate-state.ts";
const tracePath = "src/components/DecisionTrace.tsx";
const ruleLabPath = "src/features/rule-lab/RuleLabPage.tsx";
const ledgerPath = "docs/public-evidence/source-ledger.csv";

for (const path of [policyPath, typesPath, evaluatorPath, tracePath, ruleLabPath, ledgerPath]) {
  assert(existsSync(path), `policy basis file is missing: ${path}`);
}

const policy = readFileSync(policyPath, "utf8");
const types = readFileSync(typesPath, "utf8");
const evaluator = readFileSync(evaluatorPath, "utf8");
const trace = readFileSync(tracePath, "utf8");
const ruleLab = readFileSync(ruleLabPath, "utf8");
const ledger = readFileSync(ledgerPath, "utf8");

for (const url of [
  "https://www.nice.org.uk/guidance/ng225/",
  "https://www.nice.org.uk/corporate/ecd7",
  "https://www.who.int/health-topics/suicide",
  "https://www.who.int/publications/i/item/9789240020924"
]) {
  assert(policy.includes(url) || ledger.includes(url), `public source URL is missing: ${url}`);
}

assert(policy.includes("不代表已经有专业审核、临床验证或治疗效果"), "policy basis must include a clinical-validation boundary");
assert(policy.includes("风险标签不能单独决定处置") && policy.includes("人工评估、支持连接和后续跟进"), "NICE key principle must be represented");
assert(policy.includes("早期识别、评估、管理、后续跟进") && policy.includes("医疗、教育、家庭和社区协作"), "WHO key principle must be represented");
assert(policy.includes("mode === \"help\"") && policy.includes("现在先求助"), "help mode must document the help-only boundary");
assert(policy.includes("mode === \"ask\"") && policy.includes("记录还不够"), "ask mode must document the data-insufficient boundary");
assert(policy.includes("mode === \"action\"") && policy.includes("不说明因果或治疗效果"), "action mode must document the non-causal boundary");
assert(types.includes("policyReferences: PolicyReference[]") && types.includes("policyNotes: string[]"), "decision trace must carry policy references and notes");
assert(evaluator.includes("policyReferencesFor(safe.risk.mode)") && evaluator.includes("policyNotesFor(safe.risk.mode)"), "evaluateState must attach policy basis to the trace");
assert(evaluator.includes('allowedActions: ["help"]') && evaluator.includes('path: ["help"]'), "high-risk help-only contract must remain explicit");
assert(trace.includes("参考资料") && trace.includes("不能推出") && trace.includes("查看公开来源"), "decision trace must render policy boundaries and source links");
assert(ruleLab.includes("公开资料 / 不含用户记录") && ruleLab.includes("示例场景") && ruleLab.includes("内部编号"), "rule lab must keep public evidence separate from synthetic fixtures");

strictEqual(ledger.split("\n")[0], "id,authority,year,title,url,evidence_class,used_for,does_not_support,product_status,accessed_at", "source ledger columns changed unexpectedly");
assert(ledger.includes("reference-only-not-runtime"), "non-runtime public research must be marked as reference-only");

console.log("Policy basis smoke passed: NICE/WHO references, boundaries, trace contract, and evidence separation are present.");
