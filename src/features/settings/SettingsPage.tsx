import { Check, ChevronRight, CloudOff, Database, Download, KeyRound, LockKeyhole, Phone, RotateCcw, Save, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMindPulse } from "../../app/store";
import { evaluateState } from "../../domain/evaluate-state";
import { hotlineHrefFor } from "../../domain/help-resources";
import type { HelpResources } from "../../domain/types";

function getResourceStatus(dataMode: string, resources: HelpResources) {
  const hotline = resources.hotline.trim();
  if (hotline && !hotlineHrefFor(hotline)) {
    return {
      label: "热线格式无效",
      detail: "这个号码会保存在本机，但格式不对时不会生成拨号链接。",
      configured: false
    };
  }
  const configured = Object.values(resources).filter((value) => value.trim()).length;
  if (configured > 0) {
    return {
      label: "用户配置",
      detail: "保存在本机，不自动联系、不上传。",
      configured: true
    };
  }
  if (dataMode === "synthetic-demo") {
    return {
      label: "示例记录没有真实资源",
      detail: "示例记录不会填入热线或联系人；使用前请填写你确认过的资源。",
      configured: false
    };
  }
  return {
    label: "未配置",
    detail: "高风险时请直接联系当地急救、热线、老师或身边可信任的人。",
    configured: false
  };
}

export function SettingsPage() {
  const { state, setHelpResources, clearLocalData, resetDemoData } = useMindPulse();
  const [resources, setResources] = useState<HelpResources>(state.helpResources);
  const [saved, setSaved] = useState(false);
  const resourceStatus = getResourceStatus(state.dataMode, resources);

  function saveResources(event: React.FormEvent) {
    event.preventDefault();
    setHelpResources(resources);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function exportRecords() {
    const payload = {
      version: "mindpulse-react-v1",
      exportedAt: new Date().toISOString(),
      vaultId: state.vaultId,
      dataMode: state.dataMode,
      records: state.records,
      interventionEvents: state.interventionEvents,
      decision: evaluateState(state.records, "", state.interventionEvents, state.interventionStats, state.safetyHold),
      dataLedger: state.dataLedger,
      privacyBoundary: "导出包含本地记录；云端同步若启用，只允许加密密文，不包含明文心理记录。"
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
        <div className="setting-actions"><button className="button button-secondary button-with-icon" type="button" onClick={exportRecords}><Download size={16} />导出 JSON</button><button className="button button-quiet button-with-icon" type="button" onClick={resetDemoData}><RotateCcw size={16} />恢复演示数据</button></div>
      </section>

      <section className="settings-section">
        <div className="settings-section-head"><div className="settings-icon"><Phone size={18} /></div><div><span className="eyebrow">02 / SUPPORT RESOURCES</span><h2>我的求助资源</h2></div></div>
        <div className={`resource-status ${resourceStatus.configured ? "is-configured" : ""}`} role="status">
          <span>资源状态</span>
          <strong>{resourceStatus.label}</strong>
          <small>{resourceStatus.detail}</small>
        </div>
        <form className="resource-form" onSubmit={saveResources}>
          <label className="input-field"><span>心理援助热线</span><div><input inputMode="tel" aria-invalid={Boolean(resources.hotline.trim() && !hotlineHrefFor(resources.hotline))} value={resources.hotline} onChange={(event) => setResources({ ...resources, hotline: event.target.value })} /><b>号码</b></div></label>
          <label className="input-field"><span>校内心理中心</span><div><input value={resources.counselingCenter} onChange={(event) => setResources({ ...resources, counselingCenter: event.target.value })} /><b>名称</b></div></label>
          <label className="input-field"><span>老师 / 辅导员</span><div><input value={resources.counselor} onChange={(event) => setResources({ ...resources, counselor: event.target.value })} /><b>称呼</b></div></label>
          <label className="input-field"><span>可信任的人</span><div><input value={resources.trustedContact} onChange={(event) => setResources({ ...resources, trustedContact: event.target.value })} /><b>关系</b></div></label>
          <div className="form-actions"><span className="save-state">{saved ? <><Check size={15} />已保存</> : "保存在本机，不自动联系、不上传"}</span><button className="button button-primary button-with-icon" type="submit"><Save size={16} />保存资源</button></div>
        </form>
      </section>

      <section className="settings-section settings-links-section">
        <div className="settings-section-head"><div className="settings-icon"><UserRound size={18} /></div><div><span className="eyebrow">03 / RULES & EVIDENCE</span><h2>当前规则如何判断</h2></div></div>
        <Link className="settings-link-row" to="/rules"><span><strong>规则说明</strong><small>看看遇到不同情况时，心晴会怎么安排下一步</small></span><ChevronRight size={18} /></Link>
        <Link className="settings-link-row" to="/insight"><span><strong>为什么这样建议</strong><small>查看各项记录的影响、和你平时的不同</small></span><ChevronRight size={18} /></Link>
        <div className="evidence-boundary"><span>当前记录属于</span><strong>{state.dataMode === "synthetic-demo" ? "示例记录" : state.dataMode === "empty" ? "空白档案" : "匿名记录"}</strong><small>不会和公开资料或其他人的记录混在一起。</small></div>
      </section>

      <section className="danger-zone">
        <div><Trash2 size={18} /><div><h2>清理本机记录</h2><p>删除这台设备上的记录。已经导出的文件不会自动删除。</p></div></div>
        <button className="button button-danger-outline button-with-icon" type="button" onClick={clearRecords}><Trash2 size={16} />删除本地记录</button>
      </section>
    </div>
  );
}
