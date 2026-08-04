import { describe, expect, it } from "vitest";
import {
  DEMO_CAMPUS_RESOURCE_PACK,
  RESOURCE_PACK_CACHE_KEY,
  invalidateSupportResource,
  rankSupportResources,
  readCachedResourcePack,
  resourcePackForHelpResources,
  resourcePackExpired,
  reviewDueAtFor,
  verifySupportResource,
  validateResourcePack,
  writeCachedResourcePack
} from "../src/domain/resource-pack";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    setItem(key: string, value: string) { values.set(key, value); },
    getItem(key: string) { return values.get(key) ?? null; }
  };
}

describe("resource pack contracts", () => {
  it("validates the demo-campus seed and keeps a manual verification owner", () => {
    const result = validateResourcePack(DEMO_CAMPUS_RESOURCE_PACK);
    expect(result.valid).toBe(true);
    expect(DEMO_CAMPUS_RESOURCE_PACK.verificationOwner).toBe("campus-resource-owner");
    expect(DEMO_CAMPUS_RESOURCE_PACK.fallbackResourceIds).toContain("offline-support-fallback");
    expect(reviewDueAtFor("2026-08-04")).toBe("2026-11-02");
  });

  it("rejects an unvalidated verified endpoint", () => {
    const invalid = {
      ...DEMO_CAMPUS_RESOURCE_PACK,
      resources: DEMO_CAMPUS_RESOURCE_PACK.resources.map((resource) => resource.id === "demo-campus-support"
        ? { ...resource, verificationStatus: "verified" as const, href: "javascript:alert(1)" }
        : resource)
    };
    const result = validateResourcePack(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("href"))).toBe(true);
  });

  it("ranks usable verified resources ahead of stale or unverified resources", () => {
    const ranked = rankSupportResources(DEMO_CAMPUS_RESOURCE_PACK.resources, { region: "demo-only", campus: "demo-campus" });
    expect(ranked[0].resource.id).toBe("offline-support-fallback");
    expect(ranked[0].usable).toBe(true);
    expect(ranked[1].usable).toBe(false);
  });

  it("caches only valid unexpired packs", () => {
    const storage = memoryStorage();
    writeCachedResourcePack(storage, DEMO_CAMPUS_RESOURCE_PACK);
    expect(storage.getItem(RESOURCE_PACK_CACHE_KEY)).toBeTruthy();
    expect(readCachedResourcePack(storage, new Date("2026-08-05T00:00:00Z").getTime())?.packId).toBe(DEMO_CAMPUS_RESOURCE_PACK.packId);
    expect(resourcePackExpired(DEMO_CAMPUS_RESOURCE_PACK, new Date("2026-12-01T00:00:00Z").getTime())).toBe(true);
    expect(readCachedResourcePack(storage, new Date("2026-12-01T00:00:00Z").getTime())).toBeNull();
  });

  it("derives a local cacheable pack from configured resources without inventing endpoints", () => {
    const pack = resourcePackForHelpResources({
      hotline: "12356",
      hotlineHours: "always",
      resourceRegion: "demo-only",
      campusName: "demo-campus",
      counselingCenter: "Campus support",
      counselor: "",
      campusLink: "https://example.edu/support",
      campusHours: "weekday",
      resourceVerifiedAt: "2026-08-04",
      resourceVerificationStatus: "verified",
      resourceVerificationActionAt: "2026-08-04T00:00:00.000Z",
      trustedContact: "friend"
    }, new Date("2026-08-04T00:00:00.000Z"));
    expect(validateResourcePack(pack).valid).toBe(true);
    expect(pack.resources.map((resource) => resource.id)).toContain("configured-hotline");
    expect(pack.resources.map((resource) => resource.id)).toContain("offline-support-fallback");
  });

  it("keeps invalidation behind the resource-admin boundary", () => {
    expect(() => invalidateSupportResource(DEMO_CAMPUS_RESOURCE_PACK, "demo-campus-support", "link failed", { role: "resource-admin", actorId: "owner-1" })).not.toThrow();
    expect(() => invalidateSupportResource(DEMO_CAMPUS_RESOURCE_PACK, "demo-campus-support", "link failed", { role: "resource-admin", actorId: "" })).toThrow("RESOURCE_ADMIN_REQUIRED");
    expect(() => invalidateSupportResource(DEMO_CAMPUS_RESOURCE_PACK, "missing", "link failed", { role: "resource-admin", actorId: "owner-1" })).toThrow("RESOURCE_NOT_FOUND");
  });

  it("requires a valid endpoint before a local admin can verify a resource", () => {
    expect(() => verifySupportResource(DEMO_CAMPUS_RESOURCE_PACK, "demo-campus-support", { role: "resource-admin", actorId: "owner-1" })).toThrow("RESOURCE_ENDPOINT_INVALID");
    const configured = resourcePackForHelpResources({
      hotline: "12356", hotlineHours: "always", resourceRegion: "demo-only", campusName: "demo-campus", counselingCenter: "", counselor: "", campusLink: "", campusHours: "", resourceVerifiedAt: "", resourceVerificationStatus: "unverified", resourceVerificationActionAt: "", trustedContact: ""
    }, new Date("2026-08-04T00:00:00.000Z"));
    const verified = verifySupportResource(configured, "configured-hotline", { role: "resource-admin", actorId: "owner-1" }, "2026-08-04T00:00:00.000Z");
    expect(verified.resources.find((resource) => resource.id === "configured-hotline")?.verificationStatus).toBe("verified");
  });
});
