import { ArrowLeft, Ban, BookOpen, CheckCircle2, ExternalLink, FlaskConical, LockKeyhole, ShieldCheck, TerminalSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useMindPulse } from "../../app/store";
import { canEnterCompanion, canStartAction, evaluateState } from "../../domain/evaluate-state";
import { summarizeInterventionFeedback } from "../../rules/personalization.js";
import type { MindPulseRecord } from "../../domain/types";
import { policyNotesFor, policyReferencesFor } from "../../domain/policy-basis";
import { actionLabel, modeLabel, reasonLabel } from "../../domain/display-labels";

const fixtures: Array<{ id: string; name: string; records: MindPulseRecord[] }> = [
  { id: "LAB-01", name: "数据不足", records: [] },
  {
    id: "LAB-02",
    name: "普通波动",
    records: [
      { mood: "calm", sleepHours: 7, steps: 6500, socialScore: 60, note: "前四天" },
      { mood: "calm", sleepHours: 7.2, steps: 6800, socialScore: 64, note: "前三天" },
      { mood: "happy", sleepHours: 7.5, steps: 7200, socialScore: 68, note: "前两天" },
      { mood: "anxious", sleepHours: 6.5, steps: 4200, socialScore: 45, note: "有一点紧张" }
    ]
  },
  { id: "LAB-03", name: "高风险：先求助", records: [{ mood: "sad", sleepHours: 4, steps: 1000, socialScore: 10, note: "我想从这个世界上消失" }] }
];

