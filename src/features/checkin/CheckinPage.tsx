import { ArrowLeft, ArrowRight, Check, Heart, Moon, Send, Smile, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMindPulse } from "../../app/store";
import { isHighRisk } from "../../domain/evaluate-state";
import type { MindPulseRecord } from "../../domain/types";
import { nextCheckinPrompt } from "../../rules/minimal-checkin.js";

const moods = [
  { value: "happy", label: "轻松", tone: "positive" },
  { value: "calm", label: "平稳", tone: "calm" },
  { value: "anxious", label: "紧张", tone: "attention" },
  { value: "sad", label: "低落", tone: "attention" },
  { value: "tired", label: "疲惫", tone: "attention" },
  { value: "angry", label: "烦躁", tone: "attention" }
];

export function CheckinPage() {
  const { state, addRecord } = useMindPulse();
  const location = useLocation();
  const navigate = useNavigate();
  const gateNotice = typeof location.state?.gateNotice === "string" ? location.state.gateNotice : "";
  const [mood, setMood] = useState("");
  const [sleep, setSleep] = useState("");
  const [steps, setSteps] = useState("");
  const [social, setSocial] = useState("");
  const [energy, setEnergy] = useState<MindPulseRecord["energyLevel"]>("mid");
  const [connection, setConnection] = useState<MindPulseRecord["connectionNeed"]>("ok");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [skippedSignals, setSkippedSignals] = useState<string[]>([]);
  const minimalDraft = useMemo(() => ({
    ...(mood ? { mood } : {}),
    ...(sleep.trim() ? { sleepHours: Number(sleep) } : {}),
    ...(steps.trim() ? { steps: Number(steps) } : {}),
    ...(social.trim() ? { socialScore: Number(social) } : {})
  }), [mood, sleep, steps, social]);
  const minimalPrompt = useMemo(
    () => nextCheckinPrompt([...state.records, minimalDraft], { skippedSignals }),
    [minimalDraft, skippedSignals, state.records]
  );

  async function saveRecord(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const record: MindPulseRecord = {
      energyLevel: energy,
      connectionNeed: connection,
      note,
      entryType: "instant",
      dataMode: state.dataMode === "synthetic-demo" || state.dataMode === "empty" ? "real-trial" : state.dataMode,
      ...(mood ? { mood } : {}),
      ...(sleep.trim() ? { sleepHours: Number(sleep) } : {}),
      ...(steps.trim() ? { steps: Number(steps) } : {}),
      ...(social.trim() ? { socialScore: Number(social) } : {})
    };
    try {
      const result = await addRecord(record);
      navigate(isHighRisk(result.decision.risk) ? "/help" : "/insight");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-content narrow-page">
      <div className="page-intro">
        <div>
          <Link to="/" className="back-link"><ArrowLeft size={16} />首页</Link>
          <span className="eyebrow">快速记录 · 约 1 分钟</span>
          <h1>{state.safetyReassessmentOpen ? "重新评估现在的状态。" : "记录现在，不需要写得完美。"}</h1>
          <p>{state.safetyReassessmentOpen ? "你已经确认联系支持。请重新记录现在的状态，这一步只用于重新看看情况。" : "这些内容只用来描述今天的状态。可以留空，但少填一些时，判断会更谨慎。"}</p>
        </div>
      </div>

      {gateNotice ? <div className="status-banner" role="status">{gateNotice}</div> : null}

      {minimalPrompt ? <section className="minimal-checkin-prompt" data-testid="minimal-checkin-prompt" data-minimal-signal={minimalPrompt.signal} aria-labelledby="minimal-checkin-title">
        <div><span className="eyebrow">ONE USEFUL SIGNAL</span><h2 id="minimal-checkin-title">{minimalPrompt.prompt}</h2><p>{minimalPrompt.why}</p></div>
        {minimalPrompt.signal === "mood" ? <div className="mood-options minimal-prompt-control">
          {moods.map((item) => <button key={item.value} type="button" className={`mood-option mood-${item.tone} ${mood === item.value ? "is-selected" : ""}`} onClick={() => setMood(item.value)}><span className="mood-dot" />{item.label}</button>)}
        </div> : minimalPrompt.signal === "sleep" ? <label className="input-field minimal-prompt-control"><span>小时</span><div><input min="0" max="24" step="0.1" value={sleep} onChange={(event) => setSleep(event.target.value)} type="number" inputMode="decimal" /><b>小时</b></div></label> : minimalPrompt.signal === "social" ? <label className="input-field minimal-prompt-control"><span>0-100</span><div><input min="0" max="100" step="1" value={social} onChange={(event) => setSocial(event.target.value)} type="number" inputMode="numeric" /><b>/ 100</b></div></label> : <label className="input-field minimal-prompt-control"><span>步数</span><div><input min="0" max="100000" step="100" value={steps} onChange={(event) => setSteps(event.target.value)} type="number" inputMode="numeric" /><b>步</b></div></label>}
        <button className="button button-quiet" data-testid="minimal-checkin-skip" type="button" onClick={() => setSkippedSignals((current) => [...current, minimalPrompt.signal])}>跳过这一项</button>
      </section> : null}

      <form className="checkin-form" onSubmit={saveRecord}>
        {minimalPrompt?.signal !== "mood" ? <section className="form-section">
          <div className="form-section-head"><Smile size={18} /><div><h2>此刻的情绪</h2><span>选一个最接近的词</span></div></div>
          <div className="mood-options">
            {moods.map((item) => (
              <button key={item.value} type="button" className={`mood-option mood-${item.tone} ${mood === item.value ? "is-selected" : ""}`} onClick={() => setMood(item.value)}>
                <span className="mood-dot" />{item.label}
              </button>
            ))}
          </div>
        </section> : null}

        {minimalPrompt?.signal !== "sleep" && minimalPrompt?.signal !== "steps" ? <section className="form-section form-grid-section">
          <div className="form-section-head"><Moon size={18} /><div><h2>身体节奏</h2><span>可以使用大概数值</span></div></div>
          <div className="input-grid">
            <label className="input-field"><span>昨晚睡眠</span><div><input min="0" max="24" step="0.1" value={sleep} onChange={(event) => setSleep(event.target.value)} type="number" placeholder="可留空" /><b>小时</b></div></label>
            <label className="input-field"><span>今日活动</span><div><input min="0" max="100000" step="100" value={steps} onChange={(event) => setSteps(event.target.value)} type="number" placeholder="可留空" /><b>步</b></div></label>
          </div>
        </section> : null}

        {minimalPrompt?.signal !== "social" ? <section className="form-section form-grid-section">
          <div className="form-section-head"><Users size={18} /><div><h2>连接感</h2><span>今天和他人的连接有多够用</span></div></div>
          <input className="range-input" aria-label="连接感" max="100" min="0" step="1" type="range" value={social || "50"} onChange={(event) => setSocial(event.target.value)} />
          <div className="range-scale"><span>想独处</span><strong>{social ? social + " / 100" : "可留空"}</strong><span>想找人</span></div>
          <button className="button button-quiet button-with-icon" type="button" onClick={() => setSocial("")}>不记录连接感</button>
          <div className="choice-row"><span>今天更接近</span>{(["avoid", "ok", "need"] as const).map((value) => <button type="button" className={connection === value ? "is-selected" : ""} key={value} onClick={() => setConnection(value)}>{value === "avoid" ? "想独处" : value === "need" ? "想找人" : "都可以"}</button>)}</div>
        </section> : null}

        <section className="form-section">
          <div className="form-section-head"><Heart size={18} /><div><h2>补充两句</h2><span>如果有，写下今天最重的一件事</span></div></div>
          <textarea className="note-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：考试前有点紧张，但我还想把今天过完。" rows={5} />
          <div className="choice-row"><span>当前精力</span>{(["low", "mid", "high"] as const).map((value) => <button type="button" className={energy === value ? "is-selected" : ""} key={value} onClick={() => setEnergy(value)}>{value === "low" ? "偏低" : value === "high" ? "充足" : "一般"}</button>)}</div>
        </section>

        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <div className="form-actions">
          <Link className="button button-quiet button-with-icon" to="/"><ArrowLeft size={16} />暂不记录</Link>
          <button className="button button-primary button-with-icon" disabled={saving} type="submit">{saving ? "保存中…" : "保存并查看解释"}<span aria-hidden="true">{saving ? <Check size={16} /> : <Send size={16} />}</span><ArrowRight size={16} /></button>
        </div>
      </form>
    </div>
  );
}
