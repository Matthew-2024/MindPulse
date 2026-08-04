import { ArrowLeft, ArrowRight, Check, CircleDot, Clock3, HeartHandshake, LockKeyhole } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useMindPulse } from "../../app/store";
import { canEnterCompanion, isHighRisk } from "../../domain/evaluate-state";
import type { InterventionEvent, InterventionFeedbackBurden } from "../../domain/types";
import { feedbackWindowFor } from "../../rules/intervention-feedback.js";
import { summarizeInterventionFeedback } from "../../rules/personalization.js";

const labels: Record<string, string> = {
  breathe: "把身体降下来",
  walk: "离开原地十分钟",
  journal: "把最重要的一件事写下来",
  friend: "让一个人知道你现在的状态",
  sleep: "为今晚留出恢复空间",
  focus: "只做一件最小的事"
};

const descriptions: Record<string, string> = {
  breathe: "先让呼吸和注意力有一个可重复的落点，不要求你马上感觉变好。",
  walk: "短暂改变所在的位置，让身体从原来的循环里离开一会儿。",
  journal: "把脑内不断回放的内容放到纸面上，只需要写下一句话。",
  friend: "连接支持比独自解释清楚更重要，先让一个真实的人知道。",
  sleep: "今天先把恢复空间留出来，暂时不把疲惫解释成失败。",
  focus: "缩小下一步的范围，让行动保持在现在做得到的尺度。"
};

