import { Ban, BookOpen, Check, ExternalLink, FileSearch, Info, Timer } from "lucide-react";
import type { MindPulseDecision } from "../domain/types";
import { actionLabel, reasonLabel } from "../domain/display-labels";

const confidenceLabels: Record<string, string> = { high: "较高", medium: "中等", low: "较低" };

export function DecisionTrace({ decision }: { decision: MindPulseDecision }) {
  const { trace } = decision;
  return (
    <section className="trace-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">判断过程</span>
          <h2>这次判断是怎么来的</h2>
        </div>
        <span className="version-badge">当前规则</span>
      </div>
      <p className="trace-explanation"><Info size={16} />{trace.explanation}</p>
      <div className="trace-columns">
        <div>
          <h3><FileSearch size={15} /> 为什么这样判断</h3>
          <ul className="evidence-list">
            {(trace.evidence.length ? trace.evidence : ["目前没有额外提示"]).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
          </ul>
        </div>
        <div>
          <h3><Check size={15} /> 你可以先做</h3>
          <div className="action-tags action-tags-allow">
            {(trace.allowedActions.length ? trace.allowedActions : ["无"]).map((item) => <span key={item}>{actionLabel(item)}</span>)}
          </div>
        </div>
        <div>
          <h3><Ban size={15} /> 暂时不建议</h3>
          <div className="action-tags action-tags-block">
            {(trace.blockedActions.length ? trace.blockedActions : ["无"]).map((item) => <span key={item}>{actionLabel(item)}</span>)}
          </div>
        </div>
      </div>
      <section className="trace-policy" data-testid="policy-basis">
        <div className="trace-policy-head">
          <div>
            <span className="eyebrow">参考资料</span>
            <h3><BookOpen size={15} />为什么要这样设计</h3>
          </div>
          <span className="policy-status">使用范围</span>
        </div>
        <p className="trace-policy-disclosure">{trace.policyNotes[0] || "公开资料仅用于边界设计，不代表临床验证。"}</p>
        <div className="policy-reference-list">
          {trace.policyReferences.map((reference) => (
            <article className="policy-reference" data-policy-id={reference.id} key={reference.id}>
              <div className="policy-reference-meta"><strong>{reference.authority}</strong><span>{reference.publishedYear}</span></div>
              <h4>{reference.title}</h4>
              <p>{reference.supports}</p>
              <p className="policy-boundary"><strong>不能推出</strong>{reference.doesNotSupport}</p>
              <a href={reference.url} target="_blank" rel="noreferrer">查看公开来源<ExternalLink size={12} /></a>
            </article>
          ))}
        </div>
        {trace.policyNotes.slice(1).map((note) => <p className="policy-mode-note" key={note}><strong>请记住</strong>{note}</p>)}
      </section>
      <div className="trace-footer">
        <span>数据来源：{trace.dataSource}</span>
        <span>判断可靠度：{confidenceLabels[trace.confidence] || trace.confidence}</span>
        <span>为什么：{trace.reasonCodes.map((code) => reasonLabel(code)).join("、")}</span>
        <span><Timer size={12} />记录时间：{new Date(trace.evaluatedAt).toLocaleString("zh-CN", { hour12: false })}</span>
        <span>规则结果不是诊断、因果判断或治疗效果。</span>
      </div>
    </section>
  );
}
