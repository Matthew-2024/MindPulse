import { CalendarCheck2, Clock3, ExternalLink, LifeBuoy, MapPin, Phone, ShieldAlert, UserRound } from "lucide-react";
import type { HelpResources, MindPulseDecision } from "../domain/types";
import { externalHrefFor, hotlineHrefFor, resourceVerificationFor, supportFallbackFor } from "../domain/help-resources";
import type { ResourceOperationKind } from "../domain/resource-operations";

export function SafetyGate({ decision, resources, onResourceAction }: {
  decision: MindPulseDecision;
  resources: HelpResources;
  onResourceAction?: (resourceId: string, kind: ResourceOperationKind) => void;
}) {
  const hotline = resources.hotline.trim();
  const resourceVerification = resourceVerificationFor(resources);
  const supportFallback = supportFallbackFor(resources);
  const resourceMarkedInvalid = resources.resourceVerificationStatus === "invalid";
  const hotlineHref = resourceMarkedInvalid ? "" : hotlineHrefFor(hotline);
  const campusHref = resourceMarkedInvalid ? "" : externalHrefFor(resources.campusLink);
  const hotlineMessage = resourceMarkedInvalid
    ? "资源已标记为失效，请在设置中更新并重新核验"
    : hotline
      ? "热线格式无效，请在设置中填写有效号码"
      : "尚未配置，请在设置中填写当地有效资源";
  const hotlineStatus = resourceMarkedInvalid ? resourceVerification.label : hotline && !hotlineHref ? "热线格式无效" : resourceVerification.label;
  const campusStatus = resourceMarkedInvalid ? resourceVerification.label : resources.campusLink.trim() && !campusHref ? "链接无效" : resourceVerification.label;
  const campusSupport = [resources.campusName, resources.counselingCenter, resources.counselor].filter(Boolean).join(" · ") || "尚未配置，请在设置中填写校内有效资源";
  const trustedContact = resources.trustedContact || "尚未配置，请在设置中填写可信任联系人类型";
  const resourceRegion = resources.resourceRegion.trim();
  const hotlineDetails = [
    resourceRegion ? `地区：${resourceRegion}` : "",
    resources.hotlineHours.trim() ? `服务：${resources.hotlineHours.trim()}` : "",
    resources.resourceVerifiedAt.trim() ? `最近核验：${resources.resourceVerifiedAt.trim()}` : "尚未记录核验日期"
  ].filter(Boolean).join(" · ");
  const campusDetails = [
    resourceRegion ? `地区：${resourceRegion}` : "",
    resources.campusHours.trim() ? `服务：${resources.campusHours.trim()}` : "",
    resources.resourceVerifiedAt.trim() ? `最近核验：${resources.resourceVerifiedAt.trim()}` : "尚未记录核验日期"
  ].filter(Boolean).join(" · ");

  const campusCard = campusHref ? (
    <a className="resource-card resource-card-campus" href={campusHref} target="_blank" rel="noreferrer" onClick={() => onResourceAction?.("configured-campus-support", "link-opened")}>
      <UserRound size={18} />
      <span><strong>校内支持</strong><small>{campusSupport}</small><em><MapPin size={12} />{campusDetails} · {campusStatus}</em></span>
      <ExternalLink size={15} />
    </a>
  ) : (
    <div className="resource-card resource-card-campus">
      <UserRound size={18} />
      <span><strong>校内支持</strong><small>{campusSupport}</small><em><MapPin size={12} />{campusDetails} · {campusStatus}</em></span>
    </div>
  );

  return (
    <section className="safety-gate" role="alert">
      <div className="safety-gate-head">
        <div className="safety-gate-icon"><ShieldAlert size={22} /></div>
        <div>
          <span className="eyebrow">安全提醒 · 现在先找人</span>
          <h1>现在先联系一个真实的人</h1>
          <p>先连接一个真实的人。先暂停普通建议，现在只保留求助入口，联系谁由你决定。</p>
        </div>
      </div>
      <div className="safety-evidence">
        <strong>为什么先暂停普通建议</strong>
        <ul>{decision.trace.evidence.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
        <p className="safety-blocked-summary">暂不建议：普通行动已暂停</p>
      </div>
      <p className={"resource-verification-warning resource-verification-" + resourceVerification.status}><CalendarCheck2 size={14} />资源状态：{resourceVerification.label}。{resourceVerification.status === "verified" ? "请仍以你当下核对到的信息为准。" : "请先核对地区、服务时间和链接，再决定是否联系。"}</p>
      <div className="resource-grid">
        {hotlineHref ? (
          <a className="resource-card resource-card-hotline" href={hotlineHref} onClick={() => onResourceAction?.("configured-hotline", "link-opened")}>
            <Phone size={18} />
            <span><strong>心理援助热线</strong><small>{hotline}</small><em><Clock3 size={12} />{hotlineDetails} · {hotlineStatus}</em></span>
            <ExternalLink size={15} />
          </a>
        ) : (
          <div className="resource-card resource-card-unconfigured">
            <Phone size={18} />
            <span><strong>心理援助热线</strong><small>{hotlineMessage}</small><em><Clock3 size={12} />{hotlineDetails}</em></span>
          </div>
        )}
        {campusCard}
        <div className="resource-card">
          <LifeBuoy size={18} />
          <span><strong>身边的人</strong><small>{trustedContact}</small><em><CalendarCheck2 size={12} />由你选择并主动联系</em></span>
        </div>
      </div>
      <div className="safety-actions">
        <a className="button button-primary button-with-icon" href="#help-composer"><LifeBuoy size={16} />生成第一句话</a>
        <span>如果你现在正处于危险中，请先联系当地急救、热线或可信任的成年人。资源保存在本机，不自动联系、不上传。</span>
      </div>
      <section className="offline-support-fallback" data-testid="offline-support-fallback" aria-labelledby="offline-support-title">
        <div className="offline-support-fallback-head">
          <LifeBuoy size={17} />
          <div><strong id="offline-support-title">{supportFallback.title}</strong><span>{supportFallback.detail}</span></div>
        </div>
        <ol>{supportFallback.steps.map((step, index) => <li key={`${supportFallback.id}-${index}`}>{step}</li>)}</ol>
        <a className="button button-secondary button-with-icon" href="#help-composer"><LifeBuoy size={16} />{supportFallback.primaryLabel}</a>
      </section>
    </section>
  );
}
