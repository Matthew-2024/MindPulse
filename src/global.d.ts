export {};

declare global {
  interface MindPulseBottle {
    id: string;
    ownerId: string;
    alias: string;
    content: string;
    createdAt: string;
    demo: boolean;
  }

  interface MindPulseBottleReply {
    id: string;
    bottleId: string;
    alias: string;
    content: string;
    createdAt: string;
  }

  interface MindPulseBottleReport {
    id: string;
    bottleId: string;
    reason: string;
    createdAt: string;
  }

  interface MindPulseBottleRepository {
    listOwnBottles: (profileId: string) => MindPulseBottle[];
    createBottle: (profileId: string, content: string) => MindPulseBottle | null;
    drawBottle: (profileId: string) => MindPulseBottle | null;
    replyToBottle: (profileId: string, bottleId: string, content: string) => MindPulseBottleReply | null;
    listRepliesForOwnBottle: (profileId: string, bottleId: string) => MindPulseBottleReply[];
    hideBottle: (profileId: string, bottleId: string) => boolean;
    reportBottle: (profileId: string, bottleId: string, reason?: string) => MindPulseBottleReport | null;
    listHiddenBottleIds: (profileId: string) => string[];
    exportOwnData: (profileId: string) => {
      bottles: MindPulseBottle[];
      bottleReplies: MindPulseBottleReply[];
      hiddenBottleIds: string[];
      reports: MindPulseBottleReport[];
    };
    clearOwnData: (profileId: string) => boolean;
  }

  interface Window {
    MindPulseBottleRepository?: {
      DEMO_BOTTLES: MindPulseBottle[];
      createLocalBottleRepository: (storage: Storage, options?: { random?: () => number; now?: () => string }) => MindPulseBottleRepository;
    };
    MindPulseVaultStore?: {
      readVault: (vaultId: string) => Promise<Record<string, unknown> | null>;
      writeVault: (vaultId: string, state: Record<string, unknown>) => Promise<Record<string, unknown>>;
      deleteVault: (vaultId: string) => Promise<boolean>;
      schemaVersion?: number;
    };
    MindPulseRiskGate?: {
    isHighRisk: (risk: unknown) => boolean;
      isInsufficient: (risk: unknown) => boolean;
      blocksAction: (actionId: string, risk: unknown) => boolean;
      blocksRoute: (pathname: string, risk: unknown) => boolean;
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
