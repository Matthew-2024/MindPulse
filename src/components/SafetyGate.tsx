import { ExternalLink, LifeBuoy, Phone, ShieldAlert, UserRound } from "lucide-react";
import type { HelpResources, MindPulseDecision } from "../domain/types";
import { hotlineHrefFor } from "../domain/help-resources";

import { actionLabel } from "../domain/display-labels";

export function SafetyGate({ decision, resources }: { decision: MindPulseDecision; resources: HelpResources }) {
  const hotline = resources.hotline.trim();
  const hotlineHref = hotlineHrefFor(hotline);
  const hotlineMessage = hotline ? "热线格式无效，请在设置中填写有效号码" : "尚未配置，请在设置中填写当地有效资源";
  const campusSupport = [resources.counselingCenter, resources.counselor].filter(Boolean).join(" · ") || "尚未配置，请在设置中填写校内有效资源";
  const trustedContact = resources.trustedContact || "尚未配置，请在设置中填写可信任联系人类型";
  const blockedLabels = decision.trace.blockedActions.map(actionLabel);
  return (
    <section className="safety-gate" role="alert">
      <div className="safety-gate-head">
        <div className="safety-gate-icon"><ShieldAlert size={22} /></div>
        <div>
          <span className="eyebrow">安全提醒 · 现在先找人</span>
          <h1>先连接一个真实的人</h1>
          <p>先暂停普通建议。现在只保留求助入口，联系谁由你决定。</p>
        </div>
      </div>
      <div className="safety-evidence">
        <strong>为什么先暂停普通建议</strong>
        <ul>{decision.trace.evidence.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
        <p className="safety-blocked-summary">暂不建议：{blockedLabels.length ? blockedLabels.join("、") : "普通行动"}</p>
      </div>
      <div className="resource-grid">
        {hotlineHref ? (
          <a className="resource-card resource-card-hotline" href={hotlineHref}>
            <Phone size={18} />
            <span><strong>心理援助热线</strong><small>{hotline}</small></span>
            <ExternalLink size={15} />
          </a>
        ) : (
          <div className="resource-card resource-card-unconfigured">
            <Phone size={18} />
            <span><strong>心理援助热线</strong><small>{hotlineMessage}</small></span>
          </div>
        )}
        <div className="resource-card">
          <UserRound size={18} />
          <span><strong>校内支持</strong><small>{campusSupport}</small></span>
        </div>
        <div className="resource-card">
          <LifeBuoy size={18} />
          <span><strong>身边的人</strong><small>{trustedContact}</small></span>
        </div>
      </div>
      <div className="safety-actions">
        <a className="button button-primary button-with-icon" href="#help-composer"><LifeBuoy size={16} />生成第一句话</a>
        <span>如果你现在正处于危险中，请先联系当地急救、热线或可信任的成年人。资源保存在本机，不自动联系、不上传。</span>
      </div>
    </section>
  );
}
