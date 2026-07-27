import { CalendarDays, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { MindPulseRecord } from "../domain/types";

function dateLabel(value?: string) {
  if (!value) return "未记录时间";
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(new Date(value));
}

export function Timeline({ records }: { records: MindPulseRecord[] }) {
  const recent = records.slice(-5).reverse();
  return (
    <section className="section-block timeline-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">RECENT RHYTHM</span>
          <h2>最近的节奏轨迹</h2>
        </div>
        <Link className="text-link" to="/reports">查看趋势 <ChevronRight size={15} /></Link>
      </div>
      {recent.length ? (
        <div className="timeline-list">
          {recent.map((record) => (
            <div className="timeline-item" key={record.id || record.createdAt}>
              <span className="timeline-dot" />
              <div className="timeline-date"><CalendarDays size={14} />{dateLabel(record.createdAt)}</div>
              <div className="timeline-text"><strong>{record.mood || "未记录情绪"}</strong><span>{record.note || "没有补充文字"}</span></div>
              <div className="timeline-numbers"><span>{record.sleepHours ?? "—"}h</span><span>{record.steps ? `${Math.round(record.steps / 100) / 10}k` : "—"}</span></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">还没有记录，从一次轻量记录开始。</div>
      )}
    </section>
  );
}
