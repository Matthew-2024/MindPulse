import { Check, Clipboard, Edit3, MessageCircle, Send, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HelpDraftEvent, HelpNeed, HelpResources, HelpTarget, HelpUrgency } from "../domain/types";

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

function makeDraft(target: HelpTarget, need: HelpNeed, urgency: HelpUrgency, stateSummary: string, resources: HelpResources) {
  const recipient = target === "friend"
    ? "我信任的朋友"
    : target === "teacher"
      ? resources.counselor || "老师 / 辅导员"
      : "家人";
  return `你好，${recipient}。${stateSummary}。我想找一个真实的人陪我聊一会儿。${needMeta[need].phrase}。${urgencyMeta[urgency].phrase}。`;
}

export function HelpComposer({
  resources,
  stateSummary,
  highRisk = false,
  onLog
}: {
  resources: HelpResources;
  stateSummary: string;
  highRisk?: boolean;
  onLog: (event: Omit<HelpDraftEvent, "type" | "createdAt">) => void;
}) {
  const [target, setTarget] = useState<HelpTarget>("friend");
  const [need, setNeed] = useState<HelpNeed>("listen");
  const [urgency, setUrgency] = useState<HelpUrgency>(highRisk ? "now" : "later");
  const [draft, setDraft] = useState(() => makeDraft("friend", "listen", highRisk ? "now" : "later", stateSummary, resources));
  const [copied, setCopied] = useState(false);
  const generationLogged = useRef(false);

  useEffect(() => {
    if (generationLogged.current) return;
    generationLogged.current = true;
    onLog({ target: "friend", need: "listen", urgency: highRisk ? "now" : "later", copied: false });
  }, [highRisk, onLog]);

  const title = useMemo(() => targetMeta[target].title, [target]);

  function selectTarget(next: HelpTarget) {
    setTarget(next);
    setDraft(makeDraft(next, need, urgency, stateSummary, resources));
    setCopied(false);
    onLog({ target: next, need, urgency, copied: false });
  }

  function selectNeed(next: HelpNeed) {
    setNeed(next);
    setDraft(makeDraft(target, next, urgency, stateSummary, resources));
    setCopied(false);
    onLog({ target, need: next, urgency, copied: false });
  }

  function selectUrgency(next: HelpUrgency) {
    setUrgency(next);
    setDraft(makeDraft(target, need, next, stateSummary, resources));
    setCopied(false);
    onLog({ target, need, urgency: next, copied: false });
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft);
    } catch {
      const input = document.createElement("textarea");
      input.value = draft;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    onLog({ target, need, urgency, copied: true });
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
        <span>当前状态摘要</span>
        <strong>{stateSummary}</strong>
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
      <textarea id="help-draft" className="help-draft" value={draft} onChange={(event) => { setDraft(event.target.value); setCopied(false); }} rows={6} />
      <div className="composer-footer">
        <span>只有你主动复制或发送时，这段话才会离开本机；系统不保存正文。</span>
        <button className="button button-primary button-with-icon" type="button" onClick={copyDraft}>
          {copied ? <Check size={16} /> : <Clipboard size={16} />}
          {copied ? "已复制" : "复制草稿"}
        </button>
      </div>
      <div className="composer-note"><Edit3 size={14} />你可以先改成自己的语气，再决定是否发送。</div>
    </section>
  );
}
