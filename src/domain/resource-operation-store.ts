import {
  RESOURCE_OPERATION_RETENTION_DAYS,
  retainResourceOperations,
  type ResourceOperationEvent,
  type ResourceOperationKind,
  validateResourceOperationEvent
} from "./resource-operations";

export const RESOURCE_OPERATION_CACHE_KEY = "mindpulse:resourceOperations";
export const LOCAL_RESOURCE_OPERATION_TENANT = "local-resource-review";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function operationId() {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `resource-operation-${Date.now()}-${random}`;
}

export function readResourceOperations(storage: Pick<StorageLike, "getItem">, now = Date.now()) {
  try {
    const parsed = JSON.parse(storage.getItem(RESOURCE_OPERATION_CACHE_KEY) || "[]");
    return retainResourceOperations(Array.isArray(parsed) ? parsed : [], now);
  } catch {
    return [];
  }
}

export function appendResourceOperation(
  storage: Pick<StorageLike, "getItem" | "setItem">,
  input: Pick<ResourceOperationEvent, "tenantId" | "resourceId" | "kind">,
  now = new Date()
) {
  const event: ResourceOperationEvent = {
    id: operationId(),
    tenantId: input.tenantId,
    resourceId: input.resourceId,
    kind: input.kind as ResourceOperationKind,
    createdAt: now.toISOString()
  };
  if (!validateResourceOperationEvent(event)) throw new Error("RESOURCE_OPERATION_INVALID");
  const next = retainResourceOperations([...readResourceOperations(storage, now.getTime()), event], now.getTime(), RESOURCE_OPERATION_RETENTION_DAYS);
  storage.setItem(RESOURCE_OPERATION_CACHE_KEY, JSON.stringify(next));
  return event;
}

export function clearResourceOperations(storage: Pick<StorageLike, "removeItem">) {
  storage.removeItem(RESOURCE_OPERATION_CACHE_KEY);
}
