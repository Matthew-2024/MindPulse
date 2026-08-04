import {
  CONTINUITY_SCHEMA_VERSION,
  deleteEncryptedVault,
  revokeDeviceSession,
  type ContinuityManifest,
  type DeletionReceipt,
  type OpaqueVaultTransport
} from "./encrypted-continuity";

export const CONTINUITY_MANIFEST_CACHE_KEY = "mindpulse:continuityManifest";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface ContinuityManifestMetadata {
  schemaVersion: number;
  vaultLocator: string;
  deviceId: string;
  revision: number;
  enabledAt: string;
  updatedAt: string;
  wrapperKinds: Array<"recovery-code" | "passkey-prf">;
}

const metadataKeys = new Set(["schemaVersion", "vaultLocator", "deviceId", "revision", "enabledAt", "updatedAt", "wrapperKinds"]);

function validTimestamp(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function validateContinuityManifestMetadata(value: unknown): value is ContinuityManifestMetadata {
  if (!value || typeof value !== "object") return false;
  const metadata = value as Record<string, unknown>;
  if (Object.keys(metadata).some((key) => !metadataKeys.has(key))) return false;
  const wrapperKinds = metadata.wrapperKinds;
  return metadata.schemaVersion === CONTINUITY_SCHEMA_VERSION
    && typeof metadata.vaultLocator === "string" && metadata.vaultLocator.startsWith("sync_")
    && typeof metadata.deviceId === "string" && metadata.deviceId.startsWith("device_")
    && Number.isInteger(metadata.revision) && Number(metadata.revision) >= 0
    && validTimestamp(metadata.enabledAt)
    && validTimestamp(metadata.updatedAt)
    && Array.isArray(wrapperKinds)
    && wrapperKinds.length > 0
    && wrapperKinds.length === new Set(wrapperKinds).size
    && wrapperKinds.every((kind) => kind === "recovery-code" || kind === "passkey-prf");
}

export function continuityManifestMetadata(manifest: ContinuityManifest, updatedAt = new Date().toISOString()): ContinuityManifestMetadata {
  const wrapperKinds = Array.from(new Set([
    manifest.recoveryWrapper.kind,
    ...manifest.passkeyWrappers.map((wrapper) => wrapper.kind)
  ])) as ContinuityManifestMetadata["wrapperKinds"];
  const metadata: ContinuityManifestMetadata = {
    schemaVersion: manifest.schemaVersion,
    vaultLocator: manifest.vaultLocator,
    deviceId: manifest.deviceId,
    revision: manifest.revision,
    enabledAt: manifest.enabledAt,
    updatedAt,
    wrapperKinds
  };
  if (!validateContinuityManifestMetadata(metadata)) throw new Error("CONTINUITY_MANIFEST_METADATA_INVALID");
  return metadata;
}

export function readContinuityManifestMetadata(storage: Pick<StorageLike, "getItem">) {
  try {
    const parsed = JSON.parse(storage.getItem(CONTINUITY_MANIFEST_CACHE_KEY) || "null");
    return validateContinuityManifestMetadata(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeContinuityManifestMetadata(
  storage: Pick<StorageLike, "setItem">,
  manifest: ContinuityManifest,
  updatedAt = new Date().toISOString()
) {
  const metadata = continuityManifestMetadata(manifest, updatedAt);
  storage.setItem(CONTINUITY_MANIFEST_CACHE_KEY, JSON.stringify(metadata));
  return metadata;
}

export function clearContinuityManifestMetadata(storage: Pick<StorageLike, "removeItem">) {
  storage.removeItem(CONTINUITY_MANIFEST_CACHE_KEY);
}

export function revokeLocalContinuityAndClearMetadata(
  storage: Pick<StorageLike, "removeItem">,
  manifest: ContinuityManifest,
  at = new Date().toISOString()
) {
  const revoked = revokeDeviceSession(manifest, manifest.deviceId, at);
  clearContinuityManifestMetadata(storage);
  return revoked;
}

export async function deleteEncryptedVaultAndClearMetadata(
  transport: OpaqueVaultTransport,
  storage: Pick<StorageLike, "removeItem">,
  manifest: ContinuityManifest
): Promise<DeletionReceipt> {
  const receipt = await deleteEncryptedVault(transport, manifest);
  clearContinuityManifestMetadata(storage);
  return receipt;
}
