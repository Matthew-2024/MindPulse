import { describe, expect, it } from "vitest";
import {
  MAX_ENCRYPTED_VAULT_ITEMS,
  MemoryOpaqueVaultTransport,
  createContinuityManifest,
  decryptVaultPayload,
  deleteEncryptedVault,
  encryptVaultPayload,
  logoutContinuity,
  revokeDeviceSession,
  syncEncryptedVault,
  unwrapDataKeyWithPasskeySecret,
  unwrapDataKeyWithRecoveryCode,
  validateOpaqueSnapshot,
  wrapDataKeyWithPasskeySecret
} from "../src/domain/encrypted-continuity";
import {
  CONTINUITY_MANIFEST_CACHE_KEY,
  deleteEncryptedVaultAndClearMetadata,
  readContinuityManifestMetadata,
  revokeLocalContinuityAndClearMetadata,
  validateContinuityManifestMetadata,
  writeContinuityManifestMetadata
} from "../src/domain/continuity-manifest-store";

const recoveryCode = "winter-lantern-forest-2026";
const payload = { records: [{ id: "r-1", note: "private note must never reach the server" }], safetyHold: null };

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key)
  };
}

describe("encrypted continuity", () => {
  it("recovers the same opaque vault on a second device without plaintext server data", async () => {
    const transport = new MemoryOpaqueVaultTransport();
    const first = await createContinuityManifest(recoveryCode, { deviceId: "device_first", vaultLocator: "sync_fixture", now: "2026-08-04T00:00:00.000Z" });
    const uploaded = await syncEncryptedVault({ transport, manifest: first.manifest, dataKey: first.dataKey, payload, itemCount: 1, now: "2026-08-04T00:01:00.000Z" });
    expect(uploaded.status).toBe("written");
    if (uploaded.status !== "written") return;
    const remote = await transport.discover(first.manifest.vaultLocator);
    expect(remote).toBeTruthy();
    expect(JSON.stringify(remote)).not.toContain("private note");
    expect(Object.keys(remote || {})).not.toContain("records");
    const secondDeviceKey = await unwrapDataKeyWithRecoveryCode(first.manifest.recoveryWrapper, recoveryCode);
    await expect(decryptVaultPayload<typeof payload>(remote!, secondDeviceKey)).resolves.toEqual(payload);
  });

  it("rejects stale conditional writes rather than silently losing a device's changes", async () => {
    const transport = new MemoryOpaqueVaultTransport();
    const first = await createContinuityManifest(recoveryCode, { deviceId: "device_first", vaultLocator: "sync_conflict" });
    const secondKey = await unwrapDataKeyWithRecoveryCode(first.manifest.recoveryWrapper, recoveryCode);
    const firstWrite = await syncEncryptedVault({ transport, manifest: first.manifest, dataKey: first.dataKey, payload: { value: "first" }, itemCount: 1 });
    expect(firstWrite.status).toBe("written");
    const staleSecond = await syncEncryptedVault({ transport, manifest: { ...first.manifest, deviceId: "device_second" }, dataKey: secondKey, payload: { value: "second" }, itemCount: 1 });
    expect(staleSecond.status).toBe("conflict");
    if (staleSecond.status === "conflict") expect(decryptVaultPayload<{ value: string }>(staleSecond.remote!, secondKey)).resolves.toEqual({ value: "first" });
  });

  it("uses recovery and passkey-derived wrappers without retaining a raw key in the manifest", async () => {
    const first = await createContinuityManifest(recoveryCode, { deviceId: "device_key" });
    expect(JSON.stringify(first.manifest)).not.toContain(Array.from(first.dataKey).join(","));
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const wrapper = await wrapDataKeyWithPasskeySecret(first.dataKey, "credential-fixture", secret);
    await expect(unwrapDataKeyWithPasskeySecret(wrapper, secret)).resolves.toEqual(first.dataKey);
  });

  it("enforces ciphertext bounds, revokes sessions, logs out locally, and produces a hard-delete receipt", async () => {
    const transport = new MemoryOpaqueVaultTransport();
    const first = await createContinuityManifest(recoveryCode, { deviceId: "device_delete", vaultLocator: "sync_delete" });
    await expect(encryptVaultPayload({ payload, itemCount: MAX_ENCRYPTED_VAULT_ITEMS + 1, dataKey: first.dataKey, vaultLocator: first.manifest.vaultLocator, revision: 1, deviceId: first.manifest.deviceId })).rejects.toThrow("CONTINUITY_ITEM_LIMIT_EXCEEDED");
    const written = await syncEncryptedVault({ transport, manifest: first.manifest, dataKey: first.dataKey, payload, itemCount: 1 });
    if (written.status !== "written") throw new Error("expected write");
    const sessionAdded = { ...written.manifest, sessions: [...written.manifest.sessions, { deviceId: "device_old", createdAt: "2026-08-04T00:00:00.000Z", lastSeenAt: "2026-08-04T00:00:00.000Z", status: "active" as const }] };
    expect(revokeDeviceSession(sessionAdded, "device_old").sessions.find((session) => session.deviceId === "device_old")?.status).toBe("revoked");
    expect(logoutContinuity(sessionAdded).sessions.find((session) => session.deviceId === "device_delete")?.status).toBe("logged-out");
    const receipt = await deleteEncryptedVault(transport, written.manifest);
    expect(receipt.kind).toBe("hard-delete");
    expect(await transport.discover(first.manifest.vaultLocator)).toBeNull();
  });

  it("accepts only the bounded ciphertext envelope at the opaque storage boundary", async () => {
    expect(validateOpaqueSnapshot({ vaultLocator: "sync_fixture", records: payload.records })).toBe(false);
  });

  it("persists only strict manifest metadata and advances its stored revision", async () => {
    const storage = memoryStorage();
    const first = await createContinuityManifest(recoveryCode, { deviceId: "device_metadata", vaultLocator: "sync_metadata", now: "2026-08-04T00:00:00.000Z" });
    const initial = writeContinuityManifestMetadata(storage, first.manifest, "2026-08-04T00:01:00.000Z");
    expect(initial).toMatchObject({ vaultLocator: "sync_metadata", revision: 0, wrapperKinds: ["recovery-code"] });
    expect(Object.keys(initial).sort()).toEqual(["deviceId", "enabledAt", "revision", "schemaVersion", "updatedAt", "vaultLocator", "wrapperKinds"]);
    expect(storage.getItem(CONTINUITY_MANIFEST_CACHE_KEY)).not.toContain("winter-lantern");
    expect(storage.getItem(CONTINUITY_MANIFEST_CACHE_KEY)).not.toContain("ciphertext");
    expect(storage.getItem(CONTINUITY_MANIFEST_CACHE_KEY)).not.toContain("records");

    const transport = new MemoryOpaqueVaultTransport();
    const written = await syncEncryptedVault({ transport, manifest: first.manifest, dataKey: first.dataKey, payload, itemCount: 1, now: "2026-08-04T00:02:00.000Z" });
    if (written.status !== "written") throw new Error("expected write");
    writeContinuityManifestMetadata(storage, written.manifest, "2026-08-04T00:02:00.000Z");
    expect(readContinuityManifestMetadata(storage)).toMatchObject({ revision: 1, updatedAt: "2026-08-04T00:02:00.000Z" });
    expect(validateContinuityManifestMetadata({ ...initial, note: "must reject unknown fields" })).toBe(false);
    expect(validateContinuityManifestMetadata({ ...initial, recoveryCode })).toBe(false);
  });

  it("clears local manifest metadata after local revocation and confirmed hard deletion", async () => {
    const storage = memoryStorage();
    const transport = new MemoryOpaqueVaultTransport();
    const first = await createContinuityManifest(recoveryCode, { deviceId: "device_metadata_delete", vaultLocator: "sync_metadata_delete" });
    writeContinuityManifestMetadata(storage, first.manifest);
    const revoked = revokeLocalContinuityAndClearMetadata(storage, first.manifest, "2026-08-04T00:03:00.000Z");
    expect(revoked.sessions[0]).toMatchObject({ status: "revoked", revokedAt: "2026-08-04T00:03:00.000Z" });
    expect(storage.getItem(CONTINUITY_MANIFEST_CACHE_KEY)).toBeNull();

    const written = await syncEncryptedVault({ transport, manifest: first.manifest, dataKey: first.dataKey, payload, itemCount: 1 });
    if (written.status !== "written") throw new Error("expected write");
    writeContinuityManifestMetadata(storage, written.manifest);
    await expect(deleteEncryptedVaultAndClearMetadata(transport, storage, written.manifest)).resolves.toMatchObject({ kind: "hard-delete" });
    expect(storage.getItem(CONTINUITY_MANIFEST_CACHE_KEY)).toBeNull();
  });
});
