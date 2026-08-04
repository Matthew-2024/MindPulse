import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const requiredFiles = [
  "README.md",
  "docs/自我审查项目.md",
  "docs/数据使用说明.md",
  "docs/匿名试用执行包.md",
  "docs/专业审核执行包.md",
  "docs/user-study-evidence/README.md",
  "docs/professional-review-evidence/README.md",
  "docs/PPT与答辩自查口径同步稿.md",
  "docs/当前测试与自查报告.md",
  "docs/提交前自查矩阵.md",
  "docs/演示视频录制脚本.md",
  "docs/review-evidence/README.md",
  "tests/rule-cases.json",
  "tests/run-rule-tests.js",
  "tests/react-ui-smoke.js",
  "tests/react-security-smoke.js",
  "tests/react-storage-smoke.js",
  "tests/react-bottle-smoke.js",
  "tests/help-warm-handoff-smoke.js",
  "tools/run-react-canonical-tests.js",
  "tests/capture-review-evidence.js",
  "tools/copy-safety-audit.js",
  "tools/docx-consistency-audit.py",
  "tools/run-python-tool.js"
];

const requiredEvidence = [
  "docs/review-evidence/01-anonymous-profile.png",
  "docs/review-evidence/02-home-status.png",
  "docs/review-evidence/03-home-evidence.png",
  "docs/review-evidence/04-rise-detail.png",
  "docs/review-evidence/05-high-risk-feedback.png",
  "docs/review-evidence/06-help-page.png",
  "docs/review-evidence/07-settings-evidence-board.png",
  "docs/review-evidence/08-rule-lab-20of20.png"
];

const textFiles = [
  "README.md",
  "docs/自我审查项目.md",
  "docs/数据使用说明.md",
  "docs/匿名试用执行包.md",
  "docs/专业审核执行包.md",
  "docs/PPT与答辩自查口径同步稿.md",
  "docs/review-evidence/README.md",
  "docs/国赛落地修改清单.md",
  "tests/规则测试说明.md",
  "心晴MindPulse_Web原型.html"
];

const requiredText = [
  ["README.md", ["不做心理诊断", "Safety Gate", "合成演示数据", "日报", "周报", "docs/review-evidence/", "npm.cmd run preflight", "npm.cmd run audit:docx", "Canonical Product Entry", "src/main.tsx", "legacy reference package", "npm.cmd run test:react:canonical"]],
  ["package.json", ["dev:react", "test:react:canonical", "test:legacy:ui", "demo:legacy"]],
  ["docs/自我审查项目.md", ["A07 | 是否有真实用户研究结果 | 待执行", "A08 | 是否有专业审核意见 | 待执行", "20 条规则测试"]],
  ["docs/数据使用说明.md", ["合成演示数据", "公开数据集验证", "真实用户研究"]],
  ["docs/user-study-evidence/README.md", ["A07 自查状态 | 待执行", "participant-ledger.csv", "是否可写“已完成真实用户研究” | 否", "不作为诊断、治疗或医学有效性证明"]],
  ["docs/professional-review-evidence/README.md", ["A08 自查状态 | 待执行", "review-issues.csv", "是否可写“已完成专业审核” | 否", "不代表医学认证、临床验证或疗效证明"]],
  ["docs/PPT与答辩自查口径同步稿.md", ["Safety Gate", "合成演示数据", "真实用户研究", "禁用说法"]],
  ["docs/当前测试与自查报告.md", ["20 条规则/个性化用例通过", "npm.cmd run preflight", "npm.cmd run audit:self", "npm.cmd run audit:docx", "npm.cmd run demo:smoke", "日报/周报", "dailyReport", "weeklyReport", "docs/review-evidence/", "A07 真实用户研究结果 | 待执行"]],
  ["docs/提交前自查矩阵.md", ["npm.cmd run preflight", "npm run audit:docx", "即时记录", "今日/周报", "A07 真实用户研究 | 待执行", "A08 专业审核 | 待执行", "不能写成已完成", "合成演示数据用于演示和测试规则链路"]],
  ["docs/演示视频录制脚本.md", ["3 分钟以内", "npm.cmd run demo:smoke", "不做心理诊断", "规则验证 20 / 20"]],
  ["docs/review-evidence/README.md", ["05-high-risk-feedback.png", "08-rule-lab-20of20.png"]],
  ["tests/react-ui-smoke.js", ["React UI smoke passed", "/help", "dataMode"]],
  ["tests/react-security-smoke.js", ["React security smoke passed", "safetyHold", "safetyEvents"]],
  ["tests/react-storage-smoke.js", ["React storage smoke passed", "mindpulse-records.json"]],
  ["tests/react-bottle-smoke.js", ["React bottle smoke passed", "本机演示海域"]],
  ["tests/help-warm-handoff-smoke.js", ["Warm Handoff smoke passed", "privacyReceiptEvents", "safetyEvents"]],
  ["tools/copy-safety-audit.js", ["panic-amplifying", "诊断化程度标签", "即时改善承诺"]],
  ["tools/docx-consistency-audit.py", ["CRITICAL_DOCX", "正式 docx 口径审查", "已完成真实用户研究", "已完成专业审核"]]
];

