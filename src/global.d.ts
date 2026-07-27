export {};

declare global {
  interface Window {
    MindPulseVaultStore?: {
      readVault: (vaultId: string) => Promise<Record<string, unknown> | null>;
      writeVault: (vaultId: string, state: Record<string, unknown>) => Promise<Record<string, unknown>>;
      deleteVault: (vaultId: string) => Promise<boolean>;
      schemaVersion?: number;
    };
    MindPulseRiskGate?: {
      isHighRisk: (risk: unknown) => boolean;
      blocksAction: (actionId: string, risk: unknown) => boolean;
      canStartAction: (actionId: string, risk: unknown) => boolean;
      routeTab: (tabId: string, risk: unknown) => string;
      canShowSelfCheck: (risk: unknown) => boolean;
    };
  }
}

declare module "*.css" {
  const stylesheet: string;
  export default stylesheet;
}
