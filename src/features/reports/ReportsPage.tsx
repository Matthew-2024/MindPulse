import { BarChart3, CalendarDays, ChevronRight, CircleAlert, FileText, Moon, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useMindPulse } from "../../app/store";

function isWithinDays(value: string | undefined, days: number) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Date.now() - time <= days * 24 * 60 * 60 * 1000;
}

export function ReportsPage() {
  const { state, decision } = useMindPulse();
  const daily = useMemo(() => state.records.filter((record) => isWithinDays(record.createdAt, 1)), [state.records]);
  const weekly = useMemo(() => state.records.filter((record) => isWithinDays(record.createdAt, 7)), [state.records]);
  const sleepValues = weekly.map((record) => Number(record.sleepHours)).filter(Number.isFinite);
  const socialValues = weekly.map((record) => Number(record.socialScore)).filter(Number.isFinite);
  const avgSleep = sleepValues.length ? (sleepValues.reduce((sum, value) => sum + value, 0) / sleepValues.length).toFixed(1) : "—";
  const avgSocial = socialValues.length ? Math.round(socialValues.reduce((sum, value) => sum + value, 0) / socialValues.length) : "—";

  return (
    <div className="page-content reports-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">记录回顾</span>
          <h1>看趋势，不给自己打排名。</h1>
          <p>日报和周报只汇总你主动留下的记录，缺失的部分会明确显示。</p>
        </div>
        <Link className="icon-link" to="/insight" aria-label="查看当前解释" title="查看当前解释"><FileText size={19} /></Link>
      </div>

      <div className="report-grid">
        <section className="report-card report-card-main" id="today-report">
          <div className="report-card-head"><div><span className="eyebrow">TODAY</span><h2>今天的记录</h2></div><CalendarDays size={19} /></div>
          <strong className="report-big-number">{daily.length}</strong><span className="report-unit">条主动记录</span>
          <div className="report-detail"><span>记录完整度</span><strong>{decision.baseline.dataCompleteness.percent}%</strong></div>
          <div className="report-detail"><span>接下来</span><strong>{decision.risk.mode === "help" ? "先求助" : decision.risk.mode === "ask" ? "补充记录" : "继续观察"}</strong></div>
        </section>
        <section className="report-card">
          <div className="report-card-head"><div><span className="eyebrow">LAST 7 DAYS</span><h2>一周节奏</h2></div><BarChart3 size={19} /></div>
          <strong className="report-big-number">{weekly.length}</strong><span className="report-unit">条记录</span>
          <div className="report-detail"><span><Moon size={14} />平均睡眠</span><strong>{avgSleep}{avgSleep === "—" ? "" : " 小时"}</strong></div>
          <div className="report-detail"><span><Users size={14} />平均连接感</span><strong>{avgSocial}{avgSocial === "—" ? "" : " 分"}</strong></div>
        </section>
      </div>

      <section className="section-block report-timeline">
        <div className="section-heading"><div><span className="eyebrow">这一周的变化</span><h2>状态轨迹</h2></div><span className="section-meta">只显示已有记录</span></div>
        <div className="mini-chart" role="img" aria-label="最近记录的睡眠和连接感变化">
          {weekly.slice(-7).map((record, index) => <div className="mini-chart-column" key={record.id || index}><span className="mini-bar mini-bar-sleep" style={{ height: `${Math.min(100, (Number(record.sleepHours || 0) / 10) * 100)}%` }} /><span className="mini-bar mini-bar-social" style={{ height: `${Math.min(100, Number(record.socialScore || 0))}%` }} /><small>{index + 1}</small></div>)}
          {!weekly.length ? <div className="empty-state">记录几天后，这里会出现你的节奏轨迹。</div> : null}
        </div>
        <div className="chart-legend"><span><i className="legend-dot legend-dot-sleep" />睡眠</span><span><i className="legend-dot legend-dot-social" />连接</span><Link className="text-link" to="/checkin">补充记录 <ChevronRight size={15} /></Link></div>
      </section>

      <div className="report-note"><CircleAlert size={17} /><span>趋势只能帮助你发现变化，不能说明变化的原因，也不等于健康结论。</span></div>
    </div>
  );
}
