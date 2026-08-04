import { externalHrefFor, hotlineHrefFor } from "./help-resources";
import { resourceVerificationFor } from "./help-resources";
import type { HelpResourceVerificationStatus, HelpResources } from "./types";

export const RESOURCE_PACK_SCHEMA_VERSION = 1;
export const RESOURCE_REVIEW_SLA_DAYS = 90;
export const RESOURCE_PACK_CACHE_KEY = "mindpulse:resourcePack";

export type SupportResourceKind = "hotline" | "campus" | "trusted-person" | "fallback";

export interface SupportResource {
  id: string;
  kind: SupportResourceKind;
  label: string;
  description: string;
  regionScope: string;
  campusScope: string;
  serviceHours: string;
  hotline: string;
  href: string;
  verificationStatus: HelpResourceVerificationStatus;
  verifiedAt: string;
  expiresAt: string | null;
  verificationOwner: string;
  fallback: boolean;
  invalidatedAt?: string;
  invalidationReason?: string;
}

export interface ResourcePack {
  schemaVersion: number;
  packId: string;
  version: string;
  publishedAt: string;
  expiresAt: string;
  regionScope: string;
  campusScope: string;
  verificationOwner: string;
  resources: SupportResource[];
  fallbackResourceIds: string[];
}

export interface DisclosureReceipt {
  type: "disclosure-receipt";
  schemaVersion: 1;
  resourcePackId: string;
  resourceId: string;
  resourceVersion: string;
  action: "preview" | "copy" | "open";
  includedFields: string[];
  excludedFields: string[];
  createdAt: string;
}

export interface ResourceAdminActor {
  role: "resource-admin";
  actorId: string;
}

export const DEMO_CAMPUS_RESOURCE_PACK: ResourcePack = {
  schemaVersion: RESOURCE_PACK_SCHEMA_VERSION,
  packId: "mindpulse-demo-campus-pack",
  version: "2026-08-04.1",
  publishedAt: "2026-08-04T00:00:00.000Z",
  expiresAt: "2026-11-02T00:00:00.000Z",
  regionScope: "demo-only",
  campusScope: "demo-campus",
  verificationOwner: "campus-resource-owner",
  fallbackResourceIds: ["offline-support-fallback"],
  resources: [
    {
      id: "offline-support-fallback",
      kind: "fallback",
      label: "Local offline support steps",
      description: "Tell a trusted person, go to a nearby staffed place, or use the local emergency number.",
      regionScope: "any",
      campusScope: "any",
      serviceHours: "always",
      hotline: "",
      href: "",
      verificationStatus: "verified",
      verifiedAt: "2026-08-04",
      expiresAt: null,
      verificationOwner: "mindpulse-safety-owner",
      fallback: true
    },
    {
      id: "demo-campus-support",
      kind: "campus",
      label: "Demo campus support",
      description: "Placeholder seed; never presented as a real service until manually verified.",
      regionScope: "demo-only",
      campusScope: "demo-campus",
      serviceHours: "not configured",
      hotline: "",
      href: "",
      verificationStatus: "unverified",
      verifiedAt: "",
      expiresAt: null,
      verificationOwner: "campus-resource-owner",
      fallback: false
    }
  ]
};

