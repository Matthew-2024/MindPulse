import type { HelpResourceVerificationStatus, HelpResources } from "./types";

const HOTLINE_CHARS = /^[+0-9\s().-]+$/;

const EXTERNAL_URL_PROTOCOLS = new Set(["http:", "https:"]);
const RESOURCE_VERIFY_WINDOW_DAYS = 90;

export interface SupportFallback {
  id: "offline-support-fallback";
  title: string;
  detail: string;
  steps: string[];
  primaryLabel: string;
}

export function normalizeHotline(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw || !HOTLINE_CHARS.test(raw)) return "";
  const compact = raw.replace(/[\s().-]/g, "");
  if (!/^\+?\d{3,20}$/.test(compact)) return "";
  return compact;
}

export function hotlineHrefFor(value: unknown) {
  const normalized = normalizeHotline(value);
  return normalized ? `tel:${normalized}` : "";
}

export function externalHrefFor(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return EXTERNAL_URL_PROTOCOLS.has(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function configuredResourceCount(resources: HelpResources) {
  return [
    resources.hotline,
    resources.campusName,
    resources.counselingCenter,
    resources.counselor,
    resources.campusLink,
    resources.trustedContact
  ].filter((value) => String(value || "").trim()).length;
}

function daysSince(dateValue: string) {
  const parsed = new Date(`${dateValue}T23:59:59`).getTime();
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor((Date.now() - parsed) / (24 * 60 * 60 * 1000)));
}

export function resourceVerificationFor(resources: HelpResources): {
  status: HelpResourceVerificationStatus;
  label: string;
  detail: string;
  configured: boolean;
} {
  const configured = configuredResourceCount(resources) > 0;
  const hotline = resources.hotline.trim();
  const campusLink = resources.campusLink.trim();

  if (hotline && !hotlineHrefFor(hotline)) {
    return {
      status: "invalid",
      label: "热线格式无效",
      detail: "请在设置中填写可拨打的号码，系统不会为无效号码生成拨号入口。",
      configured
    };
  }

  if (campusLink && !externalHrefFor(campusLink)) {
    return {
      status: "invalid",
      label: "链接无效",
      detail: "校内支持链接只接受 http 或 https 地址，请先核对链接。",
      configured
    };
  }

  if (!configured) {
    return {
      status: "unverified",
      label: "尚未核验",
      detail: "还没有配置你确认过的热线、校内支持或可信任联系人。",
      configured: false
    };
  }

  if (resources.resourceVerificationStatus === "invalid") {
    return {
      status: "invalid",
      label: "已标记为失效",
      detail: "你之前标记这个资源已经失效，请更新资源后重新核验。",
      configured
    };
  }

  if (resources.resourceVerificationStatus === "unverified") {
    return {
      status: "unverified",
      label: "尚未核验",
      detail: "资源已配置，但还没有得到你最近一次的可用性确认。",
      configured
    };
  }

  const verifiedAt = resources.resourceVerifiedAt.trim();
  const age = verifiedAt ? daysSince(verifiedAt) : null;
  if (age === null) {
    return {
      status: "unverified",
      label: "尚未核验",
      detail: "请先核对地区、服务时间和链接，再确认资源可用。",
      configured
    };
  }

  if (age > RESOURCE_VERIFY_WINDOW_DAYS || resources.resourceVerificationStatus === "stale") {
    return {
      status: "stale",
      label: "较久未核验",
      detail: `最近核验：${verifiedAt}。超过 ${RESOURCE_VERIFY_WINDOW_DAYS} 天，建议再次确认。`,
      configured
    };
  }

  return {
    status: "verified",
    label: "已核验",
    detail: `最近核验：${verifiedAt}`,
    configured
  };
}

export function supportFallbackFor(resources: HelpResources): SupportFallback {
  const verification = resourceVerificationFor(resources);
  const hasDirectResource = verification.status === "verified" && Boolean(
    hotlineHrefFor(resources.hotline) || externalHrefFor(resources.campusLink) || resources.trustedContact.trim()
  );

  return {
    id: "offline-support-fallback",
    title: hasDirectResource ? "没有网络时也可以继续求助" : "暂时没有可核验资源时，先做这三件事",
    detail: hasDirectResource
      ? "已核验资源可能暂时无法打开；以下步骤不依赖网络，也不会自动联系任何人。"
      : "系统不会编造热线或学校链接。先把你交给一个真实的人，再使用当地可用的急救或校内支持入口。",
    steps: [
      "把下面生成的第一句话告诉身边的成年人、朋友、老师或家人。",
      "前往最近的急诊、校医、保安、值班点或其他能当面提供帮助的地方。",
      "如果你正处于立即危险中，使用你所在地区的急救号码，或请身边的人替你拨打。"
    ],
    primaryLabel: "生成给身边人的第一句话"
  };
}

export { RESOURCE_VERIFY_WINDOW_DAYS };
