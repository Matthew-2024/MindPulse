import { ArrowRight, BookOpen, CheckCircle2, Database, FileText, HelpCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useMindPulse } from "../../app/store";
import { isHighRisk, isInsufficient } from "../../domain/evaluate-state";
import { BaselineDelta } from "../../components/BaselineDelta";
import { DecisionTrace } from "../../components/DecisionTrace";
import { ScoreSnapshot } from "../../components/ScoreSnapshot";
import { Timeline } from "../../components/Timeline";

function primaryActionLabel(decision: ReturnType<typeof useMindPulse>["decision"]) {
  if (isHighRisk(decision.risk)) return "进入求助入口";
  if (isInsufficient(decision.risk)) return "补充一条记录";
  if (decision.risk.riskCode === "medium") return "连接一个可信任的人";
  return "查看这一步为什么适合你";
}

function rhythmHeadline(decision: ReturnType<typeof useMindPulse>["decision"]) {
  if (isHighRisk(decision.risk)) return "现在先连接一个真实的人";
  if (isInsufficient(decision.risk)) return "先把缺少的信号补上";
  const count = decision.baseline.flags.length;
  return count ? `今天有 ${count} 项和你平时不一样` : "今天和你平时差不多";
}

export function HomePage() {
  const { state, decision } = useMindPulse();
  const navigate = useNavigate();
  const primary = decision.recommendation.path[0] || "ask";
  const primaryLabel = primaryActionLabel(decision);
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date()).toUpperCase();

  function goPrimary() {
    if (isHighRisk(decision.risk) || primary === "help") navigate("/help");
    else if (isInsufficient(decision.risk) || primary === "ask") navigate("/checkin");
    else if (primary === "friend") navigate("/help");
    else navigate("/companion");
  }

  return (
    <div className="page-content home-page">
      <div className="page-intro page-intro-home">
        <div>
          <span className="eyebrow">{weekday} / 我的节奏</span>
          <h1>{rhythmHeadline(decision)}</h1>
          <p>心晴把你留下的记录放在一起，看看今天和往常有什么不同，再决定是补充记录、做一件小事，还是联系一个真实的人。</p>
        </div>
        <div className="intro-links">
          <Link to="/insight" className="icon-link" aria-label="查看判断依据" title="查看判断依据"><FileText size={19} /></Link>
          <Link to="/settings" className="icon-link" aria-label="隐私设置" title="隐私设置"><Database size={19} /></Link>
        </div>
      </div>

      <ScoreSnapshot decision={decision} />

      <div className="primary-action-row">
        <button className={`button button-primary button-large ${decision.risk.mode === "help" ? "button-danger" : ""}`} type="button" onClick={goPrimary}>
          <span>{primaryLabel}</span><ArrowRight size={18} />
        </button>
        <div className="primary-action-note">
          <span className="action-kicker">建议先做</span>
          <strong>{decision.recommendation.reason}</strong>
        </div>
      </div>

      {state.dataMode === "synthetic-demo" ? (
        <div className="demo-strip"><CheckCircle2 size={16} /><span>这里是示例记录。你之后留下的记录会单独保存。</span><Link to="/settings">看看记录放在哪里</Link></div>
      ) : null}

      <div className="home-grid">
        <BaselineDelta baseline={decision.baseline} />
        <aside className="side-column">
          <section className="quiet-panel">
            <div className="quiet-panel-icon"><HelpCircle size={18} /></div>
            <span className="eyebrow">先说清楚</span>
          <h2>这是帮你了解状态的工具，不是诊断工具</h2>
            <p>分数只描述本次记录和个人历史的差异，不能证明因果，也不能代替老师、家人或专业人员的支持。</p>
            <Link className="text-link" to="/insight">查看解释 <ArrowRight size={15} /></Link>
          </section>
          <section className="quiet-panel quiet-panel-accent">
            <BookOpen size={18} />
            <span className="eyebrow">为什么这样建议</span>
            <h2>每一步都有说明</h2>
            <p>每次判断都会说明记录来自哪里、哪些地方没填，以及接下来可以做什么。</p>
            <Link className="text-link" to="/rules">看看规则说明 <ArrowRight size={15} /></Link>
          </section>
        </aside>
      </div>

      <DecisionTrace decision={decision} />
      <Timeline records={state.records} />
    </div>
  );
}
