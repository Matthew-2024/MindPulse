import { AlertTriangle, Check, ChevronRight, CloudOff, Database, Download, FlaskConical, KeyRound, LockKeyhole, Phone, RotateCcw, Save, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMindPulse } from "../../app/store";
import { evaluateState } from "../../domain/evaluate-state";
import { externalHrefFor, hotlineHrefFor, resourceVerificationFor } from "../../domain/help-resources";
import type { HelpResourceVerificationStatus, HelpResources } from "../../domain/types";

function getResourceStatus(dataMode: string, resources: HelpResources) {
  const verification = resourceVerificationFor(resources);
  if (dataMode === "synthetic-demo" && !verification.configured) {
    return {
      ...verification,
      label: verification.label + " · 示例记录没有真实资源",
      detail: "示例记录不会填入热线或联系人；使用前请填写并核验你确认过的资源。"
    };
  }
  return verification;
}

function verifiedAtLabel(value: string) {
  return value.trim() ? `最近核验：${value}` : "尚未记录核验日期";
}

export function SettingsPage() {
  const { state, setHelpResources, clearLocalData, resetDemoData, addRecord } = useMindPulse();
  const navigate = useNavigate();
  const [resources, setResources] = useState<HelpResources>(state.helpResources);
  const [saved, setSaved] = useState(false);
  const [demoMessage, setDemoMessage] = useState("");
  const [demoSwitching, setDemoSwitching] = useState<"normal" | "empty" | "high" | null>(null);
  const resourceStatus = getResourceStatus(state.dataMode, resources);

  function updateResource<K extends keyof HelpResources>(key: K, value: HelpResources[K]) {
    setResources((current) => ({
      ...current,
      [key]: value,
      resourceVerificationStatus: "unverified",
      resourceVerificationActionAt: ""
    }));
  }

  function saveResources(event: React.FormEvent) {
    event.preventDefault();
    setHelpResources(resources);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function applyVerification(status: HelpResourceVerificationStatus) {
    const now = new Date();
    const next: HelpResources = {
      ...resources,
      resourceVerificationStatus: status,
      resourceVerificationActionAt: now.toISOString(),
      resourceVerifiedAt: status === "verified" ? now.toISOString().slice(0, 10) : resources.resourceVerifiedAt
    };
    setResources(next);
    setHelpResources(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function exportRecords() {
    const bottleData = typeof window !== "undefined" && window.MindPulseBottleRepository
      ? window.MindPulseBottleRepository.createLocalBottleRepository(window.localStorage).exportOwnData(state.vaultId)
      : { bottles: [], bottleReplies: [], hiddenBottleIds: [], reports: [] };
    const privacyReceiptEvents = state.tasks.filter((item): item is Record<string, unknown> => (
      Boolean(item && typeof item === "object" && (item as Record<string, unknown>).type === "help-draft")
    ));
    const interventionEvents = state.interventionEvents.map(({ feedbackNote, ...event }) => event);
    const payload = {
      version: "mindpulse-react-v2",
      exportedAt: new Date().toISOString(),
      vaultId: state.vaultId,
      dataMode: state.dataMode,
      records: state.records,
      interventionEvents,
      safetyHold: state.safetyHold,
      safetyEvents: state.safetyEvents,
      decision: evaluateState(state.records, "", state.interventionEvents, state.interventionStats, state.safetyHold),
      dataLedger: state.dataLedger,
      privacyReceiptEvents,
      bottles: bottleData.bottles,
      bottleReplies: bottleData.bottleReplies,
      bottleVisibility: {
        hiddenBottleIds: bottleData.hiddenBottleIds,
        reports: bottleData.reports,
        scope: "只包含当前匿名档案自己的瓶子、可见回应和本机隐藏/举报记录；固定示例瓶不作为用户数据导出。"
      },
      privacyBoundary: "导出包含本机记录、当前匿名档案自己的漂流瓶与结构化分享收据；云端同步关闭，不包含自动发送或明文云端副本。"
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mindpulse-records.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function clearRecords() {
    if (!window.confirm("确定删除本机记录吗？删除后，这台设备上的记录会被清掉。")) return;
    await clearLocalData();
  }

  async function switchDemo(mode: "normal" | "empty" | "high") {
    setDemoSwitching(mode);
    setDemoMessage("");
    try {
      if (mode === "normal") {
        resetDemoData();
        setDemoMessage("已切换到普通波动演示：使用固定示例记录。 ");
        return;
      }
      if (mode === "empty") {
        await clearLocalData();
        setDemoMessage("已切换到空白档案演示：只允许补充记录。 ");
        return;
      }
      await addRecord({
        entryType: "synthetic",
        dataMode: "synthetic-demo",
        dataInputMode: "synthetic-demo",
        mood: "sad",
        energyLevel: "low",
        connectionNeed: "need",
        note: "我很绝望，想从这个世界上消失"
      });
      navigate("/help");
    } catch {
      setDemoMessage("切换演示状态失败，请刷新后重试。 ");
    } finally {
      setDemoSwitching(null);
    }
  }

  return (
    <div className="page-content settings-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">SETTINGS / DATA BOUNDARY</span>
          <h1>设置你愿意交给系统的边界。</h1>
          <p>隐私、求助资源和判断方式都放在这里，需要解释时一眼就能看懂。</p>
        </div>
      </div>

      <section className="settings-section">
        <div className="settings-section-head"><div className="settings-icon"><Database size={18} /></div><div><span className="eyebrow">01 / DATA LEDGER</span><h2>我的数据去了哪里</h2></div></div>
        <div className="ledger-list">
          <div className="ledger-row"><span><KeyRound size={15} />本机资料编号</span><code>{state.vaultId}</code></div>
          <div className="ledger-row"><span><Database size={15} />记录放在哪里</span><strong>这台设备 · 只保存在本机</strong></div>
          <div className="ledger-row"><span><CloudOff size={15} />云端副本</span><strong>关闭 · 不上传明文</strong></div>
          <div className="ledger-row"><span><LockKeyhole size={15} />记录类型</span><strong>{state.dataMode === "synthetic-demo" ? "示例记录" : state.dataMode === "empty" ? "还没有记录" : "匿名记录"}</strong></div>
        </div>
        <div className="setting-actions"><button className="button button-secondary button-with-icon" type="button" id="exportRecords" onClick={exportRecords}><Download size={16} />导出 JSON</button><button className="button button-quiet button-with-icon" type="button" onClick={resetDemoData}><RotateCcw size={16} />恢复演示数据</button></div>
        <div className="privacy-receipt-ledger" data-testid="privacy-receipt-ledger"><span><LockKeyhole size={14} />分享收据</span><strong>{state.tasks.filter((item) => Boolean(item && typeof item === "object" && (item as Record<string, unknown>).type === "help-draft")).length} 条字段记录</strong><small>只记录判断编号、字段选择、来源类型和复制动作，不保存编辑后的正文。</small></div>
        <div className="privacy-receipt-ledger" data-testid="continuity-boundary" data-continuity-mode="off"><span><CloudOff size={14} />加密连续同步</span><strong>关闭</strong><small>当前版本没有已审查的云端传输服务；记录只留在本机。加密协议与恢复契约已准备好，但不会自动上传、创建账号或启用同步。</small></div>
      </section>

      <section className="settings-section demo-switcher" aria-label="答辩演示状态">
        <div className="settings-section-head"><div className="settings-icon"><FlaskConical size={18} /></div><div><span className="eyebrow">DEMO / THREE STATES</span><h2>答辩演示状态</h2></div></div>
        <p className="demo-switcher-copy">只切换固定演示数据。普通、空白和高风险分别对应三条受控路径，不使用真实危机经历。</p>
        <div className="demo-switcher-actions">
          <button className="button button-secondary button-with-icon" type="button" disabled={Boolean(demoSwitching)} onClick={() => switchDemo("normal")}><RotateCcw size={16} />{demoSwitching === "normal" ? "切换中" : "切换到普通波动"}</button>
          <button className="button button-quiet button-with-icon" type="button" disabled={Boolean(demoSwitching)} onClick={() => switchDemo("empty")}><CloudOff size={16} />{demoSwitching === "empty" ? "切换中" : "切换到空白档案"}</button>
          <button className="button button-danger-outline button-with-icon" type="button" disabled={Boolean(demoSwitching)} onClick={() => switchDemo("high")}><AlertTriangle size={16} />{demoSwitching === "high" ? "切换中" : "切换到高风险演示"}</button>
        </div>
        {demoMessage ? <div className="demo-switcher-status" role="status">{demoMessage}</div> : null}
      </section>

      <section className="settings-section">
        <div className="settings-section-head"><div className="settings-icon"><Phone size={18} /></div><div><span className="eyebrow">02 / SUPPORT RESOURCES</span><h2>我的求助资源</h2></div></div>
        <div className={`resource-status ${resourceStatus.configured ? "is-configured" : ""}`} role="status">
          <span>资源状态</span>
          <strong>{resourceStatus.label}</strong>
          <small>{resourceStatus.detail}</small>
        </div>
        <div className="resource-verification-actions">
          <span>使用前请确认资源仍然可用</span>
          <div>
            <button className="button button-quiet button-with-icon" type="button" onClick={() => applyVerification("verified")}><Check size={15} />我确认这个资源可用</button>
            <button className="button button-danger-outline button-with-icon" type="button" onClick={() => applyVerification("invalid")}><Trash2 size={15} />资源已经失效</button>
            <button className="button button-secondary button-with-icon" type="button" onClick={() => applyVerification("unverified")}><RotateCcw size={15} />稍后核验</button>
          </div>
        </div>
        <form className="resource-form" onSubmit={saveResources}>
          <label className="input-field"><span>心理援助热线</span><div><input inputMode="tel" aria-invalid={Boolean(resources.hotline.trim() && !hotlineHrefFor(resources.hotline))} value={resources.hotline} onChange={(event) => updateResource("hotline", event.target.value)} /><b>号码</b></div></label>
          <label className="input-field"><span>热线服务时间</span><div><input value={resources.hotlineHours} onChange={(event) => updateResource("hotlineHours", event.target.value)} placeholder="例如：全天 / 工作日 9:00–17:00" /><b>时间</b></div></label>
          <label className="input-field"><span>所在地区</span><div><input value={resources.resourceRegion} onChange={(event) => updateResource("resourceRegion", event.target.value)} placeholder="例如：上海 / 校内" /><b>地区</b></div></label>
          <label className="input-field"><span>学校 / 校区</span><div><input value={resources.campusName} onChange={(event) => updateResource("campusName", event.target.value)} /><b>名称</b></div></label>
          <label className="input-field"><span>校内心理中心</span><div><input value={resources.counselingCenter} onChange={(event) => updateResource("counselingCenter", event.target.value)} /><b>名称</b></div></label>
          <label className="input-field"><span>老师 / 辅导员</span><div><input value={resources.counselor} onChange={(event) => updateResource("counselor", event.target.value)} /><b>称呼</b></div></label>
          <label className="input-field"><span>校内支持链接</span><div><input type="url" inputMode="url" aria-invalid={Boolean(resources.campusLink.trim() && !externalHrefFor(resources.campusLink))} value={resources.campusLink} onChange={(event) => updateResource("campusLink", event.target.value)} placeholder="https://..." /><b>链接</b></div></label>
          <label className="input-field"><span>校内服务时间</span><div><input value={resources.campusHours} onChange={(event) => updateResource("campusHours", event.target.value)} placeholder="例如：周一至周五 9:00–17:00" /><b>时间</b></div></label>
          <label className="input-field"><span>最近核验日期</span><div><input type="date" value={resources.resourceVerifiedAt} onChange={(event) => updateResource("resourceVerifiedAt", event.target.value)} /><b>日期</b></div></label>
          <label className="input-field"><span>可信任的人</span><div><input value={resources.trustedContact} onChange={(event) => updateResource("trustedContact", event.target.value)} /><b>关系</b></div></label>
          <p className="resource-form-note">这些信息只用于在高风险时给你看清楚“可以联系谁”。链接不会自动打开，系统也不会自动联系任何人。核验超过 90 天后会显示为“较久未核验”。</p>
          <div className="form-actions"><span className="save-state">{saved ? <><Check size={15} />已保存</> : "保存在本机，不自动联系、不上传"}</span><button className="button button-primary button-with-icon" type="submit"><Save size={16} />保存资源</button></div>
        </form>
      </section>

      <section className="settings-section settings-links-section">
        <div className="settings-section-head"><div className="settings-icon"><UserRound size={18} /></div><div><span className="eyebrow">03 / RULES & EVIDENCE</span><h2>当前规则如何判断</h2></div></div>
        <Link className="settings-link-row" to="/rules"><span><strong>规则说明</strong><small>看看遇到不同情况时，心晴会怎么安排下一步</small></span><ChevronRight size={18} /></Link>
        <Link className="settings-link-row" to="/insight"><span><strong>为什么这样建议</strong><small>查看各项记录的影响、和你平时的不同</small></span><ChevronRight size={18} /></Link>
        <Link className="settings-link-row" to="/circle"><span><strong>可信联系人约定</strong><small>生成本地邀请与回访提醒；不读取通讯录，也不自动发送</small></span><ChevronRight size={18} /></Link>
        <div className="evidence-boundary"><span>当前记录属于</span><strong>{state.dataMode === "synthetic-demo" ? "示例记录" : state.dataMode === "empty" ? "空白档案" : "匿名记录"}</strong><small>不会和公开资料或其他人的记录混在一起。</small></div>
      </section>

      <section className="danger-zone">
        <div><Trash2 size={18} /><div><h2>清理本机记录</h2><p>删除这台设备上的记录。已经导出的文件不会自动删除。</p></div></div>
        <button className="button button-danger-outline button-with-icon" type="button" onClick={clearRecords}><Trash2 size={16} />删除本地记录</button>
      </section>
    </div>
  );
}
