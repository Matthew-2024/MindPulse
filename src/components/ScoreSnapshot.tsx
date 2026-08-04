import { ArrowDownRight, ArrowUpRight, Database, Gauge, Minus, ShieldAlert, Waves } from "lucide-react";
import { isInsufficient } from "../domain/evaluate-state";
import type { MindPulseDecision } from "../domain/types";

const signalLabels: Record<string, string> = {
  mood: "情绪",
  sleep: "睡眠",
  steps: "活动",
  social: "连接感"
};

function statusLabel(decision: MindPulseDecision) {
  if (decision.risk.mode === "help") return "先连接支持";
  if (decision.risk.mode === "ask") return "暂时无法判断";
  if (decision.baseline.status === "cold_start") return "还在了解你的节奏";
  if (decision.baseline.flags.length) return "出现节奏偏移";
  return "保持观察";
}

function deltaIcon(delta: number | null) {
  if (delta === null || delta === 0) return <Minus size={14} />;
  return delta > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />;
}

function strategyLabel(mode: MindPulseDecision["risk"]["mode"]) {
  if (mode === "help") return "求助优先";
  if (mode === "ask") return "先补充记录";
  return "可以先做小事";
}

export function ScoreSnapshot({ decision }: { decision: MindPulseDecision }) {
  const { score, baseline, risk } = decision;
  const status = statusLabel(decision);
  const insufficient = isInsufficient(risk);
  const moodDelta = baseline.delta.mood;
  const missingSignals = baseline.dataCompleteness.missing.map((key) => signalLabels[key] || key);
  const referenceScore = score.referenceScore;
  const referenceCount = score.referenceSignalCount ?? baseline.dataCompleteness.available;
  const referenceRequired = score.referenceSignalRequired ?? baseline.dataCompleteness.required;

  return (
    <section className={`snapshot-panel ${risk.mode === "help" ? "snapshot-panel-danger" : ""}`}>
      <div className="snapshot-heading">
        <div>
          <span className="eyebrow">今天 / 我的节奏</span>
          <h1>{status}</h1>
          <p>{insufficient ? `暂时无法可靠判断：已收集 ${baseline.dataCompleteness.available}/${baseline.dataCompleteness.required} 项信号，先补充记录。` : baseline.title}</p>
        </div>
        <div className="rhythm-mark" aria-label={`个人节奏状态：${baseline.title}`}>
          <Waves size={18} />
          <span>个人节奏</span>
          <strong>{insufficient ? `${baseline.dataCompleteness.available}/${baseline.dataCompleteness.required} 项信号` : baseline.flags.length ? `${baseline.flags.length} 项变化` : "接近平时"}</strong>
        </div>
      </div>

      <div className="snapshot-strategy">
        <span className={`mode-tag mode-${risk.mode}`}><ShieldAlert size={13} />接下来：{strategyLabel(risk.mode)}</span>
        <span>{risk.tag || "持续观察"}</span>
      </div>

      <div className="snapshot-metrics">
        <div className="metric-block">
          <span className="metric-label"><Gauge size={14} /> 判断可靠度</span>
          <strong>{baseline.confidenceText}</strong>
          <span className="metric-note">{Math.round(baseline.confidenceScore * 100)}%</span>
        </div>
        <div className="metric-block">
          <span className="metric-label"><Database size={14} /> 记录完整度</span>
          <strong>{score.dataCompleteness?.percent ?? baseline.dataCompleteness.percent}%</strong>
          <span className="metric-note">{insufficient && missingSignals.length ? `还缺少：${missingSignals.join("、")}` : `已记 ${baseline.dataCompleteness.available}/${baseline.dataCompleteness.required} 项`}</span>
        </div>
        <div className="metric-block">
          <span className="metric-label"><Waves size={14} /> 平时状态</span>
          <strong>{baseline.status === "cold_start" ? "建立中" : baseline.flags.length ? "有偏移" : "接近"}</strong>
          <span className="metric-note">已有 {baseline.historyRecords} 条记录</span>
        </div>
        <div className="metric-block metric-block-score">
          <span className="metric-label"><ShieldAlert size={14} /> 当前参考指数</span>
          {insufficient ? (
            <>
              {referenceScore === null || referenceScore === undefined ? (
                <strong className="score-not-available">—</strong>
              ) : (
                <strong>{referenceScore}<small>/100</small></strong>
              )}
              <span className="metric-note">完整状态分暂不计算 · {referenceScore === null || referenceScore === undefined ? "还没有可计算信号" : `暂定参考 · 已收集 ${referenceCount}/${referenceRequired} 项`}</span>
            </>
          ) : (
            <>
              <strong>{score.total}<small>/100</small></strong>
              <span className="metric-note">记录指数，不是健康分数</span>
            </>
          )}
        </div>
      </div>

      <div className="snapshot-footnote">
        <span>{insufficient ? "参考指数只使用已填写信号，不代表完整状态判断" : "和谁比较：你自己之前的记录"}</span>
        <span className={`delta-chip ${moodDelta !== null && moodDelta < 0 ? "is-down" : ""}`}>
          {insufficient ? <Minus size={14} /> : deltaIcon(moodDelta)}
          {insufficient ? `还缺少：${missingSignals.length ? missingSignals.join("、") : "更多记录"}` : moodDelta === null ? "还没有足够记录" : `${Math.abs(moodDelta).toFixed(1)} 级情绪变化`}
        </span>
      </div>
    </section>
  );
}
