import "./bottle-repository.js";
import {
  ArrowLeft,
  Flag,
  LockKeyhole,
  MessageCircle,
  RotateCw,
  Send,
  Settings2,
  ShieldCheck,
  Waves
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useMindPulse } from "../../app/store";
import { isHighRisk, isInsufficient } from "../../domain/evaluate-state";

type StatusTone = "success" | "error" | "info";

function formatBottleDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(date);
}

export function BottlePage() {
  const { state, decision } = useMindPulse();
  const [draft, setDraft] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [drawnBottle, setDrawnBottle] = useState<MindPulseBottle | null>(null);
  const [ownBottles, setOwnBottles] = useState<MindPulseBottle[]>([]);
  const [expandedBottleId, setExpandedBottleId] = useState<string | null>(null);
  const [ownReplies, setOwnReplies] = useState<MindPulseBottleReply[]>([]);
  const [status, setStatus] = useState<{ tone: StatusTone; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const submitLock = useRef(false);
  const lastThrowAt = useRef(0);
  const lastReplyAt = useRef(0);

  const repository = useMemo(() => {
    if (typeof window === "undefined" || !window.MindPulseBottleRepository) return null;
    try {
      return window.MindPulseBottleRepository.createLocalBottleRepository(window.localStorage);
    } catch {
      return null;
    }
  }, []);

  const refreshOwnBottles = useCallback(() => {
    if (!repository) return;
    setOwnBottles(repository.listOwnBottles(state.vaultId));
  }, [repository, state.vaultId]);

  useEffect(() => {
    refreshOwnBottles();
  }, [refreshOwnBottles]);

  if (isHighRisk(decision.risk)) return <Navigate to="/help" replace />;
  if (isInsufficient(decision.risk)) return <Navigate to="/checkin" replace />;

  function announce(tone: StatusTone, message: string) {
    setStatus({ tone, message });
  }

  function throwBottle() {
    const now = Date.now();
    if (now - lastThrowAt.current < 450) return;
    const content = draft.trim();
    if (!content) {
      announce("error", "先写下一句话，再投放漂流瓶。");
      return;
    }
    if (!repository || submitLock.current) return;
    lastThrowAt.current = now;
    submitLock.current = true;
    setBusy(true);
    try {
      const bottle = repository.createBottle(state.vaultId, content);
      if (!bottle) {
        announce("error", "这只瓶子没有投放成功，请保留文字后再试。");
        return;
      }
      setDraft("");
      refreshOwnBottles();
      announce("success", "已投放到本机演示海域。它没有上传到服务器。");
    } catch {
      announce("error", "本机存储空间不可用，文字仍保留在输入框里。");
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }

  function drawBottle() {
    if (!repository) {
      announce("error", "本机演示海域暂时不可用。");
      return;
    }
    try {
      const bottle = repository.drawBottle(state.vaultId);
      setDrawnBottle(bottle);
      setReplyDraft("");
      announce(bottle ? "info" : "error", bottle ? "捞到一只新的瓶子。" : "海面暂时没有新的瓶子了。");
    } catch {
      announce("error", "本机演示海域暂时不可用。");
    }
  }

  function replyToBottle() {
    const now = Date.now();
    if (now - lastReplyAt.current < 450) return;
    const content = replyDraft.trim();
    if (!drawnBottle || !content || !repository) {
      if (!content) announce("error", "先写下一句回应。");
      return;
    }
    lastReplyAt.current = now;
    try {
      const reply = repository.replyToBottle(state.vaultId, drawnBottle.id, content);
      if (!reply) {
        announce("error", "这只瓶子暂时不能回应。");
        return;
      }
      setReplyDraft("");
      announce("success", "回应已放回海里，只保存在这台设备的演示数据中。");
    } catch {
      announce("error", "回应没有保存成功，请保留文字后再试。");
    }
  }

  function hideDrawnBottle() {
    if (!drawnBottle || !repository) return;
    try {
      if (repository.hideBottle(state.vaultId, drawnBottle.id)) {
        setDrawnBottle(null);
        setReplyDraft("");
        announce("success", "已在本机隐藏这只瓶子，之后不会再捞到它。");
      }
    } catch {
      announce("error", "隐藏操作没有保存成功。");
    }
  }

  function reportDrawnBottle() {
    if (!drawnBottle || !repository) return;
    try {
      const report = repository.reportBottle(state.vaultId, drawnBottle.id, "用户主动举报");
      if (report) {
        setDrawnBottle(null);
        setReplyDraft("");
        announce("success", "已记录本机举报，并隐藏这只瓶子。Demo 不会把举报发送给任何人。");
      }
    } catch {
      announce("error", "举报操作没有保存成功。");
    }
  }

  function toggleOwnBottle(bottleId: string) {
    if (!repository) return;
    if (expandedBottleId === bottleId) {
      setExpandedBottleId(null);
      setOwnReplies([]);
      return;
    }
    setExpandedBottleId(bottleId);
    setOwnReplies(repository.listRepliesForOwnBottle(state.vaultId, bottleId));
  }

  if (!repository) {
    return (
      <div className="page-content narrow-page bottle-page">
        <div className="page-intro">
          <div>
            <Link to="/" className="back-link"><ArrowLeft size={16} />首页</Link>
            <span className="eyebrow">本机匿名互动 · Demo</span>
            <h1>演示海域暂时无法打开。</h1>
            <p>当前浏览器没有可用的本机存储，漂流瓶不会在没有保存能力时继续运行。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content bottle-page">
      <div className="page-intro bottle-page-intro">
        <div>
          <Link to="/" className="back-link"><ArrowLeft size={16} />首页</Link>
          <span className="eyebrow">本机匿名互动 · Demo</span>
          <h1>把一句话交给海。</h1>
          <p>写下此刻不想署名的话，也可以捞起一只陌生瓶子。这里保留的是连接感的演示，不是真实多人社区。</p>
        </div>
        <div className="bottle-sea-stamp" aria-label="本机演示海域，未连接真实社区">
          <Waves size={24} />
          <strong>本机演示海域</strong>
          <span>未连接真实社区</span>
        </div>
      </div>

      <section className="bottle-boundary" aria-label="漂流瓶数据边界">
        <ShieldCheck size={18} />
        <div>
          <strong>本机演示海域 · 只保存在这台设备</strong>
          <span>未连接真实社区，不会上传、不会展示实名，也不会自动联系任何人。你可以随时在设置里清理本机数据。</span>
          <div className="bottle-flow-guide" aria-label="漂流瓶演示闭环">
            <span>投放</span><i aria-hidden="true">→</i><span>捞取</span><i aria-hidden="true">→</i><span>回应</span><i aria-hidden="true">→</i><span>导出或删除</span>
          </div>
          <Link className="button button-quiet button-with-icon bottle-data-handoff" to="/settings"><Settings2 size={15} />导出或删除本机数据</Link>
        </div>
      </section>

      {status ? <div className={`bottle-status bottle-status-${status.tone}`} role="status">{status.message}</div> : null}

      <div className="bottle-layout">
        <section className="bottle-panel bottle-compose-panel">
          <div className="bottle-panel-head">
            <div>
              <span className="eyebrow">投放一个瓶子</span>
              <h2>说给未知的人听</h2>
            </div>
            <span className="bottle-panel-icon" aria-hidden="true"><Send size={19} /></span>
          </div>
          <label className="bottle-field-label" htmlFor="bottle-content">此刻想留下什么？</label>
          <textarea
            id="bottle-content"
            className="bottle-textarea"
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, 240))}
            placeholder="比如：今天有点累，但我想先完成最小的一步。"
            maxLength={240}
            rows={7}
          />
          <div className="bottle-compose-meta"><span>匿名投放 · {draft.length}/240</span><LockKeyhole size={14} />本机保存</div>
          <button id="bottle-throw" className="button button-primary button-with-icon bottle-primary-button" type="button" onClick={throwBottle} disabled={busy}>
            <Send size={16} />{busy ? "投放中" : "投放漂流瓶"}
          </button>
        </section>

        <section className="bottle-panel bottle-draw-panel">
          <div className="bottle-panel-head">
            <div>
              <span className="eyebrow">捞一只瓶子</span>
              <h2>看看海面带来了什么</h2>
            </div>
            <span className="bottle-panel-icon bottle-panel-icon-warm" aria-hidden="true"><MessageCircle size={19} /></span>
          </div>

          {drawnBottle ? (
            <article className="drawn-bottle" data-drawn-bottle>
              <div className="drawn-bottle-meta"><span>{drawnBottle.alias}</span><time>{formatBottleDate(drawnBottle.createdAt)}</time></div>
              <p>{drawnBottle.content}</p>
              {drawnBottle.demo ? <span className="bottle-demo-tag">示例瓶</span> : null}
              <div className="bottle-reply-block">
                <label className="bottle-field-label" htmlFor="bottle-reply-input">留一句匿名回应</label>
                <textarea
                  id="bottle-reply-input"
                  className="bottle-textarea bottle-reply-textarea"
                  value={replyDraft}
                  onChange={(event) => setReplyDraft(event.target.value.slice(0, 160))}
                  placeholder="可以只是：我看见了，今晚先照顾好自己。"
                  maxLength={160}
                  rows={3}
                />
                <button id="bottle-reply" className="button button-secondary button-with-icon" type="button" onClick={replyToBottle}>
                  <MessageCircle size={16} />放回一条回应
                </button>
              </div>
              <div className="bottle-local-actions">
                <button className="button button-quiet button-with-icon" type="button" onClick={hideDrawnBottle}><RotateCw size={15} />隐藏这只</button>
                <button className="button button-quiet bottle-report-button button-with-icon" type="button" onClick={reportDrawnBottle}><Flag size={15} />本地举报</button>
              </div>
            </article>
          ) : (
            <div className="bottle-draw-empty">
              <div className="bottle-empty-mark" aria-hidden="true"><Waves size={27} /></div>
              <strong>还没有捞起今天的第一只瓶子。</strong>
              <span>里面只有安全的示例内容，以及你自己在这台设备上投放的内容。</span>
            </div>
          )}

          <button id="bottle-draw" className="button button-primary button-with-icon bottle-draw-button" type="button" onClick={drawBottle}>
            <Waves size={17} />{drawnBottle ? "再捞一只" : "随机捞取"}
          </button>
        </section>
      </div>

      <section className="bottle-own-panel">
        <div className="bottle-own-head">
          <div>
            <span className="eyebrow">我的瓶子</span>
            <h2><span id="own-bottle-count">{ownBottles.length}</span> 只留在这里</h2>
          </div>
          <span className="bottle-own-note"><LockKeyhole size={14} />仅当前档案可见</span>
        </div>
        {ownBottles.length ? (
          <div className="own-bottle-list">
            {ownBottles.map((bottle) => {
              const expanded = expandedBottleId === bottle.id;
              return (
                <article className={`own-bottle-item ${expanded ? "is-expanded" : ""}`} key={bottle.id}>
                  <button className="own-bottle-toggle" type="button" aria-expanded={expanded} onClick={() => toggleOwnBottle(bottle.id)}>
                    <span className="own-bottle-line"><span>{bottle.content}</span><time>{formatBottleDate(bottle.createdAt)}</time></span>
                    <span className="own-bottle-action">{expanded ? "收起" : "看回应"}</span>
                  </button>
                  {expanded ? (
                    <div className="own-bottle-replies">
                      {ownReplies.length ? ownReplies.map((reply) => <p key={reply.id}><MessageCircle size={14} /><span>{reply.content}</span></p>) : <span>还没有回应。它会继续留在本机演示海域里。</span>}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="bottle-own-empty">你的瓶子会出现在这里，回应也只在当前匿名档案中可见。</div>
        )}
      </section>
    </div>
  );
}
