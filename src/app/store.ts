import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import { canStartAction, evaluateState, isHighRisk } from "../domain/evaluate-state";
import { CRISIS_HISTORY_WINDOW_MS } from "../rules/risk-assessment.js";
import { feedbackEligibilityFor, feedbackWindowFor } from "../rules/intervention-feedback.js";
import { RESOURCE_PACK_CACHE_KEY, resourcePackForHelpResources, writeCachedResourcePack } from "../domain/resource-pack";
import { clearContinuityManifestMetadata } from "../domain/continuity-manifest-store";
import { clearResourceOperations } from "../domain/resource-operation-store";
import {
  createTrustedCircleCheckback as createCheckback,
  createTrustedCircleInvitation as createInvitation,
  normalizeTrustedCircleCheckbacks,
  normalizeTrustedCircleInvitations,
  revokeTrustedCircleInvitation,
  updateTrustedCircleCheckback
} from "../domain/trusted-circle";
import type {
  DataLedger,
  DataMode,
  HelpDraftEvent,
  HelpResources,
  InterventionEvent,
  InterventionOutcomeInput,
  AddRecordResult,
  MindPulseRecord,
  MindPulseState,
  SafetyHold,
  SafetyEvent,
  TrustedCircleCheckback,
  TrustedCircleCheckbackStatus,
  TrustedCircleInvitation,
  TrustedCircleScope
} from "../domain/types";
import { deleteVault, getVaultId, markCleared, readVault, wasCleared, writeVault } from "../storage/vault-adapter";
import "../features/bottle/bottle-repository.js";

const DEFAULT_HELP_RESOURCES: HelpResources = {
  hotline: "",
  hotlineHours: "",
  resourceRegion: "",
  campusName: "",
  counselingCenter: "",
  counselor: "",
  campusLink: "",
  campusHours: "",
  resourceVerifiedAt: "",
  resourceVerificationStatus: "unverified",
  resourceVerificationActionAt: "",
  trustedContact: ""
};

const LEGACY_DEFAULT_HELP_RESOURCES: Partial<HelpResources> = {
  hotline: "12356",
  counselingCenter: "校内心理中心",
  counselor: "辅导员 / 班主任",
  trustedContact: "一位可信任的朋友或家人"
};

const DEFAULT_LEDGER: DataLedger = {
  localStorage: "只保存一个本机编号，不保存心理记录",
  indexedDb: "记录只保存在本机",
  cloudCopy: "off",
  lastSyncAt: null
};

function daysAgo(days: number) {
  const value = new Date();
  value.setHours(20, 0, 0, 0);
  value.setDate(value.getDate() - days);
  return value.toISOString();
}

function demoRecord(days: number, values: Partial<MindPulseRecord>): MindPulseRecord {
  return {
    id: `demo-${days}`,
    createdAt: daysAgo(days),
    entryType: "synthetic",
    dataMode: "synthetic-demo",
    dataInputMode: "synthetic-demo",
    signalSources: {
      mood: "synthetic-demo",
      sleep: "synthetic-demo",
      steps: "synthetic-demo",
      social: "synthetic-demo"
    },
    mood: "calm",
    sleepHours: 7,
    steps: 6500,
    socialScore: 62,
    energyLevel: "mid",
    connectionNeed: "ok",
    note: "",
    ...values
  };
}

function syntheticDemoRecords() {
  return [
    demoRecord(6, { mood: "calm", sleepHours: 7.2, steps: 7200, socialScore: 68, note: "课程节奏平稳" }),
    demoRecord(5, { mood: "happy", sleepHours: 7.5, steps: 8200, socialScore: 74, note: "完成了一个小目标" }),
    demoRecord(4, { mood: "calm", sleepHours: 6.8, steps: 6100, socialScore: 60, note: "下午有一点分心" }),
    demoRecord(3, { mood: "anxious", sleepHours: 6.1, steps: 4700, socialScore: 52, note: "考试前有些紧张" }),
    demoRecord(2, { mood: "calm", sleepHours: 6.5, steps: 5400, socialScore: 55, note: "按计划完成复习" }),
    demoRecord(1, { mood: "tired", sleepHours: 5.8, steps: 3600, socialScore: 42, note: "昨晚睡得晚" }),
    demoRecord(0, { mood: "calm", sleepHours: 6.2, steps: 3200, socialScore: 39, note: "今天节奏比平时紧一些", energyLevel: "mid" })
  ];
}

