import { Check, Clipboard, Clock3, Copy, HeartHandshake, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMindPulse } from "../../app/store";
import { invitationStatus, trustedCircleDraft } from "../../domain/trusted-circle";
import type { TrustedCircleScope } from "../../domain/types";

const scopeCopy: Record<TrustedCircleScope, { label: string; detail: string }> = {
  "check-in": { label: "问候一下", detail: "在约定的时间问一句近况" },
  practical: { label: "做一件小事", detail: "陪你完成一个具体、可拒绝的小行动" },
  company: { label: "陪伴一会儿", detail: "在你需要时陪你待一会儿" }
};

function localDateTime(offsetHours: number) {
  return new Date(Date.now() + offsetHours * 60 * 60 * 1000).toISOString().slice(0, 16);
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("COPY_FAILED");
  }
}

export function TrustedCirclePage() {
  const {
    state,
    createTrustedCircleInvitation,
    revokeTrustedCircleInvitation,
    createTrustedCircleCheckback,
    updateTrustedCircleCheckback
  } = useMindPulse();
  const [recipientLabel, setRecipientLabel] = useState("");
  const [scope, setScope] = useState<TrustedCircleScope>("check-in");
  const [expiresAt, setExpiresAt] = useState(() => localDateTime(72));
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [checkbackDueAt, setCheckbackDueAt] = useState(() => localDateTime(24));
  const invitations = useMemo(() => state.trustedCircleInvitations.map((invitation) => ({ ...invitation, currentStatus: invitationStatus(invitation) })), [state.trustedCircleInvitations]);

  async function createInvitation(event: React.FormEvent) {
    event.preventDefault();
    setStatus("");
    try {
      await createTrustedCircleInvitation({ recipientLabel, scope, expiresAt: new Date(expiresAt).toISOString(), consent });
      setRecipientLabel("");
      setConsent(false);
      setStatus("已创建本地邀请。请先确认对方愿意，再由你自己复制并发送内容。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "无法创建邀请");
    }
  }

  async function copyInvitation(invitationId: string) {
    const invitation = state.trustedCircleInvitations.find((item) => item.id === invitationId);
    if (!invitation) return;
    try {
      await copyText(trustedCircleDraft(invitation));
      setCopiedId(invitationId);
      setStatus("内容已复制。应用没有发送任何消息。");
    } catch {
      setStatus("复制失败，请手动选择并复制邀请文字。应用没有发送任何消息。");
    }
  }

  async function scheduleCheckback(invitationId: string) {
    setStatus("");
    try {
      await createTrustedCircleCheckback(invitationId, new Date(checkbackDueAt).toISOString());
      setStatus("已在本机安排回访提醒；不会自动联系任何人。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "无法安排回访");
    }
  }

  return (
    <div className="page-content trusted-circle-page">
      <div className="page-intro">
        <div>
          <Link to="/settings" className="back-link">返回设置</Link>
          <span className="eyebrow">TRUSTED CIRCLE / LOCAL ONLY</span>
          <h1>邀请一个人，约定一小段支持。</h1>
          <p>这里只生成你自己可以复制的文字和本机回访提醒。不会读取通讯录、不会自动发送，也不会默认分享任何记录。</p>
        </div>
        <HeartHandshake size={24} />
      </div>

      <section className="settings-section trusted-circle-boundary" data-testid="trusted-circle-boundary">
        <div className="settings-section-head"><div className="settings-icon"><ShieldCheck size={18} /></div><div><span className="eyebrow">CONSENT FIRST</span><h2>每次联系都由你决定</h2></div></div>
        <div className="contract-grid">
          <div><ShieldCheck size={16} /><span>通讯录</span><strong>不读取</strong></div>
          <div><Clipboard size={16} /><span>发送方式</span><strong>仅复制</strong></div>
          <div><Clock3 size={16} /><span>原始历史</span><strong>默认不分享</strong></div>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-head"><div className="settings-icon"><UserPlus size={18} /></div><div><span className="eyebrow">NEW INVITATION</span><h2>建立一段短期约定</h2></div></div>
        <form className="resource-form trusted-circle-form" onSubmit={createInvitation}>
          <label className="input-field"><span>你怎么称呼对方</span><div><input data-testid="trusted-circle-recipient" value={recipientLabel} maxLength={80} onChange={(event) => setRecipientLabel(event.target.value)} placeholder="例如：室友、朋友、姐姐" /><b>称呼</b></div></label>
          <div className="help-need-block"><div className="field-label">希望对方提供什么支持</div><div className="segmented-control" aria-label="选择支持范围">{(Object.keys(scopeCopy) as TrustedCircleScope[]).map((key) => <button key={key} data-scope={key} className={scope === key ? "is-active" : ""} type="button" onClick={() => setScope(key)}>{scopeCopy[key].label}</button>)}</div><small>{scopeCopy[scope].detail}</small></div>
          <label className="input-field"><span>邀请有效到</span><div><input data-testid="trusted-circle-expiry" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /><b>有效期</b></div></label>
          <label className="sharing-summary-toggle"><input data-testid="trusted-circle-consent" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span><strong>我确认会先征得对方同意</strong><small>对方可以拒绝；应用不会替你联系或搜索任何人。</small></span></label>
          <div className="form-actions"><span className="save-state">只保存称呼、范围、有效期和状态。</span><button className="button button-primary button-with-icon" data-testid="create-trusted-circle" type="submit"><UserPlus size={16} />创建本地邀请</button></div>
        </form>
      </section>

      <section className="settings-section trusted-circle-list" aria-live="polite">
        <div className="settings-section-head"><div className="settings-icon"><HeartHandshake size={18} /></div><div><span className="eyebrow">INVITATIONS</span><h2>当前约定</h2></div></div>
        {status ? <div className="demo-switcher-status" role="status">{status}</div> : null}
        {invitations.length ? invitations.map((invitation) => {
          const checkbacks = state.trustedCircleCheckbacks.filter((item) => item.invitationId === invitation.id);
          return <article className="trusted-circle-item" data-testid="trusted-circle-invitation" data-status={invitation.currentStatus} key={invitation.id}>
            <div><span className="eyebrow">{invitation.currentStatus}</span><h3>{invitation.recipientLabel}</h3><p>{scopeCopy[invitation.scope].detail}，有效至 {new Date(invitation.expiresAt).toLocaleString("zh-CN")}。</p></div>
            {invitation.currentStatus === "active" ? <div className="fixture-actions"><button className="button button-secondary button-with-icon" data-testid="copy-circle-draft" type="button" onClick={() => copyInvitation(invitation.id)}>{copiedId === invitation.id ? <Check size={15} /> : <Copy size={15} />}{copiedId === invitation.id ? "已复制" : "复制邀请文字"}</button><button className="button button-danger-outline button-with-icon" data-testid="revoke-circle-invitation" type="button" onClick={() => revokeTrustedCircleInvitation(invitation.id)}><Trash2 size={15} />撤销</button></div> : null}
            {invitation.currentStatus === "active" ? <div className="trusted-circle-checkback"><label className="input-field"><span>回访时间</span><div><input data-testid="trusted-circle-checkback-time" type="datetime-local" value={checkbackDueAt} onChange={(event) => setCheckbackDueAt(event.target.value)} /><b>时间</b></div></label><button className="button button-quiet button-with-icon" data-testid="schedule-circle-checkback" type="button" onClick={() => scheduleCheckback(invitation.id)}><Clock3 size={15} />安排回访</button></div> : null}
            {checkbacks.map((checkback) => <div className="trusted-circle-checkback-status" key={checkback.id}><span>回访：{checkback.status} / {new Date(checkback.dueAt).toLocaleString("zh-CN")}</span>{checkback.status === "planned" ? <div><button data-testid="complete-circle-checkback" type="button" onClick={() => updateTrustedCircleCheckback(checkback.id, "completed")}>已完成</button><button type="button" onClick={() => updateTrustedCircleCheckback(checkback.id, "skipped")}>跳过</button></div> : null}</div>)}
          </article>;
        }) : <div className="quiet-panel"><strong>还没有约定</strong><span>先从一个称呼、一种支持范围和明确的有效期开始。</span></div>}
      </section>
    </div>
  );
}
