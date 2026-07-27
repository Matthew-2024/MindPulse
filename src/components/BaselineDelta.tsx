import { Activity, BedDouble, MessageCircle, Smile } from "lucide-react";
import type { BaselineResult, SignalKey } from "../domain/types";

const signalMeta: Record<SignalKey, { label: string; icon: typeof Smile; unit: string }> = {
  mood: { label: "情绪", icon: Smile, unit: "级" },
  sleep: { label: "睡眠", icon: BedDouble, unit: "小时" },
  steps: { label: "活动", icon: Activity, unit: "步" },
  social: { label: "连接", icon: MessageCircle, unit: "分" }
};

const sourceLabels: Record<string, string> = {
  "synthetic-demo": "示例记录",
  "real-trial": "匿名记录",
  "public-reference": "公开资料",
  manual: "自我记录",
  "manual-web": "自我记录",
  "self-report": "自我记录",
  device: "设备记录",
  "local-event": "本地行动记录",
  unknown: "还没有来源"
};

function formatSource(source: string) {
  const normalized = String(source || "").trim().toLowerCase();
  return sourceLabels[normalized] || (normalized ? "本地记录" : "未标注来源");
}

function formatValue(key: SignalKey, value: number | null, unit: string) {
  if (value === null) return "—";
  if (key === "steps") return `${Math.round(value).toLocaleString()} ${unit}`;
  return `${Number(value).toFixed(key === "mood" || key === "sleep" ? 1 : 0)} ${unit}`;
}

export function BaselineDelta({ baseline }: { baseline: BaselineResult }) {
  const availableSources = Array.from(new Set(Object.values(baseline.signals).map((item) => formatSource(item.source)).filter(Boolean)));
  return (
    <section className="section-block baseline-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">我的节奏</span>
          <h2>只和自己的节奏比较</h2>
        </div>
        <span className="section-meta">{baseline.historyRecords} 条过往记录</span>
      </div>
      <p className="section-intro">{baseline.desc}</p>
      <div className="baseline-summary">
        <div><span>平时状态</span><strong>{baseline.baselineReady ? "已经了解" : "还在了解"}</strong></div>
        <div><span>记录来自</span><strong>{availableSources.length ? availableSources.join("、") : "暂无"}</strong></div>
        <div><span>和往常相比</span><strong>{baseline.flags.length ? `${baseline.flags.length} 项变化` : "没有明显变化"}</strong></div>
      </div>
      <div className="signal-grid">
        {(Object.keys(signalMeta) as SignalKey[]).map((key) => {
          const meta = signalMeta[key];
          const Icon = meta.icon;
          const item = baseline.signals[key];
          const relative = item.relativeDelta;
          const width = relative === null ? 8 : Math.min(100, Math.max(8, Math.abs(relative) * 1.5 + 8));
          return (
            <div className="signal-row" key={key}>
              <div className="signal-icon"><Icon size={16} /></div>
              <div className="signal-copy">
                <div className="signal-title"><strong>{meta.label}</strong><span>{item.sampleCount} 次记录 · {formatSource(item.source)}</span></div>
                <div className="signal-values">
                  <span>现在 {formatValue(key, item.current, meta.unit)}</span>
                  <span>平时 {formatValue(key, item.baseline, meta.unit)}</span>
                </div>
                <div className="signal-bar" aria-hidden="true"><span style={{ width: `${width}%` }} /></div>
              </div>
              <div className={`signal-delta ${relative !== null && relative < 0 ? "is-down" : ""}`}>
                {relative === null ? "—" : `${relative > 0 ? "+" : ""}${relative}%`}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
