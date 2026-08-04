import { Check, Clipboard, Edit3, MessageCircle, Send, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HelpDraftEvent, HelpNeed, HelpResources, HelpTarget, HelpUrgency } from "../domain/types";
import { DEMO_CAMPUS_RESOURCE_PACK } from "../domain/resource-pack";

const targetMeta: Record<HelpTarget, { label: string; title: string }> = {
  friend: { label: "朋友", title: "发给朋友" },
  teacher: { label: "老师", title: "发给老师 / 辅导员" },
  family: { label: "家人", title: "发给家人" }
};

const needMeta: Record<HelpNeed, { label: string; phrase: string }> = {
  listen: { label: "先听我说一会儿", phrase: "我现在不需要你马上解决问题，只希望你先听我说一会儿" },
  stay: { label: "陪我保持联系", phrase: "我想请你先和我保持联系，过一会儿再问我一次" },
  accompany: { label: "陪我找支持", phrase: "我想请你陪我一起联系老师、家人或热线" }
};

const urgencyMeta: Record<HelpUrgency, { label: string; phrase: string }> = {
  now: { label: "现在需要联系", phrase: "如果方便，希望你现在回复我或和我保持联系" },
  later: { label: "暂时不用马上联系", phrase: "你方便的时候回复我就好" }
};

function makeDraft(target: HelpTarget, need: HelpNeed, urgency: HelpUrgency, stateSummary: string, resources: HelpResources, includeStateSummary = false) {
  const recipient = target === "friend"
    ? "我信任的朋友"
    : target === "teacher"
      ? resources.counselor || "老师 / 辅导员"
      : "家人";
  const context = includeStateSummary && stateSummary.trim() ? `${stateSummary.trim()}。` : "";
  return `你好，${recipient}。${context}我想找一个真实的人陪我聊一会儿。${needMeta[need].phrase}。${urgencyMeta[urgency].phrase}。`;
}