function baseState(vaultId: string, records: MindPulseRecord[], dataMode: DataMode): MindPulseState {
  return {
    records,
    completed: [],
    interventionStats: {},
    interventionEvents: [],
    surveyHistory: [],
    tasks: [],
    feedbackLearningEnabled: true,
    dataLedger: DEFAULT_LEDGER,
    helpResources: DEFAULT_HELP_RESOURCES,
    trustedCircleInvitations: [],
    trustedCircleCheckbacks: [],
    safetyHold: null,
    safetyEvents: [],
    safetyReassessmentOpen: false,
    dataMode,
    vaultId,
    loaded: false,
    saving: false,
    error: null
  };
}

function initialState(vaultId: string) {
  return baseState(vaultId, syntheticDemoRecords(), "synthetic-demo");
}

function emptyState(vaultId: string) {
  return baseState(vaultId, [], "empty");
}

function serializableState(state: MindPulseState) {
  return {
    records: state.records,
    completed: state.completed,
    interventionStats: state.interventionStats,
    interventionEvents: state.interventionEvents,
    surveyHistory: state.surveyHistory,
    tasks: state.tasks,
    feedbackLearningEnabled: state.feedbackLearningEnabled,
    dataLedger: state.dataLedger,
    helpResources: state.helpResources,
    trustedCircleInvitations: state.trustedCircleInvitations,
    trustedCircleCheckbacks: state.trustedCircleCheckbacks,
    safetyHold: state.safetyHold,
    safetyEvents: state.safetyEvents,
    safetyReassessmentOpen: state.safetyReassessmentOpen,
    dataMode: state.dataMode
  };
}

function normalizeHelpResources(value: unknown): HelpResources {
  const input = value && typeof value === "object" ? value as Partial<HelpResources> : {};
  const matchesLegacyDefaults = (Object.keys(LEGACY_DEFAULT_HELP_RESOURCES) as Array<keyof HelpResources>)
    .every((key) => input[key] === LEGACY_DEFAULT_HELP_RESOURCES[key]);
  if (matchesLegacyDefaults) return { ...DEFAULT_HELP_RESOURCES };
  return {
    hotline: String(input.hotline || ""),
    hotlineHours: String(input.hotlineHours || ""),
    resourceRegion: String(input.resourceRegion || ""),
    campusName: String(input.campusName || ""),
    counselingCenter: String(input.counselingCenter || ""),
    counselor: String(input.counselor || ""),
    campusLink: String(input.campusLink || ""),
    campusHours: String(input.campusHours || ""),
    resourceVerifiedAt: String(input.resourceVerifiedAt || ""),
    resourceVerificationStatus: ["verified", "stale", "unverified", "invalid"].includes(String(input.resourceVerificationStatus))
      ? input.resourceVerificationStatus as HelpResources["resourceVerificationStatus"]
      : input.resourceVerifiedAt
        ? "verified"
        : "unverified",
    resourceVerificationActionAt: String(input.resourceVerificationActionAt || ""),
    trustedContact: String(input.trustedContact || "")
  };
}

function normalizeSafetyHold(value: unknown): SafetyHold | null {
  const input = value && typeof value === "object" ? value as Partial<SafetyHold> : {};
  const triggeredAt = String(input.triggeredAt || "");
  if (!triggeredAt || typeof input.active !== "boolean") return null;
  const triggeredTime = new Date(triggeredAt).getTime();
  const expiresAt = String(input.expiresAt || (
    Number.isFinite(triggeredTime)
      ? new Date(triggeredTime + CRISIS_HISTORY_WINDOW_MS).toISOString()
      : new Date(Date.now() + CRISIS_HISTORY_WINDOW_MS).toISOString()
  ));
  return {
    active: input.active,
    triggeredAt,
    triggerRecordId: input.triggerRecordId ? String(input.triggerRecordId) : undefined,
    triggerReason: String(input.triggerReason || "高风险事件尚未完成重新评估"),
    expiresAt,
    releasedAt: input.releasedAt ? String(input.releasedAt) : undefined,
    releaseRecordId: input.releaseRecordId ? String(input.releaseRecordId) : undefined,
    expiredAt: input.expiredAt ? String(input.expiredAt) : undefined
  };
}