export function resourcePackForHelpResources(resources: HelpResources, now = new Date()): ResourcePack {
  const verification = resourceVerificationFor(resources);
  const publishedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + RESOURCE_REVIEW_SLA_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const status = verification.status;
  const regionScope = resources.resourceRegion.trim() || "local-device";
  const campusScope = resources.campusName.trim() || "local-device";
  const verificationOwner = "local-device-owner";
  const shared = {
    regionScope,
    campusScope,
    verificationStatus: status,
    verifiedAt: resources.resourceVerifiedAt.trim(),
    expiresAt: status === "verified" ? expiresAt : null,
    verificationOwner,
    fallback: false
  };
  const configured: SupportResource[] = [
    resources.hotline.trim() ? {
      id: "configured-hotline",
      kind: "hotline",
      label: "Configured hotline",
      description: resources.hotlineHours.trim() || "Hours not configured",
      serviceHours: resources.hotlineHours.trim() || "not configured",
      hotline: resources.hotline.trim(),
      href: "",
      ...shared
    } : null,
    resources.campusLink.trim() || resources.counselingCenter.trim() || resources.counselor.trim() ? {
      id: "configured-campus-support",
      kind: "campus",
      label: resources.counselingCenter.trim() || resources.counselor.trim() || "Configured campus support",
      description: resources.campusHours.trim() || "Hours not configured",
      serviceHours: resources.campusHours.trim() || "not configured",
      hotline: "",
      href: resources.campusLink.trim(),
      ...shared
    } : null,
    resources.trustedContact.trim() ? {
      id: "configured-trusted-person",
      kind: "trusted-person",
      label: "Configured trusted person",
      description: resources.trustedContact.trim(),
      serviceHours: "user-selected",
      hotline: "",
      href: "",
      ...shared
    } : null
  ].filter((resource): resource is SupportResource => Boolean(resource));

  return {
    schemaVersion: RESOURCE_PACK_SCHEMA_VERSION,
    packId: "mindpulse-local-resource-pack",
    version: `${resources.resourceVerificationActionAt.trim() || publishedAt}:local`,
    publishedAt,
    expiresAt,
    regionScope,
    campusScope,
    verificationOwner,
    fallbackResourceIds: ["offline-support-fallback"],
    resources: [
      ...configured,
      {
        id: "offline-support-fallback",
        kind: "fallback",
        label: "Local offline support steps",
        description: "Tell a trusted person, go to a nearby staffed place, or use the local emergency number.",
        regionScope: "any",
        campusScope: "any",
        serviceHours: "always",
        hotline: "",
        href: "",
        verificationStatus: "verified",
        verifiedAt: "2026-08-04",
        expiresAt: null,
        verificationOwner: "mindpulse-safety-owner",
        fallback: true
      }
    ]
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function nonEmpty(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function dateValue(value: unknown) {
  const parsed = new Date(String(value || "")).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateResourcePack(input: unknown): { valid: boolean; errors: string[]; pack: ResourcePack | null } {
  const errors: string[] = [];
  if (!isObject(input)) return { valid: false, errors: ["pack must be an object"], pack: null };
  if (input.schemaVersion !== RESOURCE_PACK_SCHEMA_VERSION) errors.push("unsupported schemaVersion");
  for (const key of ["packId", "version", "publishedAt", "expiresAt", "regionScope", "campusScope", "verificationOwner"]) {
    if (!nonEmpty(input[key])) errors.push(`${key} is required`);
  }
  const publishedAt = dateValue(input.publishedAt);
  const expiresAt = dateValue(input.expiresAt);
  if (publishedAt === null || expiresAt === null || expiresAt <= publishedAt) errors.push("pack dates are invalid");
  if (!Array.isArray(input.resources) || input.resources.length === 0) errors.push("resources must be non-empty");
  if (!Array.isArray(input.fallbackResourceIds)) errors.push("fallbackResourceIds must be an array");

  const resourceIds = new Set<string>();
  const resources = Array.isArray(input.resources) ? input.resources : [];
  resources.forEach((resource, index) => {
    if (!isObject(resource)) {
      errors.push(`resource ${index} must be an object`);
      return;
    }
    if (!nonEmpty(resource.id) || resourceIds.has(String(resource.id))) errors.push(`resource ${index} has a duplicate or missing id`);
    resourceIds.add(String(resource.id || ""));
    for (const key of ["kind", "label", "description", "regionScope", "campusScope", "serviceHours", "verificationOwner"]) {
      if (!nonEmpty(resource[key])) errors.push(`resource ${index}.${key} is required`);
    }
    if (!["hotline", "campus", "trusted-person", "fallback"].includes(String(resource.kind))) errors.push(`resource ${index}.kind is invalid`);
    if (!["verified", "stale", "unverified", "invalid"].includes(String(resource.verificationStatus))) errors.push(`resource ${index}.verificationStatus is invalid`);
    if (resource.expiresAt !== null && resource.expiresAt !== "" && dateValue(resource.expiresAt) === null) errors.push(`resource ${index}.expiresAt is invalid`);
    if (resource.kind === "hotline" && resource.verificationStatus === "verified" && !hotlineHrefFor(resource.hotline)) errors.push(`resource ${index}.hotline is invalid`);
    if (resource.kind === "campus" && resource.verificationStatus === "verified" && !externalHrefFor(resource.href)) errors.push(`resource ${index}.href is invalid`);
  });

  const fallbackIds = Array.isArray(input.fallbackResourceIds) ? input.fallbackResourceIds.map(String) : [];
  fallbackIds.forEach((id) => {
    if (!resourceIds.has(id)) errors.push(`fallback resource ${id} is missing`);
  });
  if (!fallbackIds.some((id) => resources.some((resource) => isObject(resource) && resource.id === id && resource.fallback === true))) {
    errors.push("at least one fallback resource is required");
  }

  return {
    valid: errors.length === 0,
    errors,
    pack: errors.length === 0 ? input as unknown as ResourcePack : null
  };
}

export function resourcePackExpired(pack: ResourcePack, now = Date.now()) {
  const expiresAt = dateValue(pack.expiresAt);
  return expiresAt !== null && expiresAt <= now;
}

export function reviewDueAtFor(verifiedAt: string, slaDays = RESOURCE_REVIEW_SLA_DAYS) {
  const start = dateValue(verifiedAt);
  if (start === null || !Number.isFinite(slaDays) || slaDays < 1) return null;
  return new Date(start + slaDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function resourceUsable(resource: SupportResource, now = Date.now()) {
  if (resource.verificationStatus !== "verified" || resource.invalidatedAt) return false;
  const expiresAt = resource.expiresAt ? dateValue(resource.expiresAt) : null;
  if (expiresAt !== null && expiresAt <= now) return false;
  if (resource.kind === "hotline") return Boolean(hotlineHrefFor(resource.hotline));
  if (resource.kind === "campus") return Boolean(externalHrefFor(resource.href));
  return resource.fallback || nonEmpty(resource.description);
}

export function rankSupportResources(resources: SupportResource[], context: { region?: string; campus?: string } = {}, now = Date.now()) {
  return resources
    .map((resource) => {
      const regionMatch = resource.regionScope === "any" || (context.region && resource.regionScope === context.region) ? 20 : 0;
      const campusMatch = resource.campusScope === "any" || (context.campus && resource.campusScope === context.campus) ? 30 : 0;
      const verificationScore = resourceUsable(resource, now) ? 100 : resource.verificationStatus === "stale" ? 10 : 0;
      return { resource, score: verificationScore + regionMatch + campusMatch, usable: resourceUsable(resource, now) };
    })
    .sort((left, right) => right.score - left.score || left.resource.id.localeCompare(right.resource.id));
}

export function writeCachedResourcePack(storage: Pick<Storage, "setItem">, pack: ResourcePack) {
  const validation = validateResourcePack(pack);
  if (!validation.valid) throw new Error(`RESOURCE_PACK_INVALID: ${validation.errors.join(", ")}`);
  storage.setItem(RESOURCE_PACK_CACHE_KEY, JSON.stringify(pack));
}

export function readCachedResourcePack(storage: Pick<Storage, "getItem">, now = Date.now()) {
  const raw = storage.getItem(RESOURCE_PACK_CACHE_KEY);
  if (!raw) return null;
  try {
    const validation = validateResourcePack(JSON.parse(raw));
    if (!validation.valid || !validation.pack || resourcePackExpired(validation.pack, now)) return null;
    return validation.pack;
  } catch {
    return null;
  }
}

export function invalidateSupportResource(pack: ResourcePack, resourceId: string, reason: string, actor: ResourceAdminActor, at = new Date().toISOString()) {
  if (actor.role !== "resource-admin" || !actor.actorId.trim()) throw new Error("RESOURCE_ADMIN_REQUIRED");
  if (!reason.trim()) throw new Error("RESOURCE_INVALIDATION_REASON_REQUIRED");
  if (!pack.resources.some((resource) => resource.id === resourceId)) throw new Error("RESOURCE_NOT_FOUND");
  return {
    ...pack,
    resources: pack.resources.map((resource) => resource.id === resourceId
      ? { ...resource, verificationStatus: "invalid" as const, invalidatedAt: at, invalidationReason: reason }
      : resource)
  };
}

export function verifySupportResource(pack: ResourcePack, resourceId: string, actor: ResourceAdminActor, at = new Date().toISOString()) {
  if (actor.role !== "resource-admin" || !actor.actorId.trim()) throw new Error("RESOURCE_ADMIN_REQUIRED");
  const resource = pack.resources.find((candidate) => candidate.id === resourceId);
  if (!resource) throw new Error("RESOURCE_NOT_FOUND");
  if (resource.kind === "hotline" && !hotlineHrefFor(resource.hotline)) throw new Error("RESOURCE_ENDPOINT_INVALID");
  if (resource.kind === "campus" && !externalHrefFor(resource.href)) throw new Error("RESOURCE_ENDPOINT_INVALID");
  if (resource.kind === "trusted-person" && !resource.description.trim()) throw new Error("RESOURCE_ENDPOINT_INVALID");
  return {
    ...pack,
    resources: pack.resources.map((candidate) => candidate.id === resourceId
      ? {
          ...candidate,
          verificationStatus: "verified" as const,
          verifiedAt: at.slice(0, 10),
          expiresAt: candidate.fallback ? null : new Date(new Date(at).getTime() + RESOURCE_REVIEW_SLA_DAYS * 24 * 60 * 60 * 1000).toISOString(),
          invalidatedAt: undefined,
          invalidationReason: undefined
        }
      : candidate)
  };
}

export function createDisclosureReceipt(input: Omit<DisclosureReceipt, "type" | "schemaVersion" | "createdAt"> & { createdAt?: string }): DisclosureReceipt {
  return {
    type: "disclosure-receipt",
    schemaVersion: 1,
    createdAt: input.createdAt || new Date().toISOString(),
    resourcePackId: input.resourcePackId,
    resourceId: input.resourceId,
    resourceVersion: input.resourceVersion,
    action: input.action,
    includedFields: Array.from(new Set(input.includedFields)),
    excludedFields: Array.from(new Set(input.excludedFields))
  };
}
