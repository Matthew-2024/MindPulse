import { ArrowLeft, Database, FlaskConical, Info, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMindPulse } from "../../app/store";
import { evaluateState } from "../../domain/evaluate-state";
import type { MindPulseRecord } from "../../domain/types";
import { BaselineDelta } from "../../components/BaselineDelta";
import { DecisionTrace } from "../../components/DecisionTrace";
import { ScoreSnapshot } from "../../components/ScoreSnapshot";
import { actionLabel, modeLabel } from "../../domain/display-labels";

const signalLabels: Record<string, string> = { mood: "情绪", sleep: "睡眠", steps: "活动", social: "连接", intervention: "行动反馈" };

export function InsightPage() {
  const { state, decision } = useMindPulse();
  const [scenario, setScenario] = useState<"current" | "sleep" | "social">("current");
  const latest = state.records.at(-1) || {};
  const simulatedDecision = useMemo(() => {
    if (scenario === "current") return decision;
    const simulated: MindPulseRecord = scenario === "sleep"
      ? { ...latest, sleepHours: Math.max(0, Number(latest.sleepHours || 0) + 1.5), note: latest.note }
      : { ...latest, socialScore: Math.min(100, Number(latest.socialScore || 0) + 25), connectionNeed: "ok" };
    const records = state.records.length ? [...state.records.slice(0, -1), simulated] : [simulated];
    return evaluateState(records, simulated.note || "", state.interventionEvents, state.interventionStats, state.safetyHold);
  }, [decision, latest, scenario, state.interventionEvents, state.interventionStats, state.records, state.safetyHold]);
  const simulatedScoreUnavailable = simulatedDecision.risk.mode === "ask";
  const scoreUnavailable = decision.risk.mode === "ask";
  const referenceScore = decision.score.referenceScore;

  return (
    <div className="page-content insight-page">
      <div className="page-intro">
        <div>
          <Link to="/" className="back-link"><ArrowLeft size={16} />首页</Link>
          <span className="eyebrow">看看为什么</span>
          <h1>看见判断，也看见它的边界。</h1>
          <p>这里会说明分数从哪里来、和你平时有什么不同，以及为什么建议你这样做。它描述的是记录，不是诊断。</p>
        </div>
      </div>

      <ScoreSnapshot decision={decision} />

      <section className="insight-overview">
        <div className="insight-overview-item">
          <Database size={17} />
          <div><span>记录完整度</span><strong>{decision.baseline.dataCompleteness.percent}%</strong><small>已记 {decision.baseline.dataCompleteness.available}/{decision.baseline.dataCompleteness.required} 项</small></div>
        </div>
        <div className="insight-overview-item">
          <ShieldAlert size={17} />
          <div><span>接下来怎么做</span><strong>{modeLabel(decision.risk.mode)}</strong><small>{decision.risk.reason}{decision.score.missingSignals?.length ? " 缺少：" + decision.score.missingSignals.map((key) => signalLabels[key] || key).join("、") : ""}</small></div>
        </div>
      </section>

      <section className="section-block contribution-section">
        <div className="section-heading"><div><span className="eyebrow">各项记录的影响</span><h2>{scoreUnavailable ? "先看已收集信号" : "这次分数由什么组成"}</h2></div><span className="section-meta">{scoreUnavailable ? "完整状态分暂不计算；当前参考指数仅供观察" : "没填的项目不会被当成 0"}</span></div>
        <div className="contribution-list">
          {decision.score.contributions.map((item) => (
            <div className="contribution-row" key={item.signal}>
              <div className="contribution-label"><strong>{signalLabels[item.signal] || item.label}</strong><span>{item.present ? item.source : "还没填"}</span></div>
              <div className="contribution-track"><span style={{ width: `${item.present ? Math.min(100, (item.score / item.max) * 100) : 0}%` }} /></div>
              <strong className="contribution-score">{item.present ? `${item.score}/${item.max}` : "—"}</strong>
              <span className="contribution-reason">{scoreUnavailable && item.present ? "已纳入暂定参考指数，不代表完整状态分" : item.reason}</span>
            </div>
          ))}
        </div>
      </section>

      <BaselineDelta baseline={decision.baseline} />
      <DecisionTrace decision={decision} />

      <section className="section-block counterfactual-section">
        <div className="section-heading"><div><span className="eyebrow">换个情况看看</span><h2>如果只改变一个地方</h2></div><FlaskConical size={18} /></div>
        <p className="section-intro"><Info size={15} />这是按照现有记录做的模拟，不是预测，也不能说明某个行动有治疗效果。</p>
        <div className="segmented-control simulation-control">
          <button className={scenario === "current" ? "is-active" : ""} type="button" onClick={() => setScenario("current")}><SlidersHorizontal size={15} />当前记录</button>
          <button className={scenario === "sleep" ? "is-active" : ""} type="button" onClick={() => setScenario("sleep")}>睡眠多 1.5 小时</button>
          <button className={scenario === "social" ? "is-active" : ""} type="button" onClick={() => setScenario("social")}>连接感多 25 分</button>
        </div>
        <div className="simulation-result">
          <div><span>模拟参考</span><strong>{simulatedScoreUnavailable
            ? simulatedDecision.score.referenceScore == null ? "—" : `${simulatedDecision.score.referenceScore}（暂定）`
            : simulatedDecision.score.total}</strong></div>
          <div><span>模拟安排</span><strong>{modeLabel(simulatedDecision.risk.mode)}</strong></div>
          <div><span>建议先做</span><strong>{actionLabel(simulatedDecision.recommendation.path[0] || "—")}</strong></div>
        </div>
      </section>
    </div>
  );
}
