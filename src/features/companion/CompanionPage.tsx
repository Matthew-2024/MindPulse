import { ArrowLeft, ArrowRight, Check, CircleDot, HeartHandshake, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useMindPulse } from "../../app/store";
import { canEnterCompanion, isHighRisk, isInsufficient } from "../../domain/evaluate-state";
import { summarizeInterventionFeedback } from "../../rules/personalization.js";

const labels: Record<string, string> = {
  breathe: "把身体降下来",
  walk: "离开原地十分钟",
  journal: "把最重的一件事写下来",
  friend: "让一个人知道你现在的状态",
  sleep: "为今晚留出恢复空间",
  focus: "只做一件最小的事"
};

const descriptions: Record<string, string> = {
  breathe: "先让呼吸和注意力有一个可重复的落点，不要求你马上感觉变好。",
  walk: "短暂改变所在的位置，让身体从原来的循环里离开一会儿。",
  journal: "把脑内不断回放的内容放到纸面上，只需要写下一个句子。",
  friend: "连接支持比独自解释清楚更重要，先让一个真实的人知道。",
  sleep: "今天先把恢复空间留出来，暂时不把疲惫解释成失败。",
  focus: "缩小下一步的范围，让行动保持在现在做得到的尺度。"
};

export function CompanionPage() {
  const { decision, state, completeIntervention } = useMindPulse();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [event, setEvent] = useState<Awaited<ReturnType<typeof completeIntervention>> | null>(null);
  const action = decision.recommendation.path[0] || "breathe";
  const learning = summarizeInterventionFeedback(state.interventionEvents, state.interventionStats);
  const actionLearning = learning[action];
  const learningCount = actionLearning?.count || 0;
  const learningReady = Boolean(actionLearning?.eligible);

  if (!canEnterCompanion(decision.risk)) return <Navigate to={isHighRisk(decision.risk) ? "/help" : "/checkin"} replace />;

  async function finishAction() {
    if (action === "friend") {
      navigate("/help");
      return;
    }
    try {
      const result = await completeIntervention(action);
      setEvent(result);
      setStep(2);
    } catch (error) {
      navigate("/help");
    }
  }

  return (
    <div className="page-content narrow-page companion-page">
      <div className="page-intro">
        <div>
          <Link to="/" className="back-link"><ArrowLeft size={16} />首页</Link>
          <span className="eyebrow">陪你走一步</span>
          <h1>现在只做这一件事。</h1>
          <p>行动前先知道原因，行动后再记录反馈。它不是治疗任务，也不要求你证明自己变好了。</p>
        </div>
      </div>

      <div className="companion-progress" aria-label={`流程第 ${step + 1} 步，共 3 步`}>
        {["当前状态", "为什么推荐", "记录反馈"].map((label, index) => <span className={index <= step ? "is-active" : ""} key={label}><i>{index + 1}</i>{label}</span>)}
      </div>

      <section className="companion-card">
        <div className="companion-mark"><HeartHandshake size={25} /></div>
        {step === 0 ? (
          <>
            <span className="eyebrow">现在的状态</span>
            <h2>{decision.baseline.title}</h2>
            <p>{decision.baseline.desc}</p>
            <div className="companion-signal"><CircleDot size={15} />当前建议：<strong>{labels[action] || action}</strong></div>
            <button className="button button-primary button-with-icon" type="button" onClick={() => setStep(1)}>看为什么 <ArrowRight size={16} /></button>
          </>
        ) : step === 1 ? (
          <>
            <span className="eyebrow">为什么做这一步</span>
            <h2>{labels[action] || action}</h2>
            <p>{descriptions[action] || decision.recommendation.explanation}</p>
            <div className="reason-box"><strong>{decision.recommendation.reason}</strong><span>为什么这样建议：{decision.trace.evidence.join("；") || "和你过去的记录差不多"}</span></div>
            <div className="companion-actions"><button className="button button-quiet" type="button" onClick={() => setStep(0)}>返回</button><button className="button button-primary button-with-icon" type="button" onClick={finishAction}>完成这一步 <Check size={16} /></button></div>
          </>
        ) : (
          <>
            <span className="eyebrow">记录这次变化</span>
            <h2>谢谢你留下反馈。</h2>
            <p>本次记录中的分数从 <strong>{event?.beforeScore ?? "—"}</strong> 变为 <strong>{event?.afterScore ?? "—"}</strong>。这只是本次记录的变化，不代表因果或治疗效果。</p>
            <div className="feedback-result"><span>本次变化</span><strong>{event ? `${event.delta > 0 ? "+" : ""}${event.delta}` : "已记录"}</strong></div>
            <div className="companion-footer">
              <div className="learning-proof">
                <span><LockKeyhole size={14} />更适合你的做法：{learningReady ? "已经看出一点规律" : "还在积累记录"}</span>
                <small>已有用记录 {Math.min(learningCount, 3)} / 3 · 高风险记录不会用于判断</small>
              </div>
              <Link className="button button-primary button-with-icon" to="/">回到状态总览 <ArrowRight size={16} /></Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