function cacheHelpResources(resources: HelpResources) {
  if (typeof window === "undefined") return;
  try {
    writeCachedResourcePack(window.localStorage, resourcePackForHelpResources(resources));
  } catch {
    // The persisted HelpResources remain usable even when the optional cache is unavailable.
  }
}

function safetyEvent(kind: SafetyEvent["kind"], values: Omit<SafetyEvent, "id" | "type" | "kind">): SafetyEvent {
  return {
    id: `safety-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "safety-event",
    kind,
    ...values
  };
}

function hydrateState(vaultId: string, saved: Record<string, any> | null): MindPulseState {
  if (!saved) return wasCleared() ? emptyState(vaultId) : initialState(vaultId);
  const dataMode: DataMode = saved.dataMode || "real-trial";
  const trustedCircleInvitations = normalizeTrustedCircleInvitations(saved.trustedCircleInvitations);
  return {
    ...baseState(vaultId, Array.isArray(saved.records) ? saved.records : [], dataMode),
    completed: Array.isArray(saved.completed) ? saved.completed : [],
    interventionStats: saved.interventionStats && typeof saved.interventionStats === "object" ? saved.interventionStats : {},
    interventionEvents: Array.isArray(saved.interventionEvents) ? saved.interventionEvents : [],
    surveyHistory: Array.isArray(saved.surveyHistory) ? saved.surveyHistory : [],
    tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
    feedbackLearningEnabled: saved.feedbackLearningEnabled !== false,
    dataLedger: { ...DEFAULT_LEDGER, ...(saved.dataLedger || {}) },
    helpResources: normalizeHelpResources(saved.helpResources),
    trustedCircleInvitations,
    trustedCircleCheckbacks: normalizeTrustedCircleCheckbacks(saved.trustedCircleCheckbacks, trustedCircleInvitations),
    safetyHold: normalizeSafetyHold(saved.safetyHold),
    safetyEvents: Array.isArray(saved.safetyEvents) ? saved.safetyEvents : [],
    safetyReassessmentOpen: saved.safetyReassessmentOpen === true,
    loaded: false,
    saving: false,
    error: null
  };
}

interface StoreValue {
  state: MindPulseState;
  decision: ReturnType<typeof evaluateState>;
  addRecord: (input: MindPulseRecord) => Promise<AddRecordResult>;
  completeIntervention: (actionId: string) => Promise<InterventionEvent>;
  recordInterventionOutcome: (input: InterventionOutcomeInput) => Promise<InterventionEvent>;
  setHelpResources: (resources: HelpResources) => void;
  beginSafetyReassessment: () => void;
  recordHelpEvent: (event: Omit<HelpDraftEvent, "type" | "createdAt">) => void;
  createTrustedCircleInvitation: (input: { recipientLabel: string; scope: TrustedCircleScope; expiresAt: string; consent: boolean }) => Promise<TrustedCircleInvitation>;
  revokeTrustedCircleInvitation: (invitationId: string) => void;
  createTrustedCircleCheckback: (invitationId: string, dueAt: string) => Promise<TrustedCircleCheckback>;
  updateTrustedCircleCheckback: (checkbackId: string, status: TrustedCircleCheckbackStatus) => void;
  clearLocalData: () => Promise<void>;
  resetDemoData: () => void;
}

const MindPulseContext = createContext<StoreValue | null>(null);

export function MindPulseProvider({ children }: PropsWithChildren) {
  const vaultId = useMemo(() => getVaultId(), []);
  const [state, setState] = useState<MindPulseState>(() => initialState(vaultId));
  const feedbackSubmitLock = useRef(new Set<string>());

  const persist = useCallback(async (next: MindPulseState) => {
    try {
      await writeVault(next.vaultId, serializableState(next));
      setState((current) => ({ ...current, saving: false, error: null }));
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        error: error instanceof Error ? error.message : "本地保存失败"
      }));
    }
  }, []);

  const commit = useCallback((mutate: (current: MindPulseState) => MindPulseState) => {
    setState((current) => {
      const next = { ...mutate(current), saving: true };
      void persist(next);
      return next;
    });
  }, [persist]);

  useEffect(() => {
    let cancelled = false;
    readVault(vaultId)
      .then((saved) => {
        if (cancelled) return;
        const next = { ...hydrateState(vaultId, saved as Record<string, any> | null), loaded: true };
        setState(next);
        cacheHelpResources(next.helpResources);
        if (!saved && !wasCleared()) void persist(next);
      })
      .catch((error) => {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          loaded: true,
          error: error instanceof Error ? error.message : "本地数据读取失败"
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [persist, vaultId]);

  const addRecord = useCallback(async (input: MindPulseRecord) => {
    const record: MindPulseRecord = {
      ...input,
      id: input.id || `record-${Date.now()}`,
      createdAt: input.createdAt || new Date().toISOString(),
      entryType: input.entryType || "instant",
      dataMode: input.dataMode || "real-trial",
      dataInputMode: input.dataInputMode || "manual-web",
      signalSources: input.signalSources || {
        mood: "manual",
        sleep: "manual",
        steps: "manual",
        social: "manual"
      }
    };
    const candidateRecords = state.dataMode === "synthetic-demo" || state.dataMode === "empty"
      ? [record]
      : [...state.records, record];
    const nextDataMode = record.dataMode || "real-trial";
    const isReassessment = state.safetyReassessmentOpen;
    const recordAt = record.createdAt || new Date().toISOString();
    const existingHoldExpired = Boolean(
      state.safetyHold?.active &&
      state.safetyHold.expiresAt &&
      new Date(state.safetyHold.expiresAt).getTime() <= new Date(recordAt).getTime()
    );
    const evaluationHold = isReassessment || existingHoldExpired ? null : state.safetyHold;
    const evaluationOptions = {
      includeHistoricalCrisis: !isReassessment,
      historyAfter: isReassessment ? undefined : state.safetyHold?.releasedAt,
      now: recordAt
    };
    const candidateDecision = evaluateState(
      candidateRecords,
      record.note || "",
      state.interventionEvents,
      state.interventionStats,
      evaluationHold,
      evaluationOptions
    );
    let nextSafetyHold: SafetyHold | null = state.safetyHold;
    let lifecycleEvent: SafetyEvent | null = null;
    if (isHighRisk(candidateDecision.risk)) {
      nextSafetyHold = {
        active: true,
        triggeredAt: recordAt,
        triggerRecordId: record.id,
        triggerReason: candidateDecision.risk.reason,
        expiresAt: new Date(new Date(recordAt).getTime() + CRISIS_HISTORY_WINDOW_MS).toISOString()
      };
      lifecycleEvent = safetyEvent(state.safetyHold?.releasedAt ? "retriggered" : "triggered", {
        createdAt: recordAt,
        decisionId: candidateDecision.trace.decisionId,
        recordId: record.id,
        reason: candidateDecision.risk.reason
      });
    } else if (isReassessment && state.safetyHold) {
      nextSafetyHold = {
        ...state.safetyHold,
        active: false,
        releasedAt: recordAt,
        releaseRecordId: record.id,
        expiredAt: undefined
      };
      lifecycleEvent = safetyEvent("released", {
        createdAt: recordAt,
        decisionId: candidateDecision.trace.decisionId,
        recordId: record.id,
        triggerRecordId: state.safetyHold.triggerRecordId,
        reason: "重新评估未发现当前危机信号",
        criteria: "用户确认已联系支持；新记录未触发当前危机文本规则"
      });
    } else if (existingHoldExpired && state.safetyHold) {
      nextSafetyHold = {
        ...state.safetyHold,
        active: false,
        expiredAt: recordAt
      };
      lifecycleEvent = safetyEvent("expired", {
        createdAt: recordAt,
        decisionId: candidateDecision.trace.decisionId,
        recordId: record.id,
        triggerRecordId: state.safetyHold.triggerRecordId,
        reason: "安全保持有期已到，当前记录未触发新的危机信号"
      });
    }
    const persistedRecord: MindPulseRecord = {
      ...record,
      riskCode: candidateDecision.risk.riskCode,
      riskMode: candidateDecision.risk.mode
    };
    const nextRecords = state.dataMode === "synthetic-demo" || state.dataMode === "empty"
      ? [persistedRecord]
      : [...state.records, persistedRecord];
    const nextDecision = evaluateState(
      nextRecords,
      persistedRecord.note || "",
      state.interventionEvents,
      state.interventionStats,
      nextSafetyHold,
      evaluationOptions
    );
    markCleared(false);
    commit((current) => ({
      ...current,
      records: current.dataMode === "synthetic-demo" || current.dataMode === "empty"
        ? [persistedRecord]
        : [...current.records, persistedRecord],
      safetyHold: nextSafetyHold,
      safetyEvents: lifecycleEvent ? [...current.safetyEvents, lifecycleEvent] : current.safetyEvents,
      safetyReassessmentOpen: false,
      dataMode: nextDataMode,
      error: null
    }));
    return {
      record: persistedRecord,
      records: nextRecords,
      decision: nextDecision,
      dataMode: nextDataMode
    };
  }, [commit, state.dataMode, state.interventionEvents, state.interventionStats, state.records, state.safetyHold, state.safetyReassessmentOpen]);

  const completeIntervention = useCallback(async (actionId: string) => {
    const currentDecision = evaluateState(state.records, "", state.interventionEvents, state.interventionStats, state.safetyHold);
    const ordinaryAction = ["breathe", "walk", "journal", "sleep", "focus", "friend"].includes(actionId);
    if (!ordinaryAction || isHighRisk(currentDecision.risk) || currentDecision.risk.mode !== "action" || !canStartAction(actionId, currentDecision.risk)) {
      throw new Error("当前策略不允许普通行动，请先进入求助或补充记录");
    }
    const latest = state.records.at(-1) || {};
    const beforeScore = Number(currentDecision.score.total || 0);
    const nextCompleted = Array.from(new Set([...state.completed, actionId]));
    const nextRecord = { ...latest, completedInterventions: nextCompleted };
    const nextRecords = state.records.length
      ? [...state.records.slice(0, -1), nextRecord]
      : [nextRecord];
    const afterDecision = evaluateState(nextRecords, "", state.interventionEvents, state.interventionStats, state.safetyHold);
    const afterScore = Number(afterDecision.score.total || 0);
    const completedAt = new Date().toISOString();
    const feedbackWindow = feedbackWindowFor({ createdAt: completedAt });
    const event: InterventionEvent = {
      id: `event-${Date.now()}`,
      interventionId: actionId,
      createdAt: completedAt,
      eventType: "completion",
      beforeScore,
      afterScore,
      delta: afterScore - beforeScore,
      riskCode: currentDecision.risk.riskCode,
      riskMode: currentDecision.risk.mode,
      eligibleForLearning: false,
      feedbackDueAt: feedbackWindow?.opensAt,
      feedbackExpiresAt: feedbackWindow?.closesAt,
      feedbackContext: {
        completionRecordId: latest.id,
        feedbackRecordId: latest.id,
        dataMode: state.dataMode,
        riskCode: currentDecision.risk.riskCode,
        riskMode: currentDecision.risk.mode,
        contextChanged: false
      },
      contextBefore: latest,
      contextAfter: nextRecord
    };
    commit((current) => ({
      ...current,
      records: nextRecords,
      completed: nextCompleted,
      interventionEvents: [...current.interventionEvents, event],
      interventionStats: current.interventionStats
    }));
    return event;
  }, [commit, state]);

  const recordInterventionOutcome = useCallback(async (input: InterventionOutcomeInput) => {
    const completionEventId = String(input.completionEventId || "").trim();
    if (!completionEventId) throw new Error("Missing intervention completion reference.");
    if (!['better', 'same', 'worse', 'skipped'].includes(input.outcome)) throw new Error("Invalid intervention outcome.");
    if (input.outcome !== "skipped" && !["low", "medium", "high"].includes(String(input.burden || ""))) {
      throw new Error("A burden selection is required for outcome feedback.");
    }
    if (feedbackSubmitLock.current.has(completionEventId)) throw new Error("Outcome feedback is already being recorded.");
    const completion = state.interventionEvents.find((event) => event.id === completionEventId && event.eventType === "completion");
    if (!completion) throw new Error("The intervention completion could not be found.");

    feedbackSubmitLock.current.add(completionEventId);
    try {
      const outcomeRecordedAt = new Date().toISOString();
      const currentDecision = evaluateState(state.records, "", state.interventionEvents, state.interventionStats, state.safetyHold);
      const eligibility = feedbackEligibilityFor({
        completion,
        feedbackEvents: state.interventionEvents,
        outcome: input.outcome,
        now: Date.parse(outcomeRecordedAt),
        currentRisk: currentDecision.risk,
        currentRecord: state.records.at(-1)
      });
      const note = String(input.note || "").trim().slice(0, 280);
      const feedbackEvent: InterventionEvent = {
        id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        interventionId: completion.interventionId,
        createdAt: outcomeRecordedAt,
        eventType: "outcome-feedback",
        beforeScore: completion.beforeScore,
        afterScore: completion.afterScore,
        delta: 0,
        riskCode: currentDecision.risk.riskCode,
        riskMode: currentDecision.risk.mode,
        eligibleForLearning: eligibility.eligible,
        outcome: input.outcome,
        burden: input.outcome === "skipped" ? undefined : input.burden,
        feedbackNote: note || undefined,
        outcomeRecordedAt,
        feedbackCompletionEventId: completion.id,
        feedbackDueAt: eligibility.feedbackDueAt,
        feedbackExpiresAt: eligibility.feedbackExpiresAt,
        feedbackOpenedAt: outcomeRecordedAt,
        feedbackTimingValid: eligibility.timingValid,
        learningExclusionReason: eligibility.exclusionReason as InterventionEvent["learningExclusionReason"],
        feedbackContext: {
          completionRecordId: completion.contextAfter?.id || completion.feedbackContext?.completionRecordId,
          feedbackRecordId: state.records.at(-1)?.id,
          dataMode: state.dataMode,
          riskCode: currentDecision.risk.riskCode,
          riskMode: currentDecision.risk.mode,
          contextChanged: eligibility.contextChanged
        },
        contextBefore: completion.contextAfter,
        contextAfter: state.records.at(-1)
      };
      commit((current) => ({
        ...current,
        interventionEvents: [...current.interventionEvents, feedbackEvent]
      }));
      return feedbackEvent;
    } finally {
      window.setTimeout(() => feedbackSubmitLock.current.delete(completionEventId), 0);
    }
  }, [commit, state]);

  const setHelpResources = useCallback((resources: HelpResources) => {
    cacheHelpResources(resources);
    commit((current) => ({ ...current, helpResources: { ...current.helpResources, ...resources } }));
  }, [commit]);

  const beginSafetyReassessment = useCallback(() => {
    commit((current) => ({
      ...current,
      safetyReassessmentOpen: true,
      safetyEvents: [
        ...current.safetyEvents,
        safetyEvent("reassessment-opened", {
          createdAt: new Date().toISOString(),
          triggerRecordId: current.safetyHold?.triggerRecordId,
          reason: "用户确认已联系支持，允许重新记录当前状态",
          criteria: "重新记录当前状态后再决定是否释放安全保持"
        })
      ],
      error: null
    }));
  }, [commit]);

  const recordHelpEvent = useCallback((event: Omit<HelpDraftEvent, "type" | "createdAt">) => {
    commit((current) => ({
      ...current,
      tasks: [...current.tasks, { type: "help-draft", ...event, createdAt: new Date().toISOString() }]
    }));
  }, [commit]);

  const createTrustedCircleInvitation = useCallback(async (input: { recipientLabel: string; scope: TrustedCircleScope; expiresAt: string; consent: boolean }) => {
    const currentDecision = evaluateState(state.records, "", state.interventionEvents, state.interventionStats, state.safetyHold);
    if (isHighRisk(currentDecision.risk)) throw new Error("TRUSTED_CIRCLE_HIGH_RISK_HELP_REQUIRED");
    const invitation = createInvitation({ ...input, existing: state.trustedCircleInvitations });
    commit((current) => ({ ...current, trustedCircleInvitations: [...current.trustedCircleInvitations, invitation] }));
    return invitation;
  }, [commit, state]);

  const revokeTrustedCircleInvitationInStore = useCallback((invitationId: string) => {
    commit((current) => ({ ...current, trustedCircleInvitations: revokeTrustedCircleInvitation(current.trustedCircleInvitations, invitationId) }));
  }, [commit]);

  const createTrustedCircleCheckback = useCallback(async (invitationId: string, dueAt: string) => {
    const invitation = state.trustedCircleInvitations.find((item) => item.id === invitationId);
    if (!invitation) throw new Error("TRUSTED_CIRCLE_INVITATION_NOT_FOUND");
    const checkback = createCheckback({ invitation, dueAt });
    commit((current) => ({ ...current, trustedCircleCheckbacks: [...current.trustedCircleCheckbacks, checkback] }));
    return checkback;
  }, [commit, state.trustedCircleInvitations]);

  const updateTrustedCircleCheckbackInStore = useCallback((checkbackId: string, status: TrustedCircleCheckbackStatus) => {
    commit((current) => ({ ...current, trustedCircleCheckbacks: updateTrustedCircleCheckback(current.trustedCircleCheckbacks, checkbackId, status) }));
  }, [commit]);

  const clearLocalData = useCallback(async () => {
    await deleteVault(vaultId);
    if (typeof window !== "undefined" && window.MindPulseBottleRepository?.createLocalBottleRepository) {
      try {
        window.MindPulseBottleRepository.createLocalBottleRepository(window.localStorage).clearOwnData(vaultId);
      } catch {
        // The vault remains cleared even when the optional local bottle store is unavailable.
      }
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(RESOURCE_PACK_CACHE_KEY);
      clearResourceOperations(window.localStorage);
      clearContinuityManifestMetadata(window.localStorage);
    }
    markCleared(true);
    setState({ ...emptyState(vaultId), loaded: true });
  }, [vaultId]);

  const resetDemoData = useCallback(() => {
    markCleared(false);
    commit(() => ({ ...initialState(vaultId), loaded: true }));
  }, [commit, vaultId]);

  const decision = useMemo(
    () => evaluateState(state.records, "", state.interventionEvents, state.interventionStats, state.safetyHold),
    [state.records, state.interventionEvents, state.interventionStats, state.safetyHold]
  );

  const value = useMemo<StoreValue>(() => ({
    state,
    decision,
    addRecord,
    completeIntervention,
    recordInterventionOutcome,
    setHelpResources,
    beginSafetyReassessment,
    recordHelpEvent,
    createTrustedCircleInvitation,
    revokeTrustedCircleInvitation: revokeTrustedCircleInvitationInStore,
    createTrustedCircleCheckback,
    updateTrustedCircleCheckback: updateTrustedCircleCheckbackInStore,
    clearLocalData,
    resetDemoData
  }), [state, decision, addRecord, completeIntervention, recordInterventionOutcome, setHelpResources, beginSafetyReassessment, recordHelpEvent, createTrustedCircleInvitation, revokeTrustedCircleInvitationInStore, createTrustedCircleCheckback, updateTrustedCircleCheckbackInStore, clearLocalData, resetDemoData]);

  return createElement(MindPulseContext.Provider, { value }, children);
}

export function useMindPulse() {
  const context = useContext(MindPulseContext);
  if (!context) throw new Error("useMindPulse must be used inside MindPulseProvider");
  return context;
}

export { DEFAULT_HELP_RESOURCES, DEFAULT_LEDGER, syntheticDemoRecords };
