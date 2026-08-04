import { ArrowRight, CheckCircle2, Cloud, FileText, ShieldCheck, Waves } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMindPulse } from "../../app/store";
import { isHighRisk, isInsufficient } from "../../domain/evaluate-state";
import { actionLabel } from "../../domain/display-labels";
import { BaselineDelta } from "../../components/BaselineDelta";
import { DecisionTrace } from "../../components/DecisionTrace";
import { ScoreSnapshot } from "../../components/ScoreSnapshot";
import { Timeline } from "../../components/Timeline";

type MindPulseDecision = ReturnType<typeof useMindPulse>["decision"];

const ACTION_HEADLINES: Record<string, string> = {
  breathe: "先缓下来，再把自己接住",
  walk: "先离开原地，再把自己接住",
  journal: "先把压在心里的话倒出来",
  sleep: "先停一下，不要硬撑",
  focus: "先做一件小事，再把自己接住",
  friend: "先让一个可信任的人知道"
};

function homeHeadline(decision: MindPulseDecision) {
  if (isHighRisk(decision.risk)) return "先联系一个可信任的人";
  if (isInsufficient(decision.risk)) return "先把缺少的信号补上";
  const action = decision.recommendation.path[0] || "breathe";
  return ACTION_HEADLINES[action] || "先缓下来，再把自己接住";
}

function sleepDeltaLabel(value: number | null) {
  if (value === null) return "待建立";
  return `${value > 0 ? "+" : ""}${value}%`;
}

function safetyGateLabel(decision: MindPulseDecision) {
  return isHighRisk(decision.risk) ? "已触发" : "未触发";
}

function primaryActionLabel(decision: MindPulseDecision) {
  if (isHighRisk(decision.risk)) return "打开求助入口";
  if (isInsufficient(decision.risk)) return "补充一条记录";
  return "开始第一步";
}

function stateLabel(decision: MindPulseDecision) {
  if (isHighRisk(decision.risk)) return "高风险";
  if (isInsufficient(decision.risk)) return "数据不足";
  return "普通波动";
}

