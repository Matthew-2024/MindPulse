import { useEffect, useRef, type PropsWithChildren } from "react";
import { Link, useLocation } from "react-router-dom";
import { CircleHelp, ShieldCheck, Sparkles } from "lucide-react";
import { useMindPulse } from "../app/store";
import { isHighRisk, isInsufficient } from "../domain/evaluate-state";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: PropsWithChildren) {
  const { state, decision } = useMindPulse();
  const location = useLocation();
  const highRisk = isHighRisk(decision.risk);
  const insufficient = isInsufficient(decision.risk);
  const isHome = location.pathname === "/";
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    document.querySelector<HTMLElement>(".page-shell")?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const changedRoute = previousPath.current !== null && previousPath.current !== location.pathname;
    previousPath.current = location.pathname;
    if (changedRoute) mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div className={`app-frame phone-app ${isHome ? "home-frame" : "secondary-frame"}`}>
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <header className={`topbar ${isHome ? "home-topbar" : ""}`}>
        {isHome ? (
          <Link to={highRisk ? "/help" : "/"} className="home-brand" aria-label="回到心晴首页">
            <strong>心晴</strong>
            <small>匿名同学 · 端侧匿名档案</small>
          </Link>
        ) : (
          <>
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
          </>
        )}
      </header>

      <main ref={mainRef} id="main-content" tabIndex={-1} className={`page-shell ${location.pathname === "/help" ? "page-shell-help" : ""} ${isHome ? "page-shell-home" : ""}`}>
        <div key={location.pathname} className="route-transition">
          {state.error ? (
            <div className="status-banner status-banner-error" role="alert">
              <CircleHelp size={17} />
              <span>{state.error}</span>
            </div>
          ) : null}
          {!state.loaded ? <div className="loading-line">正在读取本地档案…</div> : children}
        </div>
      </main>

      <BottomNav locked={highRisk} insufficient={insufficient} />
    </div>
  );
}
