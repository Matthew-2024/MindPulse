import type { PolicyReference, RiskMode } from "./types";

export const POLICY_DISCLOSURE =
  "下面的公开资料只是帮助我们把边界说清楚，不代表已经有专业审核、临床验证或治疗效果。";

export const POLICY_REFERENCES: readonly PolicyReference[] = [
  {
    id: "nice-ng225",
    authority: "NICE",
    publishedYear: "2022",
    title: "Self-harm: assessment, management and preventing recurrence (NG225)",
    url: "https://www.nice.org.uk/guidance/ng225/chapter/Recommendations#risk-assessment-tools-and-scales",
    evidenceClass: "public-guidance",
    supports: "风险标签不能单独决定处置；产品应把人工评估、支持连接和后续跟进放在分数之前。",
    doesNotSupport: "不能推出对未来自杀或重复自伤的预测，也不能证明本产品有临床效果。"
  },
  {
    id: "who-suicide",
    authority: "WHO",
    publishedYear: "n.d.",
    title: "Suicide",
    url: "https://www.who.int/health-topics/suicide",
    evidenceClass: "public-guidance",
    supports: "支持早期识别、评估、管理、后续跟进，以及医疗、教育、家庭和社区协作。",
    doesNotSupport: "不能把网页规则当作危机干预终点、医疗评估或自动上报机制。"
  },
  {
    id: "nice-ecd7",
    authority: "NICE",
    publishedYear: "2022",
    title: "Evidence standards framework for digital health technologies (ECD7)",
    url: "https://www.nice.org.uk/corporate/ecd7",
    evidenceClass: "evidence-framework",
    supports: "支持把可复现规则、公开资料、用户试用、专业审核和临床有效性证据分层展示。",
    doesNotSupport: "不能因为引用公开资料或通过规则测试就声称产品已完成临床验证。"
  },
  {
    id: "who-digital-health",
    authority: "WHO",
    publishedYear: "2021",
    title: "Global strategy on digital health 2020-2025",
    url: "https://www.who.int/publications/i/item/9789240020924",
    evidenceClass: "public-guidance",
    supports: "支持从人员、组织、技术、治理和隐私边界审视数字健康产品。",
    doesNotSupport: "不能证明本地原型已经完成真实部署、互操作、治理或隐私影响评估。"
  }
];

const referenceIdsByMode: Record<RiskMode, string[]> = {
  action: ["nice-ng225", "nice-ecd7", "who-digital-health"],
  ask: ["nice-ng225", "who-suicide", "nice-ecd7"],
  help: ["nice-ng225", "who-suicide", "who-digital-health"]
};

export function policyReferencesFor(mode: RiskMode): PolicyReference[] {
  const ids = referenceIdsByMode[mode] || referenceIdsByMode.ask;
  return ids
    .map((id) => POLICY_REFERENCES.find((reference) => reference.id === id))
    .filter((reference): reference is PolicyReference => Boolean(reference));
}

export function policyNotesFor(mode: RiskMode): string[] {
  const modeNote = mode === "help"
    ? "现在先求助：遇到危险内容时，先联系热线、老师、家人或身边可信任的人。"
    : mode === "ask"
      ? "记录还不够：先补充记录，不急着给出确定的健康结论。"
      : mode === "action"
        ? "目前可以先做小事：记录前后的变化只代表这一次，不说明因果或治疗效果。"
        : "现在只提供支持和方向，不给出确定的健康结论。";
  return [POLICY_DISCLOSURE, modeNote];
}
