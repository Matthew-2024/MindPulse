export const RESOURCE_OPERATION_RETENTION_DAYS = 90;
export const RESOURCE_HEALTH_MINIMUM_SAMPLE = 5;

export type ResourceOperationKind = "published" | "verified" | "invalidated" | "link-opened" | "copy-requested";

export interface ResourceOperationEvent {
  id: string;
  tenantId: string;
  resourceId: string;
  kind: ResourceOperationKind;
  createdAt: string;
}

const allowedKinds = new Set<ResourceOperationKind>(["published", "verified", "invalidated", "link-opened", "copy-requested"]);
const forbiddenFields = new Set(["vaultId", "userId", "recordId", "note", "risk", "riskCode", "history", "email", "phone"]);
const allowedFields = new Set(["id", "tenantId", "resourceId", "kind", "createdAt"]);

export function validateResourceOperationEvent(value: unknown): value is ResourceOperationEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const event = value as Record<string, unknown>;
  if (Object.keys(event).some((key) => forbiddenFields.has(key))) return false;
  if (Object.keys(event).some((key) => !allowedFields.has(key))) return false;
  return typeof event.id === "string" && Boolean(event.id)
    && typeof event.tenantId === "string" && Boolean(event.tenantId)
    && typeof event.resourceId === "string" && Boolean(event.resourceId)
    && typeof event.createdAt === "string" && Number.isFinite(Date.parse(event.createdAt))
    && allowedKinds.has(event.kind as ResourceOperationKind);
}

export function retainResourceOperations(events: unknown[], now = Date.now(), retentionDays = RESOURCE_OPERATION_RETENTION_DAYS) {
  const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;
  return events.filter(validateResourceOperationEvent).filter((event) => Date.parse(event.createdAt) >= cutoff);
}

export function summarizeResourceHealth(events: unknown[], tenantId: string, minimumSample = RESOURCE_HEALTH_MINIMUM_SAMPLE) {
  const scoped = events.filter(validateResourceOperationEvent).filter((event) => event.tenantId === tenantId);
  const byResource = new Map<string, ResourceOperationEvent[]>();
  scoped.forEach((event) => byResource.set(event.resourceId, [...(byResource.get(event.resourceId) || []), event]));
  return [...byResource.entries()].map(([resourceId, records]) => {
    const counts = Object.fromEntries([...allowedKinds].map((kind) => [kind, records.filter((event) => event.kind === kind).length]));
    const sampleCount = records.filter((event) => event.kind === "link-opened" || event.kind === "copy-requested").length;
    return {
      resourceId,
      sampleCount,
      meetsMinimumSample: sampleCount >= minimumSample,
      actionCount: records.length,
      counts: sampleCount >= minimumSample ? counts : null
    };
  }).sort((left, right) => left.resourceId.localeCompare(right.resourceId));
}
