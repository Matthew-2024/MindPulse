import { BarChart3, CalendarDays, ChevronRight, CircleAlert, FileText, Moon, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import { aggregateNaturalDays } from "../../domain/report-aggregation";
import { useMindPulse } from "../../app/store";

function formatAverage(values: Array<number | null>, digits = 1) {
  const present = values.filter((value): value is number => value !== null);
  if (!present.length) return null;
  const average = present.reduce((sum, value) => sum + value, 0) / present.length;
  return digits === 0 ? String(Math.round(average)) : average.toFixed(digits);
}

export function ReportsPage() {
  const { state, decision } = useMindPulse();
  const days = useMemo(() => aggregateNaturalDays(state.records), [state.records]);
  const today = days.at(-1)!;
  const weeklyCount = days.reduce((sum, day) => sum + day.records.length, 0);
  const avgSleep = formatAverage(days.map((day) => day.sleep.value));
  const avgSocial = formatAverage(days.map((day) => day.social.value), 0);

  return (
    <div className="page-content reports-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">记录回顾</span>
          <h1>看趋势，不给自己打排名。</h1>
          <p>按自然日汇总主动留下的记录。没有填写的信号会明确标记为缺失，不会被画成零。</p>
        </div>
        <Link className="icon-link" to="/insight" aria-label="查看当前解释" title="查看当前解释"><FileText size={19} /></Link>
      </div>

      <div className="report-grid">
        <section className="report-card report-card-main" id="today-report">
          <div className="report-card-head"><div><span className="eyebrow">TODAY / {today.label}</span><h2>今天的记录</h2></div><CalendarDays size={19} /></div>
          <strong className="report-big-number">{today.records.length}</strong><span className="report-unit">条主动记录</span>
          <div className="report-detail"><span>记录完整度</span><strong>{decision.baseline.dataCompleteness.percent}%</strong></div>
          <div className="report-detail"><span>接下来</span><strong>{decision.risk.mode === "help" ? "先求助" : decision.risk.mode === "ask" ? "补充记录" : "继续观察"}</strong></div>
        </section>
        <section className="report-card">
          <div className="report-card-head"><div><span className="eyebrow">LAST 7 NATURAL DAYS</span><h2>一周节奏</h2></div><BarChart3 size={19} /></div>
          <strong className="report-big-number">{weeklyCount}</strong><span className="report-unit">条记录</span>
          <div className="report-detail"><span><Moon size={14} />平均睡眠</span><strong>{avgSleep === null ? "缺失" : `${avgSleep} 小时`}</strong></div>
          <div className="report-detail"><span><Users size={14} />平均连接感</span><strong>{avgSocial === null ? "缺失" : `${avgSocial} 分`}</strong></div>
        </section>
      </div>

      <section className="section-block report-timeline">
        <div className="section-heading"><div><span className="eyebrow">这一周的变化</span><h2>状态轨迹</h2></div><span className="section-meta">按自然日显示</span></div>
        <div className="mini-chart" role="img" aria-label="最近七个自然日的睡眠和连接感变化，缺失数据已标记">
          {days.map((day) => <div className="mini-chart-column" key={day.key} data-testid={`report-day-${day.key}`}>
            {day.sleep.state === "present" ? <span className="mini-bar mini-bar-sleep" style={{ height: `${Math.min(100, (day.sleep.value! / 10) * 100)}%` }} /> : <span className="mini-bar-missing">缺失</span>}
            {day.social.state === "present" ? <span className="mini-bar mini-bar-social" style={{ height: `${Math.min(100, day.social.value!)}%` }} /> : <span className="mini-bar-missing">缺失</span>}
            <small>{day.label}</small>
          </div>)}
        </div>
        <div className="chart-legend"><span><i className="legend-dot legend-dot-sleep" />睡眠</span><span><i className="legend-dot legend-dot-social" />连接</span><span className="chart-legend-missing">缺失不会按 0 显示</span><Link className="text-link" to="/checkin">补充记录 <ChevronRight size={15} /></Link></div>
      </section>

      <div className="report-note"><CircleAlert size={17} /><span>趋势只能帮助你发现变化，不能说明变化的原因，也不等于健康结论。</span></div>
    </div>
  );
}
