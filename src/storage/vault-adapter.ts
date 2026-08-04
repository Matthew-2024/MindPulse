import "./vault-store.js";

const VAULT_ID_KEY = "mindpulseReactVaultId";
const CLEARED_KEY = "mindpulseReactVaultCleared";

function createVaultId() {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `vault_${random.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export function getVaultId() {
  const existing = window.localStorage.getItem(VAULT_ID_KEY);
  if (existing) return existing;
  const next = createVaultId();
  window.localStorage.setItem(VAULT_ID_KEY, next);
  return next;
}

export function wasCleared() {
  return window.localStorage.getItem(CLEARED_KEY) === "1";
}

export function markCleared(value: boolean) {
  if (value) window.localStorage.setItem(CLEARED_KEY, "1");
  else window.localStorage.removeItem(CLEARED_KEY);
}

export async function readVault(vaultId: string) {
  if (!window.MindPulseVaultStore) throw new Error("本地存储模块未加载");
  return window.MindPulseVaultStore.readVault(vaultId);
}

export async function writeVault(vaultId: string, snapshot: Record<string, unknown>) {
  if (!window.MindPulseVaultStore) throw new Error("本地存储模块未加载");
  return window.MindPulseVaultStore.writeVault(vaultId, snapshot);
}

export async function deleteVault(vaultId: string) {
  if (!window.MindPulseVaultStore) throw new Error("本地存储模块未加载");
  return window.MindPulseVaultStore.deleteVault(vaultId);
}
