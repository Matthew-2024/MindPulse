export const CONTINUITY_SCHEMA_VERSION = 1;
export const MAX_ENCRYPTED_VAULT_BYTES = 256 * 1024;
export const MAX_ENCRYPTED_VAULT_ITEMS = 300;
export const RECOVERY_PBKDF2_ITERATIONS = 310_000;

type BrowserBytes = Uint8Array<ArrayBuffer>;

export type ContinuitySessionStatus = "active" | "revoked" | "logged-out";

export interface DeviceSession {
  deviceId: string;
  createdAt: string;
  lastSeenAt: string;
  status: ContinuitySessionStatus;
  revokedAt?: string;
}

export interface RecoveryKeyWrapper {
  kind: "recovery-code";
  salt: string;
  iv: string;
  iterations: number;
  ciphertext: string;
}

export interface PasskeyKeyWrapper {
  kind: "passkey-prf";
  credentialId: string;
  salt: string;
  iv: string;
  ciphertext: string;
}

export type KeyWrapper = RecoveryKeyWrapper | PasskeyKeyWrapper;

export interface ContinuityManifest {
  schemaVersion: number;
  vaultLocator: string;
  deviceId: string;
  revision: number;
  enabledAt: string;
  sessions: DeviceSession[];
  recoveryWrapper: RecoveryKeyWrapper;
  passkeyWrappers: PasskeyKeyWrapper[];
}

export interface EncryptedVaultSnapshot {
  schemaVersion: number;
  vaultLocator: string;
  revision: number;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  iv: string;
  ciphertext: string;
}

export interface DeletionReceipt {
  receiptId: string;
  vaultLocator: string;
  revision: number;
  deletedAt: string;
  kind: "hard-delete";
}

export type OpaqueWriteResult =
  | { status: "written"; snapshot: EncryptedVaultSnapshot }
  | { status: "conflict"; current: EncryptedVaultSnapshot | null };

export interface OpaqueVaultTransport {
  discover(vaultLocator: string): Promise<EncryptedVaultSnapshot | null>;
  write(snapshot: EncryptedVaultSnapshot, expectedRevision: number): Promise<OpaqueWriteResult>;
  hardDelete(vaultLocator: string, expectedRevision: number): Promise<DeletionReceipt | null>;
}

interface CryptoRuntime {
  getRandomValues<T extends ArrayBufferView<ArrayBuffer> | null>(array: T): T;
  subtle: SubtleCrypto;
}

function cryptoRuntime(): CryptoRuntime {
  if (!globalThis.crypto?.subtle) throw new Error("CONTINUITY_WEBCRYPTO_UNAVAILABLE");
  return globalThis.crypto as CryptoRuntime;
}