export function RuleLabPage() {
  const { decision, state } = useMindPulse();
  const [selectedId, setSelectedId] = useState("LAB-03");
  const results = useMemo(() => fixtures.map((fixture) => ({
    ...fixture,
    records: fixture.records.map((record) => ({ ...record, dataMode: "synthetic-demo" as const, entryType: "synthetic" as const })),
    decision: evaluateState(fixture.records.map((record) => ({ ...record, dataMode: "synthetic-demo" as const, entryType: "synthetic" as const })), fixture.records.at(-1)?.note || "")
  })), []);
  const selected = results.find((item) => item.id === selectedId) || results[0];
  const highRiskResult = results.find((item) => item.id === "LAB-03")?.decision;
  const insufficientResult = results.find((item) => item.id === "LAB-01")?.decision;
  const highRiskOnlyHelp = Boolean(
    highRiskResult
      && highRiskResult.risk.allowedActions.length === 1
      && highRiskResult.risk.allowedActions[0] === "help"
      && highRiskResult.recommendation.path[0] === "help"
  );
  const highRiskActionBlocked = Boolean(highRiskResult && !canStartAction("breathe", highRiskResult.risk));
  const dataGatePass = Boolean(insufficientResult && insufficientResult.risk.mode === "ask" && !canStartAction("ordinary_intervention", insufficientResult.risk));
  const companionGatePass = Boolean(highRiskResult && !canEnterCompanion(highRiskResult.risk));
  const highRiskLearningPass = !summarizeInterventionFeedback([
    { interventionId: "breathe", delta: 4, riskCode: "high", mode: "help" }
  ]).breathe;
  const currentLearning = summarizeInterventionFeedback(state.interventionEvents, state.interventionStats)[decision.recommendation.path[0]];
  const gatePass = highRiskOnlyHelp && highRiskActionBlocked && dataGatePass && companionGatePass && highRiskLearningPass;
  const currentPolicyReferences = policyReferencesFor(decision.trace.mode);
  const currentPolicyNotes = policyNotesFor(decision.trace.mode);

  return (
    <div className="page-content rule-lab-page">
      <div className="page-intro">
        <div>
          <Link to="/" className="back-link"><ArrowLeft size={16} />首页</Link>
          <span className="eyebrow">规则说明</span>
          <h1>看看心晴遇到不同情况会怎么做。</h1>
          <p>这里展示的是心晴的判断方式，不是训练数据，也不是伪造的用户效果。</p>
        </div>
        <FlaskConical size={24} />
      </div>

      <section className="rule-summary">
        <div className="rule-summary-icon"><ShieldCheck size={22} /></div>
        <div><span className="eyebrow">现在的规则</span><h2>先保护人，再给建议</h2><p>遇到危险内容时先求助；记录不够时先补充；普通波动时可以先做小事。</p></div>
        <div className={`rule-pass ${gatePass ? "is-pass" : "is-fail"}`}>{gatePass ? <CheckCircle2 size={18} /> : <Ban size={18} />}{gatePass ? "安全检查通过" : "需要检查"}</div>
      </section>

      <section className="section-block rule-policy-basis">
        <div className="section-heading">
          <div><span className="eyebrow">参考资料</span><h2><BookOpen size={17} />为什么要这样设计</h2></div>
          <span className="section-meta">公开资料 / 不含用户记录</span>
        </div>
        <p className="policy-disclosure">{currentPolicyNotes[0]}</p>
        <div className="policy-reference-list">
          {currentPolicyReferences.map((reference) => (
            <article className="policy-reference" data-policy-id={reference.id} key={reference.id}>
              <div className="policy-reference-meta"><strong>{reference.authority}</strong><span>{reference.publishedYear}</span></div>
              <h4>{reference.title}</h4>
              <p>{reference.supports}</p>
              <p className="policy-boundary"><strong>不能推出</strong>{reference.doesNotSupport}</p>
              <a href={reference.url} target="_blank" rel="noreferrer">查看公开来源<ExternalLink size={12} /></a>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block rule-fixtures">
        <div className="section-heading"><div><span className="eyebrow">三种情况</span><h2>如果遇到这些情况</h2></div><span className="section-meta">示例场景</span></div>
        <p className="fixture-disclaimer">下面都是示例，只用来现场检查规则，不代表真实用户；公开资料只用来说明边界，不会混进示例记录。</p>
        <div className="fixture-list">
          {results.map(({ id, name, decision: result }) => (
            <button
              className={`fixture-row ${result.risk.mode === "help" ? "fixture-row-danger" : ""} ${selectedId === id ? "is-selected" : ""}`}
              data-fixture-id={id}
              key={id}
              onClick={() => setSelectedId(id)}
              type="button"
              aria-pressed={selectedId === id}
            >
              <span className="fixture-id"><TerminalSquare size={15} /><code>{id}</code></span>
              <span className="fixture-copy"><strong>{name}</strong><span>{result.risk.reason}</span></span>
              <span className="fixture-output"><span className={`mode-tag mode-${result.risk.mode}`}>{modeLabel(result.risk.mode)}</span><strong>{result.recommendation.path.map(actionLabel).join(" → ")}</strong><small>{result.trace.reasonCodes.map(reasonLabel).join(" · ")} <code>{result.trace.reasonCodes.join(" · ")}</code></small></span>
            </button>
          ))}
        </div>
        <section className={`fixture-detail ${selected.decision.risk.mode === "help" ? "fixture-detail-danger" : ""}`} aria-live="polite">
          <div className="fixture-detail-head">
            <div><span className="eyebrow">当前情况 / {selected.id}</span><h3>{selected.name}</h3></div>
            <span className={`mode-tag mode-${selected.decision.risk.mode}`}>{modeLabel(selected.decision.risk.mode)}</span>
          </div>
          <p>{selected.decision.trace.explanation}</p>
          <div className="fixture-detail-grid">
            <div><span>建议先做</span><strong>{actionLabel(selected.decision.recommendation.path[0] || "—")}</strong></div>
            <div><span>为什么</span><strong>{selected.decision.trace.reasonCodes.map(reasonLabel).join(" · ")}</strong></div>
            <div><span>可以先做</span><strong>{selected.decision.trace.allowedActions.map(actionLabel).join(" · ") || "无"}</strong></div>
            <div><span>暂时不建议</span><strong>{selected.decision.trace.blockedActions.map(actionLabel).join(" · ") || "无"}</strong></div>
          </div>
          <p className="fixture-code">内部编号：{selected.decision.trace.reasonCodes.join(" · ")}</p>
          <div className="fixture-policy-note">
            <span className="eyebrow">请记住</span>
            <p>{selected.decision.trace.policyNotes[1]}</p>
            <div className="policy-citation-tags">{selected.decision.trace.policyReferences.map((reference) => <span key={reference.id}>{reference.authority} · {reference.id}</span>)}</div>
          </div>
        </section>
      </section>

      <section className="section-block rule-contract">
        <div className="section-heading"><div><span className="eyebrow">安全检查</span><h2>页面不能绕过安全规则</h2></div><LockKeyhole size={18} /></div>
        <div className="contract-grid">
          <div><CheckCircle2 size={16} /><span>高风险时可以做</span><strong>{highRiskOnlyHelp ? "联系支持" : "需要检查"}</strong></div>
          <div><Ban size={16} /><span>高风险时的普通行动</span><strong>{highRiskActionBlocked ? "已暂停" : "允许"}</strong></div>
          <div><LockKeyhole size={16} /><span>记录不够时的普通行动</span><strong>{dataGatePass ? "已暂停" : "需要检查"}</strong></div>
          <div><ShieldCheck size={16} /><span>高风险时进入陪伴</span><strong>{companionGatePass ? "已暂停" : "允许"}</strong></div>
          <div><Ban size={16} /><span>高风险记录用于学习</span><strong>{highRiskLearningPass ? "不会使用" : "需要检查"}</strong></div>
          <div><LockKeyhole size={16} /><span>你的做法是否有规律</span><strong>{currentLearning?.eligible ? "已经看出" : `${Math.min(currentLearning?.count || 0, 3)} / 3`}</strong></div>
        </div>
      </section>
    </div>
  );
}
