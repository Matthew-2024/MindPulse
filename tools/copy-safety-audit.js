import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const targets = [
  "心晴MindPulse_Web原型.html",
  "README.md",
  "docs/Supabase云端同步方案.md",
  "docs/PPT与答辩自查口径同步稿.md",
  "docs/匿名试用执行包.md",
  "docs/专业审核执行包.md"
];

const checks = [
  {
    re: /你(?:现在|已经)?(?:很)?危险/,
    label: "直接把用户描述为危险",
    guidance: "改成“现在很需要支持/需要尽快让可信任的人知道”。"
  },
  {
    re: /你(?:现在|已经)?不(?:太)?安全/,
    label: "直接把用户描述为不安全",
    guidance: "改成“现在很需要支持/先联系可信任的人”。"
  },
  {
    re: /必须(?:马上|立刻|立即)(?!.*(?:联系|求助|停止普通|重新跑|标注|提供|运行|补齐|统一|保留))/,
    label: "命令式必须马上",
    guidance: "保留求助场景的明确行动，普通场景改成“建议/可以”。"
  },
  {
    re: /(?:完蛋|没救|不可逆|无法恢复|糟糕透了|严重失控)/,
    label: "灾难化表达",
    guidance: "改成低负担、可退出、可求助的描述。"
  },
  {
    re: /(?:重度|轻度)(?:抑郁|焦虑|障碍|症状)/,
    label: "诊断化程度标签",
    guidance: "改成“分数很高/分数有波动/负担偏重”。"
  },
  {
    re: /(?:马上|立刻|立即)(?:好起来|恢复|改善)/,
    label: "即时改善承诺",
    guidance: "改成“先把负担降一点/先完成一个低负担动作”。"
  }
];

const allowedContexts = [
  "如果有即时危险",
  "当地紧急救助",
  "当地紧急支持资源",
  "立即停止普通试用反馈",
  "立即停止提交或演示",
  "必须重新跑规则测试",
  "必须标注",
  "必须提供",
  "必须补齐",
  "必须同步",
  "必须统一",
  "必须保留",
  "国赛必须继续补齐",
  "提交前必须修复",
  "必须先统一",
  "强烈绝望",
  "强烈建议",
  "禁止写法"
];

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function contextFor(text, index, length) {
  const start = Math.max(0, index - 90);
  const end = Math.min(text.length, index + length + 90);
  return text.slice(start, end).replace(/\s+/g, " ");
}

const failures = [];

for (const file of targets) {
  const text = read(file);
  for (const check of checks) {
    const re = new RegExp(check.re.source, `${check.re.flags}g`);
    for (const match of text.matchAll(re)) {
      const context = contextFor(text, match.index, match[0].length);
      const allowed = allowedContexts.some((allowedContext) => context.includes(allowedContext));
      if (!allowed) {
        failures.push(`${check.label} in ${file}: ${context}\n  ${check.guidance}`);
      }
    }
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`[FAIL] ${failure}`);
  console.error(`\nCopy safety audit failed with ${failures.length} issue(s).`);
  process.exit(1);
}

console.log("Copy safety audit passed: no panic-amplifying, diagnostic, or cure-promising copy was found in checked materials.");
