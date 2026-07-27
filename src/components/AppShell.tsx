import type { PropsWithChildren } from "react";
import { Link, useLocation } from "react-router-dom";
import { CircleHelp, ShieldCheck, Sparkles } from "lucide-react";
import { useMindPulse } from "../app/store";
import { isHighRisk } from "../domain/evaluate-state";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: PropsWithChildren) {
  const { state, decision } = useMindPulse();
  const location = useLocation();
  const highRisk = isHighRisk(decision.risk);

  return (
    <div className="app-frame">
      <header className="topbar">
        <Link to={highRisk ? "/help" : "/"} className="brand" aria-label="回到心晴首页">
          <span className="brand-mark" aria-hidden="true"><Sparkles size={17} /></span>
          <span>
            <strong>心晴</strong>
            <small>MindPulse</small>
          </span>
        </Link>
        <div className="topbar-meta">
          <span className={`data-badge ${state.dataMode === "synthetic-demo" ? "is-demo" : ""}`}>
            {state.dataMode === "synthetic-demo" ? "示例记录" : state.dataMode === "empty" ? "还没有记录" : "本地记录"}
          </span>
          {highRisk ? (
            <Link className="safety-pill safety-pill-danger" to="/help">
              <ShieldCheck size={15} />
              <span>只允许求助</span>
            </Link>
          ) : (
            <span className="safety-pill">
              <ShieldCheck size={15} />
              <span>安全提醒</span>
            </span>
          )}
        </div>
      </header>

      <main className={`page-shell ${location.pathname === "/help" ? "page-shell-help" : ""}`}>
        {state.error ? (
          <div className="status-banner status-banner-error" role="alert">
            <CircleHelp size={17} />
            <span>{state.error}</span>
          </div>
        ) : null}
        {!state.loaded ? <div className="loading-line">正在读取本地档案…</div> : children}
      </main>

      <BottomNav locked={highRisk} />
    </div>
  );
}