export function HomePage() {
  const { state, decision } = useMindPulse();
  const navigate = useNavigate();
  const [showEvidence, setShowEvidence] = useState(false);
  const primary = decision.recommendation.path[0] || "ask";
  const highRisk = isHighRisk(decision.risk);
  const insufficient = isInsufficient(decision.risk);
  const headline = homeHeadline(decision);
  const latestScore = insufficient
    ? decision.score.referenceScore == null ? "—" : String(decision.score.referenceScore)
    : String(decision.score.total);

  function goPrimary() {
    if (highRisk || primary === "help" || primary === "friend") navigate("/help");
    else if (insufficient || primary === "ask") navigate("/checkin");
    else navigate("/companion");
  }

  const evidence = [
    { mark: "R", copy: decision.baseline.desc },
    { mark: "S", copy: highRisk ? "Safety Gate 已触发，普通自助行动暂时停止。" : "Safety Gate：出现高风险信号时停止普通自助建议。" },
    { mark: "E", copy: insufficient ? "先补充一条记录，再重新比较个人基线。" : `下一步：${decision.recommendation.reason}` }
  ];

  return (
    <div className="home-page home-immersive">
      <section className={`status-card snapshot-panel ${highRisk ? "status-card-danger snapshot-panel-danger" : ""}`}>
        {!showEvidence ? (
          <>
            <div className="status-top">
              <div>
                <div className={`status-state-marker status-state-${isHighRisk(decision.risk) ? "high" : isInsufficient(decision.risk) ? "insufficient" : "normal"}`}><span>当前状态</span><strong>{stateLabel(decision)}</strong></div>
                <h1 className="status-title">{headline}</h1>
              </div>
              <div className="score-badge" aria-label={insufficient ? latestScore === "—" ? "当前参考指数暂不可用" : `当前参考指数暂定为 ${latestScore}` : `恢复指数 ${latestScore}`}>
                <strong>{latestScore}</strong>
                <span>{insufficient ? latestScore === "—" ? "先补充记录" : "暂定参考" : "恢复指数"}</span>
              </div>
            </div>

            <p className="status-line">
              {highRisk
                ? "现在不安排普通练习，先把求助这一步发出去。"
                : insufficient
                  ? "记录还不够，先补充一条，再看看今天和自己的平时有什么不同。"
                  : "今天先不用解决所有事，只走第一步就够了。"}
            </p>

            <div className="mini-evidence-grid" aria-label="当前状态摘要">
              <div className="mini-evidence">
                <div className="mini-label">睡眠偏移</div>
                <div className="mini-value">{sleepDeltaLabel(decision.baseline.delta.sleepPct)}</div>
              </div>
              <div className="mini-evidence">
                <div className="mini-label">风险等级</div>
                <div className="mini-value">{decision.risk.level}</div>
              </div>
              <div className="mini-evidence">
                <div className="mini-label">Safety Gate</div>
                <div className="mini-value">{safetyGateLabel(decision)}</div>
              </div>
            </div>

            <div className="quiet-actions primary-action-row">
              <div className="status-next-step"><span>现在可以做</span><strong>{primaryActionLabel(decision)}</strong></div>
              <button className={`button button-primary btn ${highRisk ? "button-danger" : ""}`} type="button" onClick={goPrimary}>
                <span>{primaryActionLabel(decision)}</span>
                <ArrowRight size={17} />
              </button>
              <button className="button button-secondary btn-lite" type="button" onClick={() => setShowEvidence(true)}>
                <span>看依据</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="status-top">
              <div>
                <div className="status-kicker">判断依据</div>
                <h1 className="status-title">为什么是这个结论</h1>
              </div>
              <div className="score-badge" aria-label={`当前风险等级 ${decision.risk.level}`}>
                <strong>{latestScore}</strong>
                <span>{insufficient ? latestScore === "—" ? "暂不计算" : "暂定参考" : decision.risk.level}</span>
              </div>
            </div>

            <p className="status-line">{decision.risk.reason}</p>

            <div className="simple-list">
              {evidence.map((item) => (
                <div className="simple-item" key={item.mark}>
                  <div className="simple-index">{item.mark}</div>
                  <div className="simple-copy">{item.copy}</div>
                </div>
              ))}
            </div>

            <div className="quiet-actions">
              <button className="button button-secondary btn-lite" type="button" onClick={() => setShowEvidence(false)}>
                <span>回到正面</span>
              </button>
              <Link className="button button-primary btn" to="/insight">
                <span>完整详情</span>
                <ArrowRight size={17} />
              </Link>
            </div>
          </>
        )}
      </section>

      <section className="survey-strip">
        <div className="survey-strip-icon" aria-hidden="true"><Cloud size={22} /></div>
        <div className="survey-strip-main">
          <div className="survey-strip-title">轻自查问卷</div>
          <div className="survey-strip-copy">可以先做一份轻自查，结果只用于提醒，不是诊断。</div>
        </div>
        <Link className="button button-secondary btn-lite survey-strip-btn" to="/checkin">开始</Link>
      </section>

      <section className="home-bottle-entry">
        <div className="home-bottle-entry-icon" aria-hidden="true"><Waves size={22} /></div>
        <div className="home-bottle-entry-main">
          <div className="home-bottle-entry-kicker">匿名漂流瓶 · Demo</div>
          <h2>把一句话交给海</h2>
          <p>本机演示投放、捞取和匿名回应，不连接真实多人社区。</p>
        </div>
        <Link className="button button-secondary btn-lite home-bottle-entry-link" to={highRisk ? "/help" : insufficient ? "/checkin" : "/bottle"}>
          {highRisk ? "打开求助" : insufficient ? "先补充记录" : "进入海域"}<ArrowRight size={16} />
        </Link>
      </section>

      {state.dataMode === "synthetic-demo" ? (
        <div className="demo-strip home-demo-contract"><CheckCircle2 size={16} /><span>这里是示例记录。你之后留下的记录会单独保存。</span></div>
      ) : null}

      <div className="home-compatibility-layer" aria-label="完整状态判断详情">
        <div className="home-data-contract">{state.dataMode === "synthetic-demo" ? "示例记录" : state.dataMode === "empty" ? "还没有记录" : "本地记录"}</div>
        <ScoreSnapshot decision={decision} />
        <BaselineDelta baseline={decision.baseline} />
        <DecisionTrace decision={decision} />
        <Timeline records={state.records} />
      </div>
    </div>
  );
}