function timeLabel(value?: string) {
  if (!value) return "稍后";
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function CompanionPage() {
  const { decision, state, completeIntervention, recordInterventionOutcome } = useMindPulse();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [event, setEvent] = useState<Awaited<ReturnType<typeof completeIntervention>> | null>(null);
  const [outcomeEvent, setOutcomeEvent] = useState<InterventionEvent | null>(null);
  const [burden, setBurden] = useState<InterventionFeedbackBurden>("low");
  const [note, setNote] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  const action = decision.recommendation.path[0] || "breathe";
  const completion = event || [...state.interventionEvents].reverse().find((item) => item.eventType === "completion") || null;
  const feedbackAction = completion?.interventionId || action;
  const feedbackWindow = feedbackWindowFor(completion);
  const existingFeedback = useMemo(() => (
    completion
      ? [...state.interventionEvents].reverse().find((item) => item.eventType === "outcome-feedback" && item.feedbackCompletionEventId === completion.id) || null
      : null
  ), [completion, state.interventionEvents]);
  const learning = summarizeInterventionFeedback(state.interventionEvents, state.interventionStats);
  const actionLearning = learning[feedbackAction];
  const learningCount = actionLearning?.count || 0;
  const learningReady = Boolean(actionLearning?.eligible);
  const feedbackDue = Boolean(feedbackWindow && clock >= new Date(feedbackWindow.opensAt).getTime());
  const feedbackExpired = Boolean(feedbackWindow && clock > new Date(feedbackWindow.closesAt).getTime());

  useEffect(() => {
    if (step !== 2 || existingFeedback) return;
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [existingFeedback, step]);

  if (!canEnterCompanion(decision.risk)) return <Navigate to={isHighRisk(decision.risk) ? "/help" : "/checkin"} replace />;

  async function finishAction() {
    if (action === "friend") {
      navigate("/help");
      return;
    }
    try {
      const result = await completeIntervention(action);
      setEvent(result);
      setClock(Date.now());
      setStep(2);
    } catch {
      navigate("/help");
    }
  }

  async function submitOutcome(outcome: "better" | "same" | "worse" | "skipped") {
    if (!completion) return;
    setFeedbackError("");
    try {
      const result = await recordInterventionOutcome({
        completionEventId: completion.id,
        outcome,
        burden: outcome === "skipped" ? undefined : burden,
        note: outcome === "skipped" ? "" : note
      });
      setOutcomeEvent(result);
    } catch {
      setFeedbackError("这次反馈没有保存。请稍后再试，或直接跳过。");
    }
  }

  return (
    <div className="page-content narrow-page companion-page">
      <div className="page-intro">
        <div>
          <Link to="/" className="back-link"><ArrowLeft size={16} />首页</Link>
          <span className="eyebrow">陪你走一步</span>
          <h1>现在只做这一件事。</h1>
          <p>行动前先知道原因，行动后再记录主观反馈。它不是治疗任务，也不要求你证明自己变好了。</p>
        </div>
      </div>

      <div className="companion-progress" aria-label={`流程第 ${step + 1} 步，共 3 步`}>
        {["当前状态", "为什么推荐", "稍后反馈"].map((label, index) => <span className={index <= step ? "is-active" : ""} key={label}><i>{index + 1}</i>{label}</span>)}
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
            <span className="eyebrow">行动后的主观反馈</span>
            {outcomeEvent || existingFeedback ? (
              <>
                <h2>反馈已记录。</h2>
                <p>这是一条关于当时感受的本地记录，不代表因果关系、疗效或诊断结果。</p>
                <div className="feedback-result" data-testid="outcome-feedback-result"><span>本次反馈</span><strong>{(outcomeEvent || existingFeedback)?.outcome === "skipped" ? "已跳过" : "已保存"}</strong></div>
              </>
            ) : feedbackExpired ? (
              <>
                <h2>这次反馈窗口已结束。</h2>
                <p>超过 30 分钟后不再把回忆中的感受用于排序，避免把之后的变化混在这一步里。</p>
                <div className="feedback-result"><span>本次反馈</span><strong>未计入</strong></div>
              </>
            ) : !feedbackDue ? (
              <>
                <h2>这一步已记下。</h2>
                <p>请先回到自己的节奏里。本次记录的变化会在 {timeLabel(feedbackWindow?.opensAt)} 后通过你的主观感受来记录；这次窗口会在 {timeLabel(feedbackWindow?.closesAt)} 结束。</p>
                <div className="feedback-result" data-testid="outcome-feedback-waiting"><span><Clock3 size={15} />主观反馈</span><strong>10-30 分钟后</strong></div>
              </>
            ) : (
              <div className="outcome-feedback" data-testid="outcome-feedback-form">
                <h2>做完这一步后，你当时感觉怎样？</h2>
                <p>只记录你的主观感受。没有正确答案，也不会据此做出健康判断。</p>
                <div className="feedback-choice-row" aria-label="主观感受">
                  <button type="button" className="button button-secondary" onClick={() => submitOutcome("better")}>好一些</button>
                  <button type="button" className="button button-secondary" onClick={() => submitOutcome("same")}>差不多</button>
                  <button type="button" className="button button-secondary" onClick={() => submitOutcome("worse")}>更难受</button>
                </div>
                <fieldset className="feedback-burden">
                  <legend>这一步对你有多费力？</legend>
                  <div className="feedback-choice-row">
                    {(["low", "medium", "high"] as const).map((value) => <button key={value} type="button" className={`button button-quiet ${burden === value ? "is-selected" : ""}`} aria-pressed={burden === value} onClick={() => setBurden(value)}>{value === "low" ? "不太费力" : value === "medium" ? "有些费力" : "很费力"}</button>)}
                  </div>
                </fieldset>
                <label className="input-field feedback-note"><span>可选备注</span><textarea value={note} maxLength={280} onChange={(input) => setNote(input.target.value)} placeholder="只保存在这台设备，不会自动分享或导出。" /></label>
                {feedbackError ? <p className="feedback-error" role="alert">{feedbackError}</p> : null}
                <button type="button" className="button button-quiet" onClick={() => submitOutcome("skipped")}>跳过这次反馈</button>
              </div>
            )}
            <div className="companion-footer">
              <div className="learning-proof">
                <span><LockKeyhole size={14} />更适合你的做法：{learningReady ? "已有初步样本可比较" : "还在积累记录"}</span>
                <small>有用记录 {Math.min(learningCount, 3)} / 3 · {actionLearning?.confidenceText || "高风险、时机不合适或情境改变的反馈不会用于排序"}</small>
              </div>
              <Link className="button button-primary button-with-icon" to="/">回到状态总览 <ArrowRight size={16} /></Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
