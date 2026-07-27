import { ArrowLeft, RefreshCw, Settings2, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useMindPulse } from "../../app/store";
import { isHighRisk } from "../../domain/evaluate-state";
import { HelpComposer } from "../../components/HelpComposer";
import { SafetyGate } from "../../components/SafetyGate";

export function HelpPage() {
  const { decision, state, beginSafetyReassessment, recordHelpEvent } = useMindPulse();
  const navigate = useNavigate();
  const highRisk = isHighRisk(decision.risk);

  function openSafetyReassessment() {
    beginSafetyReassessment();
    navigate("/checkin");
  }

  return (
    <div className="page-content help-page">
      <div className="page-intro">
        <div>
          {!highRisk ? <Link to="/" className="back-link"><ArrowLeft size={16} />首页</Link> : null}
          <span className="eyebrow">找人帮忙</span>
          <h1>{highRisk ? "求助入口已打开。" : "需要连接时，先从一句话开始。"}</h1>
          <p>{highRisk ? "现在先联系一个真实的人。请选择你愿意联系的人，系统不会自动上报。" : "你可以提前准备一句话，不需要等到把事情解释得很完整。"}</p>
        </div>
        {!highRisk ? <Link className="icon-link" to="/settings" aria-label="配置求助资源" title="配置求助资源"><Settings2 size={19} /></Link> : null}
      </div>

      {highRisk ? <SafetyGate decision={decision} resources={state.helpResources} /> : (
        <section className="support-banner"><ShieldCheck size={19} /><div><strong>这是连接支持的入口</strong><span>如果你已经处于危险中，请直接联系当地急救、热线或身边的成年人。</span></div><Link to="/settings"><Settings2 size={16} />资源配置</Link></section>
      )}

      {highRisk ? (
        <section className="safety-reassessment">
          <div><RefreshCw size={17} /><span><strong>联系支持后再重新评估</strong><small>只有在你已经联系一个真实的人后，才进入新的状态记录。</small></span></div>
          <button className="button button-secondary button-with-icon" type="button" onClick={openSafetyReassessment}><RefreshCw size={16} />我已联系支持，重新评估</button>
        </section>
      ) : null}

      <HelpComposer
        resources={state.helpResources}
        stateSummary={highRisk ? "我现在需要尽快联系一个真实的人" : decision.baseline.title}
        highRisk={highRisk}
        onLog={recordHelpEvent}
      />

      <section className="help-boundary">
        <div><ShieldCheck size={17} /><strong>你的选择保持在你手里</strong></div>
        <p>求助资源保存在本机，不自动联系、不自动发送、不上传你写的内容。</p>
        <span>请在设置中填写你所在地区或学校确认可用的求助资源。</span>
      </section>
    </div>
  );
}
