import type {
  TrustedCircleCheckback,
  TrustedCircleCheckbackStatus,
  TrustedCircleInvitation,
  TrustedCircleInvitationStatus,
  TrustedCircleScope
} from "./types";

export const TRUSTED_CIRCLE_MAX_ACTIVE_INVITATIONS = 8;
export const TRUSTED_CIRCLE_MAX_DAYS = 30;

const scopes = new Set<TrustedCircleScope>(["check-in", "practical", "company"]);
const checkbackStatuses = new Set<TrustedCircleCheckbackStatus>(["planned", "completed", "skipped"]);

function timestamp(value: string, error: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(error);
  return parsed;
}

function identifier(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function invitationStatus(invitation: TrustedCircleInvitation, now = Date.now()): TrustedCircleInvitationStatus {
  if (invitation.status === "revoked") return "revoked";
  return timestamp(invitation.expiresAt, "TRUSTED_CIRCLE_EXPIRY_INVALID") <= now ? "expired" : "active";
}

export function createTrustedCircleInvitation(input: {
  recipientLabel: string;
  scope: TrustedCircleScope;
  expiresAt: string;
  consent: boolean;
  existing?: TrustedCircleInvitation[];
  now?: string;
}): TrustedCircleInvitation {
  const recipientLabel = String(input.recipientLabel || "").trim().slice(0, 80);
  if (!recipientLabel) throw new Error("TRUSTED_CIRCLE_RECIPIENT_REQUIRED");
  if (!scopes.has(input.scope)) throw new Error("TRUSTED_CIRCLE_SCOPE_INVALID");
  if (input.consent !== true) throw new Error("TRUSTED_CIRCLE_CONSENT_REQUIRED");
  const now = input.now || new Date().toISOString();
  const nowMs = timestamp(now, "TRUSTED_CIRCLE_NOW_INVALID");
  const expiryMs = timestamp(input.expiresAt, "TRUSTED_CIRCLE_EXPIRY_INVALID");
  if (expiryMs <= nowMs) throw new Error("TRUSTED_CIRCLE_EXPIRY_REQUIRED");
  if (expiryMs > nowMs + TRUSTED_CIRCLE_MAX_DAYS * 24 * 60 * 60 * 1000) throw new Error("TRUSTED_CIRCLE_EXPIRY_TOO_FAR");
  const active = (input.existing || []).filter((item) => invitationStatus(item, nowMs) === "active");
  if (active.length >= TRUSTED_CIRCLE_MAX_ACTIVE_INVITATIONS) throw new Error("TRUSTED_CIRCLE_ACTIVE_LIMIT");
  return {
    id: identifier("circle"),
    recipientLabel,
    scope: input.scope,
    createdAt: now,
    expiresAt: new Date(expiryMs).toISOString(),
    status: "active",
    noContactImport: true
  };
}

export function revokeTrustedCircleInvitation(invitations: TrustedCircleInvitation[], invitationId: string, at = new Date().toISOString()) {
  let found = false;
  const next = invitations.map((invitation) => {
    if (invitation.id !== invitationId) return invitation;
    found = true;
    if (invitationStatus(invitation, Date.parse(at)) !== "active") throw new Error("TRUSTED_CIRCLE_INVITATION_INACTIVE");
    return { ...invitation, status: "revoked" as const, revokedAt: at };
  });
  if (!found) throw new Error("TRUSTED_CIRCLE_INVITATION_NOT_FOUND");
  return next;
}

export function createTrustedCircleCheckback(input: {
  invitation: TrustedCircleInvitation;
  dueAt: string;
  now?: string;
}): TrustedCircleCheckback {
  const now = input.now || new Date().toISOString();
  const nowMs = timestamp(now, "TRUSTED_CIRCLE_NOW_INVALID");
  const dueAtMs = timestamp(input.dueAt, "TRUSTED_CIRCLE_CHECKBACK_INVALID");
  const expiryMs = timestamp(input.invitation.expiresAt, "TRUSTED_CIRCLE_EXPIRY_INVALID");
  if (invitationStatus(input.invitation, nowMs) !== "active") throw new Error("TRUSTED_CIRCLE_INVITATION_INACTIVE");
  if (dueAtMs < nowMs || dueAtMs > expiryMs) throw new Error("TRUSTED_CIRCLE_CHECKBACK_OUT_OF_RANGE");
  return { id: identifier("checkback"), invitationId: input.invitation.id, dueAt: new Date(dueAtMs).toISOString(), createdAt: now, updatedAt: now, status: "planned" };
}

export function updateTrustedCircleCheckback(checkbacks: TrustedCircleCheckback[], checkbackId: string, status: TrustedCircleCheckbackStatus, at = new Date().toISOString()) {
  if (!checkbackStatuses.has(status)) throw new Error("TRUSTED_CIRCLE_CHECKBACK_STATUS_INVALID");
  let found = false;
  const next = checkbacks.map((checkback) => {
    if (checkback.id !== checkbackId) return checkback;
    found = true;
    if (checkback.status !== "planned") throw new Error("TRUSTED_CIRCLE_CHECKBACK_ALREADY_RESOLVED");
    return { ...checkback, status, updatedAt: at };
  });
  if (!found) throw new Error("TRUSTED_CIRCLE_CHECKBACK_NOT_FOUND");
  return next;
}

export function trustedCircleDraft(invitation: TrustedCircleInvitation) {
  const scope = invitation.scope === "check-in"
    ? "想请你在约定的时间问我一句近况"
    : invitation.scope === "practical"
      ? "可能需要你陪我做一件具体的小事"
      : "想请你在我需要时陪我待一会儿";
  return `你好，${invitation.recipientLabel}。我想邀请你成为我的一个短期支持联系人：${scope}。这个邀请会在 ${new Date(invitation.expiresAt).toLocaleString("zh-CN")} 失效。你可以拒绝，也可以告诉我你方便的方式。`;
}

export function normalizeTrustedCircleInvitations(value: unknown, now = Date.now()): TrustedCircleInvitation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): TrustedCircleInvitation[] => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<TrustedCircleInvitation>;
    if (!candidate.id || !candidate.recipientLabel || !scopes.has(candidate.scope as TrustedCircleScope) || !candidate.expiresAt) return [];
    const status = candidate.status === "revoked" ? "revoked" : invitationStatus({ ...candidate, status: "active", noContactImport: true } as TrustedCircleInvitation, now);
    return [{
      id: String(candidate.id), recipientLabel: String(candidate.recipientLabel).slice(0, 80), scope: candidate.scope as TrustedCircleScope,
      createdAt: String(candidate.createdAt || new Date(now).toISOString()), expiresAt: String(candidate.expiresAt), status,
      noContactImport: true, ...(status === "revoked" && candidate.revokedAt ? { revokedAt: String(candidate.revokedAt) } : {})
    }];
  });
}

export function normalizeTrustedCircleCheckbacks(value: unknown, invitations: TrustedCircleInvitation[]): TrustedCircleCheckback[] {
  if (!Array.isArray(value)) return [];
  const validInvitations = new Set(invitations.map((invitation) => invitation.id));
  return value.flatMap((item): TrustedCircleCheckback[] => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<TrustedCircleCheckback>;
    if (!candidate.id || !candidate.invitationId || !validInvitations.has(candidate.invitationId) || !candidate.dueAt || !checkbackStatuses.has(candidate.status as TrustedCircleCheckbackStatus)) return [];
    return [{ id: String(candidate.id), invitationId: String(candidate.invitationId), dueAt: String(candidate.dueAt), createdAt: String(candidate.createdAt || candidate.dueAt), updatedAt: String(candidate.updatedAt || candidate.createdAt || candidate.dueAt), status: candidate.status as TrustedCircleCheckbackStatus }];
  });
}
