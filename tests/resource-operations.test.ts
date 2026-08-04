import { describe, expect, it } from "vitest";
import { retainResourceOperations, summarizeResourceHealth, validateResourceOperationEvent } from "../src/domain/resource-operations";
import { appendResourceOperation, clearResourceOperations, readResourceOperations, RESOURCE_OPERATION_CACHE_KEY } from "../src/domain/resource-operation-store";

describe("privacy-preserving resource operations", () => {
  it("rejects student identifiers, notes, and risk fields at the operation boundary", () => {
    expect(validateResourceOperationEvent({ id: "e1", tenantId: "campus-a", resourceId: "resource-a", kind: "link-opened", createdAt: "2026-08-04T00:00:00.000Z" })).toBe(true);
    expect(validateResourceOperationEvent({ id: "e2", tenantId: "campus-a", resourceId: "resource-a", kind: "link-opened", createdAt: "2026-08-04T00:00:00.000Z", vaultId: "vault_private" })).toBe(false);
    expect(validateResourceOperationEvent({ id: "e3", tenantId: "campus-a", resourceId: "resource-a", kind: "link-opened", createdAt: "2026-08-04T00:00:00.000Z", note: "raw note" })).toBe(false);
    expect(validateResourceOperationEvent({ id: "e4", tenantId: "campus-a", resourceId: "resource-a", kind: "link-opened", createdAt: "2026-08-04T00:00:00.000Z", extra: "not allowed" })).toBe(false);
  });

  it("persists only retained operation metadata outside the student vault", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) || null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    };
    appendResourceOperation(storage, { tenantId: "local-resource-review", resourceId: "support", kind: "copy-requested" }, new Date("2026-08-04T00:00:00.000Z"));
    const stored = readResourceOperations(storage, Date.parse("2026-08-04T00:00:00.000Z"));
    expect(stored).toHaveLength(1);
    expect(Object.keys(stored[0]).sort()).toEqual(["createdAt", "id", "kind", "resourceId", "tenantId"]);
    clearResourceOperations(storage);
    expect(storage.getItem(RESOURCE_OPERATION_CACHE_KEY)).toBeNull();
  });

  it("isolates tenants and suppresses health counts below the minimum sample", () => {
    const events = [
      ...Array.from({ length: 4 }, (_, index) => ({ id: `a-${index}`, tenantId: "campus-a", resourceId: "support", kind: "link-opened" as const, createdAt: "2026-08-04T00:00:00.000Z" })),
      ...Array.from({ length: 5 }, (_, index) => ({ id: `b-${index}`, tenantId: "campus-b", resourceId: "support", kind: "copy-requested" as const, createdAt: "2026-08-04T00:00:00.000Z" }))
    ];
    const a = summarizeResourceHealth(events, "campus-a");
    const b = summarizeResourceHealth(events, "campus-b");
    expect(a[0]).toMatchObject({ resourceId: "support", sampleCount: 4, meetsMinimumSample: false, counts: null });
    expect(b[0]).toMatchObject({ resourceId: "support", sampleCount: 5, meetsMinimumSample: true, counts: { "copy-requested": 5 } });
  });

  it("removes expired operation metadata under the retention policy", () => {
    const kept = retainResourceOperations([
      { id: "old", tenantId: "campus-a", resourceId: "support", kind: "published", createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "new", tenantId: "campus-a", resourceId: "support", kind: "verified", createdAt: "2026-08-01T00:00:00.000Z" }
    ], Date.parse("2026-08-04T00:00:00.000Z"));
    expect(kept.map((event) => event.id)).toEqual(["new"]);
  });
});