const forbiddenPatterns = [
  { re: /(?<!不要说系统能)诊断抑郁症/, label: "诊断抑郁症" },
  { re: /诊断焦虑症/, label: "诊断焦虑症" },
  { re: /治疗焦虑/, label: "治疗焦虑" },
  { re: /治疗抑郁/, label: "治疗抑郁" },
  { re: /治愈/, label: "治愈" },
  { re: /(?<!禁止写法[\s\S]{0,80})临床验证/, label: "临床验证" },
  { re: /(?<!没有被包装成.{0,20})医学认证/, label: "医学认证" },
  { re: /已完成真实用户研究/, label: "已完成真实用户研究" },
  { re: /已完成专业审核/, label: "已完成专业审核" },
  { re: /高风险也可以先呼吸放松/, label: "高风险也可以先呼吸放松" }
];

const allowedForbiddenContexts = [
  "不要说",
  "不要说系统能",
  "禁止写法",
  "不出现",
  "P0 示例",
  "没有被包装成",
  "不写“已完成真实用户研究",
  "不写“已完成专业审核",
  "不得把 A07 写成",
  "不得把 A08 写成",
  "是否可写“已完成真实用户研究” | 否",
  "是否可写“已完成专业审核” | 否",
  "高风险优先求助，普通练习不作为主路径"
  ,"| 临床验证、疗效证明"
];

const failures = [];
const warnings = [];

function fullPath(relativePath) {
  return join(root, relativePath);
}

function readText(relativePath) {
  return readFileSync(fullPath(relativePath), "utf8");
}

function addFailure(message) {
  failures.push(message);
}

for (const file of requiredFiles) {
  if (!existsSync(fullPath(file))) addFailure(`Missing required file: ${file}`);
}

for (const file of requiredEvidence) {
  const path = fullPath(file);
  if (!existsSync(path)) {
    addFailure(`Missing evidence screenshot: ${file}`);
    continue;
  }
  const size = statSync(path).size;
  if (size < 10_000) addFailure(`Evidence screenshot looks too small: ${file} (${size} bytes)`);
}

for (const [file, phrases] of requiredText) {
  if (!existsSync(fullPath(file))) continue;
  const text = readText(file);
  for (const phrase of phrases) {
    if (!text.includes(phrase)) addFailure(`Missing phrase in ${file}: ${phrase}`);
  }
}

for (const file of textFiles) {
  if (!existsSync(fullPath(file))) continue;
  const text = readText(file);
  for (const { re, label } of forbiddenPatterns) {
    const matches = [...text.matchAll(new RegExp(re.source, `${re.flags}g`))];
    for (const match of matches) {
      const start = Math.max(0, match.index - 80);
      const end = Math.min(text.length, match.index + match[0].length + 80);
      const context = text.slice(start, end).replace(/\s+/g, " ");
      const allowed = allowedForbiddenContexts.some((allowedContext) => context.includes(allowedContext));
      if (!allowed) addFailure(`Potentially unsafe phrase "${label}" in ${file}: ${context}`);
    }
  }
}

const ruleCases = JSON.parse(readText("tests/rule-cases.json"));
if (ruleCases.length < 18) addFailure(`Expected at least 18 rule cases, found ${ruleCases.length}`);
for (const id of ["R14", "R15", "R16", "R17", "R18"]) {
  if (!ruleCases.some((item) => item.id === id)) addFailure(`Missing boundary rule case: ${id}`);
}

const selfReview = readText("docs/自我审查项目.md");
const userStudyEvidenceFiles = [
  "docs/user-study-evidence/trial-summary.md",
  "docs/user-study-evidence/participant-ledger.csv",
  "docs/user-study-evidence/feedback-quotes.md",
  "docs/user-study-evidence/consent-script.md",
  "docs/user-study-evidence/risk-events.md"
];
const professionalReviewEvidenceFiles = [
  "docs/professional-review-evidence/review-summary.md",
  "docs/professional-review-evidence/review-issues.csv",
  "docs/professional-review-evidence/material-version.md",
  "docs/professional-review-evidence/fix-log.md",
  "docs/professional-review-evidence/permission-note.md"
];

const hasCompleteUserStudyEvidence = userStudyEvidenceFiles.every((file) => existsSync(fullPath(file)));
const hasCompleteProfessionalReviewEvidence = professionalReviewEvidenceFiles.every((file) => existsSync(fullPath(file)));

if (!selfReview.includes("A07 | 是否有真实用户研究结果 | 待执行")) {
  addFailure("A07 should remain 待执行 until real anonymous trial data is available.");
}
if (!selfReview.includes("A08 | 是否有专业审核意见 | 待执行")) {
  addFailure("A08 should remain 待执行 until real professional review is available.");
}
if (!hasCompleteUserStudyEvidence && /A07 \| 是否有真实用户研究结果 \| (通过|基本通过)/.test(selfReview)) {
  addFailure("A07 cannot be marked complete before all required user-study evidence files exist.");
}
if (!hasCompleteProfessionalReviewEvidence && /A08 \| 是否有专业审核意见 \| (通过|基本通过)/.test(selfReview)) {
  addFailure("A08 cannot be marked complete before all required professional-review evidence files exist.");
}

if (warnings.length) {
  for (const warning of warnings) console.warn(`[WARN] ${warning}`);
}

if (failures.length) {
  for (const failure of failures) console.error(`[FAIL] ${failure}`);
  console.error(`\nSelf-audit failed with ${failures.length} issue(s).`);
  process.exit(1);
}

console.log("Self-audit passed: positioning, evidence files, boundary cases, and data/review status are consistent.");