function toBase64(bytes: BrowserBytes) {
  let binary = "";
  bytes.forEach((value) => { binary += String.fromCharCode(value); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64(value: string): BrowserBytes {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function randomBytes(length: number): BrowserBytes {
  const bytes = new Uint8Array(length);
  cryptoRuntime().getRandomValues(bytes);
  return bytes;
}

function utf8(value: string): BrowserBytes {
  return new TextEncoder().encode(value);
}

function plaintextLimit(value: unknown) {
  const bytes = utf8(JSON.stringify(value)).byteLength;
  if (bytes > MAX_ENCRYPTED_VAULT_BYTES) throw new Error("CONTINUITY_PAYLOAD_TOO_LARGE");
}

function aad(snapshot: Pick<EncryptedVaultSnapshot, "schemaVersion" | "vaultLocator" | "revision" | "deviceId">) {
  return utf8(`${snapshot.schemaVersion}:${snapshot.vaultLocator}:${snapshot.revision}:${snapshot.deviceId}`);
}

function assertRevision(value: number) {
  if (!Number.isInteger(value) || value < 1) throw new Error("CONTINUITY_REVISION_INVALID");
}

export function createDeviceId() {
  return `device_${toBase64(randomBytes(18))}`;
}

export function createVaultLocator() {
  return `sync_${toBase64(randomBytes(24))}`;
}

export function createDeviceSession(deviceId = createDeviceId(), at = new Date().toISOString()): DeviceSession {
  return { deviceId, createdAt: at, lastSeenAt: at, status: "active" };
}

export async function createDataKey(): Promise<BrowserBytes> {
  const key = await cryptoRuntime().subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  return new Uint8Array(await cryptoRuntime().subtle.exportKey("raw", key));
}

export async function importDataKey(raw: BrowserBytes) {
  if (raw.byteLength !== 32) throw new Error("CONTINUITY_DATA_KEY_INVALID");
  return cryptoRuntime().subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function recoveryWrappingKey(recoveryCode: string, salt: BrowserBytes, iterations = RECOVERY_PBKDF2_ITERATIONS) {
  const normalized = String(recoveryCode || "").trim();
  if (normalized.length < 12) throw new Error("CONTINUITY_RECOVERY_CODE_TOO_SHORT");
  const base = await cryptoRuntime().subtle.importKey("raw", utf8(normalized), "PBKDF2", false, ["deriveKey"]);
  return cryptoRuntime().subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function passkeyWrappingKey(credentialSecret: BrowserBytes, salt: BrowserBytes) {
  if (credentialSecret.byteLength < 32) throw new Error("CONTINUITY_PASSKEY_SECRET_INVALID");
  const base = await cryptoRuntime().subtle.importKey("raw", credentialSecret, "HKDF", false, ["deriveKey"]);
  return cryptoRuntime().subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: utf8("mindpulse-continuity-passkey-prf-v1") },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function wrapDataKeyWithRecoveryCode(dataKey: BrowserBytes, recoveryCode: string): Promise<RecoveryKeyWrapper> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await recoveryWrappingKey(recoveryCode, salt);
  const ciphertext = await cryptoRuntime().subtle.encrypt({ name: "AES-GCM", iv }, key, dataKey);
  return { kind: "recovery-code", salt: toBase64(salt), iv: toBase64(iv), iterations: RECOVERY_PBKDF2_ITERATIONS, ciphertext: toBase64(new Uint8Array(ciphertext)) };
}

export async function unwrapDataKeyWithRecoveryCode(wrapper: RecoveryKeyWrapper, recoveryCode: string) {
  if (wrapper.kind !== "recovery-code" || wrapper.iterations !== RECOVERY_PBKDF2_ITERATIONS) throw new Error("CONTINUITY_RECOVERY_WRAPPER_INVALID");
  const key = await recoveryWrappingKey(recoveryCode, fromBase64(wrapper.salt), wrapper.iterations);
  try {
    return new Uint8Array(await cryptoRuntime().subtle.decrypt({ name: "AES-GCM", iv: fromBase64(wrapper.iv) }, key, fromBase64(wrapper.ciphertext)));
  } catch {
    throw new Error("CONTINUITY_RECOVERY_CODE_INVALID");
  }
}

export async function wrapDataKeyWithPasskeySecret(dataKey: BrowserBytes, credentialId: string, credentialSecret: BrowserBytes): Promise<PasskeyKeyWrapper> {
  if (!String(credentialId || "").trim()) throw new Error("CONTINUITY_PASSKEY_CREDENTIAL_REQUIRED");
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await passkeyWrappingKey(credentialSecret, salt);
  const ciphertext = await cryptoRuntime().subtle.encrypt({ name: "AES-GCM", iv }, key, dataKey);
  return { kind: "passkey-prf", credentialId, salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
}

export async function unwrapDataKeyWithPasskeySecret(wrapper: PasskeyKeyWrapper, credentialSecret: BrowserBytes) {
  if (wrapper.kind !== "passkey-prf" || !wrapper.credentialId) throw new Error("CONTINUITY_PASSKEY_WRAPPER_INVALID");
  const key = await passkeyWrappingKey(credentialSecret, fromBase64(wrapper.salt));
  try {
    return new Uint8Array(await cryptoRuntime().subtle.decrypt({ name: "AES-GCM", iv: fromBase64(wrapper.iv) }, key, fromBase64(wrapper.ciphertext)));
  } catch {
    throw new Error("CONTINUITY_PASSKEY_SECRET_INVALID");
  }
}

export function validateOpaqueSnapshot(value: unknown): value is EncryptedVaultSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Record<string, unknown>;
  const allowed = new Set(["schemaVersion", "vaultLocator", "revision", "deviceId", "createdAt", "updatedAt", "itemCount", "iv", "ciphertext"]);
  if (Object.keys(snapshot).some((key) => !allowed.has(key))) return false;
  return snapshot.schemaVersion === CONTINUITY_SCHEMA_VERSION
    && typeof snapshot.vaultLocator === "string" && snapshot.vaultLocator.startsWith("sync_")
    && typeof snapshot.deviceId === "string" && snapshot.deviceId.startsWith("device_")
    && Number.isInteger(snapshot.revision) && Number(snapshot.revision) > 0
    && Number.isInteger(snapshot.itemCount) && Number(snapshot.itemCount) >= 0 && Number(snapshot.itemCount) <= MAX_ENCRYPTED_VAULT_ITEMS
    && typeof snapshot.iv === "string" && typeof snapshot.ciphertext === "string"
    && fromBase64(snapshot.iv).byteLength === 12
    && fromBase64(snapshot.ciphertext).byteLength <= MAX_ENCRYPTED_VAULT_BYTES;
}

export async function encryptVaultPayload(input: {
  payload: unknown;
  itemCount: number;
  dataKey: BrowserBytes;
  vaultLocator: string;
  revision: number;
  deviceId: string;
  now?: string;
}): Promise<EncryptedVaultSnapshot> {
  if (!input.vaultLocator.startsWith("sync_") || !input.deviceId.startsWith("device_")) throw new Error("CONTINUITY_LOCATOR_INVALID");
  assertRevision(input.revision);
  if (!Number.isInteger(input.itemCount) || input.itemCount < 0 || input.itemCount > MAX_ENCRYPTED_VAULT_ITEMS) throw new Error("CONTINUITY_ITEM_LIMIT_EXCEEDED");
  plaintextLimit(input.payload);
  const now = input.now || new Date().toISOString();
  const iv = randomBytes(12);
  const snapshot: EncryptedVaultSnapshot = {
    schemaVersion: CONTINUITY_SCHEMA_VERSION,
    vaultLocator: input.vaultLocator,
    revision: input.revision,
    deviceId: input.deviceId,
    createdAt: now,
    updatedAt: now,
    itemCount: input.itemCount,
    iv: toBase64(iv),
    ciphertext: ""
  };
  const key = await importDataKey(input.dataKey);
  const ciphertext = await cryptoRuntime().subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad(snapshot) }, key, utf8(JSON.stringify(input.payload)));
  snapshot.ciphertext = toBase64(new Uint8Array(ciphertext));
  if (!validateOpaqueSnapshot(snapshot)) throw new Error("CONTINUITY_CIPHERTEXT_INVALID");
  return snapshot;
}

export async function decryptVaultPayload<T>(snapshot: EncryptedVaultSnapshot, dataKey: BrowserBytes): Promise<T> {
  if (!validateOpaqueSnapshot(snapshot)) throw new Error("CONTINUITY_CIPHERTEXT_INVALID");
  const key = await importDataKey(dataKey);
  try {
    const plaintext = await cryptoRuntime().subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(snapshot.iv), additionalData: aad(snapshot) },
      key,
      fromBase64(snapshot.ciphertext)
    );
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    throw new Error("CONTINUITY_DECRYPT_FAILED");
  }
}

export async function createContinuityManifest(recoveryCode: string, options: { deviceId?: string; vaultLocator?: string; now?: string } = {}) {
  const dataKey = await createDataKey();
  const now = options.now || new Date().toISOString();
  const deviceId = options.deviceId || createDeviceId();
  return {
    dataKey,
    manifest: {
      schemaVersion: CONTINUITY_SCHEMA_VERSION,
      vaultLocator: options.vaultLocator || createVaultLocator(),
      deviceId,
      revision: 0,
      enabledAt: now,
      sessions: [createDeviceSession(deviceId, now)],
      recoveryWrapper: await wrapDataKeyWithRecoveryCode(dataKey, recoveryCode),
      passkeyWrappers: []
    } satisfies ContinuityManifest
  };
}

export async function syncEncryptedVault(input: {
  transport: OpaqueVaultTransport;
  manifest: ContinuityManifest;
  dataKey: BrowserBytes;
  payload: unknown;
  itemCount: number;
  now?: string;
}) {
  const snapshot = await encryptVaultPayload({
    payload: input.payload,
    itemCount: input.itemCount,
    dataKey: input.dataKey,
    vaultLocator: input.manifest.vaultLocator,
    revision: input.manifest.revision + 1,
    deviceId: input.manifest.deviceId,
    now: input.now
  });
  const result = await input.transport.write(snapshot, input.manifest.revision);
  if (result.status === "conflict") return { status: "conflict" as const, local: snapshot, remote: result.current };
  return {
    status: "written" as const,
    snapshot: result.snapshot,
    manifest: {
      ...input.manifest,
      revision: result.snapshot.revision,
      sessions: input.manifest.sessions.map((session) => session.deviceId === input.manifest.deviceId
        ? { ...session, lastSeenAt: result.snapshot.updatedAt, status: "active" as const }
        : session)
    }
  };
}

export function revokeDeviceSession(manifest: ContinuityManifest, deviceId: string, at = new Date().toISOString()): ContinuityManifest {
  if (!manifest.sessions.some((session) => session.deviceId === deviceId)) throw new Error("CONTINUITY_SESSION_NOT_FOUND");
  return { ...manifest, sessions: manifest.sessions.map((session) => session.deviceId === deviceId ? { ...session, status: "revoked", revokedAt: at } : session) };
}

export function logoutContinuity(manifest: ContinuityManifest): ContinuityManifest {
  return { ...manifest, sessions: manifest.sessions.map((session) => session.deviceId === manifest.deviceId ? { ...session, status: "logged-out" } : session) };
}

export async function deleteEncryptedVault(transport: OpaqueVaultTransport, manifest: ContinuityManifest) {
  const receipt = await transport.hardDelete(manifest.vaultLocator, manifest.revision);
  if (!receipt) throw new Error("CONTINUITY_DELETE_CONFLICT");
  return receipt;
}

export class MemoryOpaqueVaultTransport implements OpaqueVaultTransport {
  private readonly snapshots = new Map<string, EncryptedVaultSnapshot>();

  async discover(vaultLocator: string) {
    return this.snapshots.get(vaultLocator) || null;
  }

  async write(snapshot: EncryptedVaultSnapshot, expectedRevision: number): Promise<OpaqueWriteResult> {
    if (!validateOpaqueSnapshot(snapshot)) throw new Error("CONTINUITY_SERVER_REJECTED_NON_OPAQUE_PAYLOAD");
    const current = this.snapshots.get(snapshot.vaultLocator) || null;
    if ((current?.revision || 0) !== expectedRevision) return { status: "conflict", current };
    this.snapshots.set(snapshot.vaultLocator, structuredClone(snapshot));
    return { status: "written", snapshot: structuredClone(snapshot) };
  }

  async hardDelete(vaultLocator: string, expectedRevision: number) {
    const current = this.snapshots.get(vaultLocator) || null;
    if (!current || current.revision !== expectedRevision) return null;
    this.snapshots.delete(vaultLocator);
    return { receiptId: `delete_${toBase64(randomBytes(18))}`, vaultLocator, revision: expectedRevision, deletedAt: new Date().toISOString(), kind: "hard-delete" as const };
  }
}