export function HelpComposer({
  resources,
  stateSummary,
  decisionId,
  sourceTypes,
  highRisk = false,
  onLog,
  onResourceCopy
}: {
  resources: HelpResources;
  stateSummary: string;
  decisionId: string;
  sourceTypes: string[];
  highRisk?: boolean;
  onLog: (event: Omit<HelpDraftEvent, "type" | "createdAt">) => void;
  onResourceCopy?: () => void;
}) {
  const [target, setTarget] = useState<HelpTarget>("friend");
  const [need, setNeed] = useState<HelpNeed>("listen");
  const [urgency, setUrgency] = useState<HelpUrgency>(highRisk ? "now" : "later");
  const [draft, setDraft] = useState(() => makeDraft("friend", "listen", highRisk ? "now" : "later", stateSummary, resources, false));
  const [includeStateSummary, setIncludeStateSummary] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const generationLogged = useRef(false);
  const userEdited = useRef(false);

  function logReceipt(next: {
    target: HelpTarget;
    need: HelpNeed;
    urgency: HelpUrgency;
    copied: boolean;
    includeStateSummary: boolean;
    userEdited?: boolean;
  }) {
    const includedFields = ["user-edited-draft", "support-target", "support-need", "urgency"];
    if (next.includeStateSummary) includedFields.push("state-summary");
    onLog({
      decisionId,
      resourcePackId: DEMO_CAMPUS_RESOURCE_PACK.packId,
      resourceId: "offline-support-fallback",
      resourceVersion: DEMO_CAMPUS_RESOURCE_PACK.version,
      action: next.copied ? "copy" : "preview",
      target: next.target,
      need: next.need,
      urgency: next.urgency,
      copied: next.copied,
      includeStateSummary: next.includeStateSummary,
      includedFields,
      excludedFields: [
        "original-note",
        "full-history",
        "anonymous-vault-id",
        "unselected-sleep",
        "unselected-steps",
        "device-data",
        ...(next.includeStateSummary ? [] : ["state-summary"])
      ],
      sourceTypes: Array.from(new Set(sourceTypes.filter(Boolean))),
      userEdited: next.userEdited === true,
      copiedAt: next.copied ? new Date().toISOString() : null
    });
  }

  useEffect(() => {
    if (generationLogged.current) return;
    generationLogged.current = true;
    logReceipt({ target: "friend", need: "listen", urgency: highRisk ? "now" : "later", copied: false, includeStateSummary: false });
  }, [highRisk, decisionId, sourceTypes]);

  const title = useMemo(() => targetMeta[target].title, [target]);

  function selectTarget(next: HelpTarget) {
    setTarget(next);
    setDraft(makeDraft(next, need, urgency, stateSummary, resources, includeStateSummary));
    setCopied(false);
    logReceipt({ target: next, need, urgency, copied: false, includeStateSummary });
  }

  function selectNeed(next: HelpNeed) {
    setNeed(next);
    setDraft(makeDraft(target, next, urgency, stateSummary, resources, includeStateSummary));
    setCopied(false);
    logReceipt({ target, need: next, urgency, copied: false, includeStateSummary });
  }

  function selectUrgency(next: HelpUrgency) {
    setUrgency(next);
    setDraft(makeDraft(target, need, next, stateSummary, resources, includeStateSummary));
    setCopied(false);
    logReceipt({ target, need, urgency: next, copied: false, includeStateSummary });
  }

  function toggleStateSummary(next: boolean) {
    setIncludeStateSummary(next);
    setDraft(makeDraft(target, need, urgency, stateSummary, resources, next));
    setCopied(false);
    logReceipt({ target, need, urgency, copied: false, includeStateSummary: next });
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft);
    } catch {
      try {
        const input = document.createElement("textarea");
        input.value = draft;
        document.body.appendChild(input);
        input.select();
        const copiedByFallback = document.execCommand("copy");
        input.remove();
        if (!copiedByFallback) throw new Error("COPY_FAILED");
      } catch {
        setCopyError(true);
        return;
      }
    }
    setCopyError(false);
    setCopied(true);
    logReceipt({ target, need, urgency, copied: true, includeStateSummary, userEdited: draft !== makeDraft(target, need, urgency, stateSummary, resources, includeStateSummary) });
    onResourceCopy?.();
  }

  return (
    <section className="composer-panel" id="help-composer">
      <div className="section-heading">
        <div>
          <span className="eyebrow">求助话术</span>
          <h2>把“我需要帮助”说出口</h2>
        </div>
        <Send size={19} />
      </div>
      <div className="help-context-summary">
        <span>当前状态摘要（可选）</span>
        <strong>默认不会加入话术；只有你主动勾选后才会出现在预览中</strong>
      </div>
      <div className="segmented-control" aria-label="选择求助对象">
        {(Object.keys(targetMeta) as HelpTarget[]).map((key) => (
          <button className={target === key ? "is-active" : ""} key={key} onClick={() => selectTarget(key)} type="button">
            <UserRound size={15} />{targetMeta[key].label}
          </button>
        ))}
      </div>
      <div className="help-need-block">
        <div className="field-label"><MessageCircle size={14} />你希望对方怎么帮你</div>
        <div className="help-need-options" role="group" aria-label="选择希望获得的支持">
          {(Object.keys(needMeta) as HelpNeed[]).map((key) => (
            <button className={`help-need-option ${need === key ? "is-selected" : ""}`} key={key} onClick={() => selectNeed(key)} type="button">
              <span className="help-need-radio" aria-hidden="true" />
              <span>{needMeta[key].label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="help-need-block">
        <div className="field-label"><MessageCircle size={14} />我现在是否需要马上联系</div>
        <div className="help-need-options help-urgency-options" role="group" aria-label="选择联系的紧迫程度">
          {(Object.keys(urgencyMeta) as HelpUrgency[]).map((key) => (
            <button className={`help-need-option ${urgency === key ? "is-selected" : ""}`} key={key} onClick={() => selectUrgency(key)} type="button">
              <span className="help-need-radio" aria-hidden="true" />
              <span>{urgencyMeta[key].label}</span>
            </button>
          ))}
        </div>
      </div>
      <label className="field-label" htmlFor="help-draft">{title}</label>
      <textarea
        id="help-draft"
        className="help-draft"
        value={draft}
        onChange={(event) => { userEdited.current = true; setDraft(event.target.value); setCopied(false); }}
        onBlur={() => {
          if (!userEdited.current) return;
          userEdited.current = false;
          logReceipt({ target, need, urgency, copied: false, includeStateSummary, userEdited: true });
        }}
        rows={6}
      />
      <section className="sharing-preview" data-testid="privacy-receipt" aria-labelledby="sharing-preview-title">
        <div className="sharing-preview-head">
          <div>
            <span className="eyebrow">分享前确认</span>
            <h3 id="sharing-preview-title">你决定带走哪些内容</h3>
          </div>
          <ShieldCheck size={18} />
        </div>
        <label className="sharing-summary-toggle">
          <input type="checkbox" checked={includeStateSummary} onChange={(event) => toggleStateSummary(event.target.checked)} />
          <span><strong>加入当前状态摘要</strong><small>这是你和自己平时节奏的简短描述，不包含原始备注或完整历史。</small></span>
        </label>
        <div className="sharing-preview-message">
          <span>即将复制的正文</span>
          <p>{draft || "还没有内容"}</p>
        </div>
        <div className="sharing-preview-grid">
          <div>
            <span>会包含</span>
            <strong>{includeStateSummary ? `你编辑后的正文 · 状态摘要：${stateSummary}` : "你编辑后的正文 · 支持对象 · 需要 · 紧迫程度"}</strong>
          </div>
          <div>
            <span>当前需要</span>
            <strong>{needMeta[need].label} · {urgencyMeta[urgency].label}</strong>
          </div>
          <div className="sharing-preview-exclude">
            <span>不会包含</span>
            <strong>原始备注、完整历史、匿名 ID、未选择的睡眠或步数数据</strong>
          </div>
        </div>
        <p className="sharing-preview-boundary"><ShieldCheck size={14} />来源：{sourceTypes.length ? sourceTypes.join("、") : "自我记录"}。只有你主动复制或发送时，内容才会离开本机；系统不会自动上报或自动联系任何人。</p>
      </section>
      <div className="composer-footer">
        <span>系统不保存你编辑的正文。</span>
        <button className="button button-primary button-with-icon" type="button" onClick={copyDraft}>
          {copied ? <Check size={16} /> : <Clipboard size={16} />}
          {copied ? "已复制" : "复制草稿"}
        </button>
      </div>
      <div className="composer-note"><Edit3 size={14} />你可以先改成自己的语气，再决定是否发送；系统只记录字段选择和复制动作，不保存你编辑后的正文。</div>
      {copyError ? <div className="copy-status" role="status">复制失败，请手动选择并复制文字。</div> : null}
    </section>
  );
}
