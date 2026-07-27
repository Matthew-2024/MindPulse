import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { canStartAction, evaluateState, isHighRisk } from "../domain/evaluate-state";
import type {
  DataLedger,
  DataMode,
  HelpDraftEvent,
  HelpResources,
  InterventionEvent,
  AddRecordResult,
  MindPulseRecord,
  MindPulseState,
  SafetyHold
} from "../domain/types";
import { deleteVault, getVaultId, markCleared, readVault, wasCleared, writeVault } from "../storage/vault-adapter";

const DEFAULT_HELP_RESOURCES: HelpResources = {
  hotline: "",
  counselingCenter: "",
  counselor: "",
  trustedContact: ""
};

const LEGACY_DEFAULT_HELP_RESOURCES: HelpResources = {
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
    safetyHold: null,
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
    safetyHold: state.safetyHold,
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
    counselingCenter: String(input.counselingCenter || ""),
    counselor: String(input.counselor || ""),
    trustedContact: String(input.trustedContact || "")
  };
}

function normalizeSafetyHold(value: unknown): SafetyHold | null {
  const input = value && typeof value === "object" ? value as Partial<SafetyHold> : {};
  const triggeredAt = String(input.triggeredAt || "");
  if (input.active !== true || !triggeredAt) return null;
  return {
    active: true,
    triggeredAt,
    triggerRecordId: input.triggerRecordId ? String(input.triggerRecordId) : undefined,
    triggerReason: String(input.triggerReason || "高风险事件尚未完成重新评估")
  };
}

function hydrateState(vaultId: string, saved: Record<string, any> | null): MindPulseState {
  if (!saved) return wasCleared() ? emptyState(vaultId) : initialState(vaultId);
  const dataMode: DataMode = saved.dataMode || "real-trial";
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
    safetyHold: normalizeSafetyHold(saved.safetyHold),
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
  setHelpResources: (resources: HelpResources) => void;
  beginSafetyReassessment: () => void;
  recordHelpEvent: (event: Omit<HelpDraftEvent, "type" | "createdAt">) => void;
  clearLocalData: () => Promise<void>;
  resetDemoData: () => void;
}

const MindPulseContext = createContext<StoreValue | null>(null);

export function MindPulseProvider({ children }: PropsWithChildren) {
  const vaultId = useMemo(() => getVaultId(), []);
  const [state, setState] = useState<MindPulseState>(() => initialState(vaultId));

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
    const candidateDecision = evaluateState(
      candidateRecords,
      record.note || "",
      state.interventionEvents,
      state.interventionStats,
      state.safetyHold
    );
    const nextSafetyHold = isHighRisk(candidateDecision.risk)
      ? state.safetyHold || {
        active: true,
        triggeredAt: record.createdAt || new Date().toISOString(),
        triggerRecordId: record.id,
        triggerReason: candidateDecision.risk.reason
      }
      : null;
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
      nextSafetyHold
    );
    markCleared(false);
    commit((current) => ({
      ...current,
      records: current.dataMode === "synthetic-demo" || current.dataMode === "empty"
        ? [persistedRecord]
        : [...current.records, persistedRecord],
      safetyHold: nextSafetyHold,
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
  }, [commit, state.dataMode, state.interventionEvents, state.interventionStats, state.records, state.safetyHold]);

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
    const event: InterventionEvent = {
      id: `event-${Date.now()}`,
      interventionId: actionId,
      createdAt: new Date().toISOString(),
      beforeScore,
      afterScore,
      delta: afterScore - beforeScore,
      riskCode: currentDecision.risk.riskCode,
      riskMode: currentDecision.risk.mode,
      eligibleForLearning: !isHighRisk(currentDecision.risk) && canStartAction(actionId, currentDecision.risk),
      contextBefore: latest,
      contextAfter: nextRecord
    };
    const previousStats = state.interventionStats[actionId] || { count: 0, totalDelta: 0 };
    commit((current) => ({
      ...current,
      records: nextRecords,
      completed: nextCompleted,
      interventionEvents: [...current.interventionEvents, event],
      interventionStats: {
        ...current.interventionStats,
        [actionId]: {
          count: previousStats.count + 1,
          totalDelta: previousStats.totalDelta + event.delta
        }
      }
    }));
    return event;
  }, [commit, state]);

  const setHelpResources = useCallback((resources: HelpResources) => {
    commit((current) => ({ ...current, helpResources: { ...current.helpResources, ...resources } }));
  }, [commit]);

  const beginSafetyReassessment = useCallback(() => {
    commit((current) => ({
      ...current,
      safetyHold: null,
      safetyReassessmentOpen: true,
      error: null
    }));
  }, [commit]);

  const recordHelpEvent = useCallback((event: Omit<HelpDraftEvent, "type" | "createdAt">) => {
    commit((current) => ({
      ...current,
      tasks: [...current.tasks, { type: "help-draft", ...event, createdAt: new Date().toISOString() }]
    }));
  }, [commit]);

  const clearLocalData = useCallback(async () => {
    await deleteVault(vaultId);
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
    setHelpResources,
    beginSafetyReassessment,
    recordHelpEvent,
    clearLocalData,
    resetDemoData
  }), [state, decision, addRecord, completeIntervention, setHelpResources, beginSafetyReassessment, recordHelpEvent, clearLocalData, resetDemoData]);

  return createElement(MindPulseContext.Provider, { value }, children);
}

export function useMindPulse() {
  const context = useContext(MindPulseContext);
  if (!context) throw new Error("useMindPulse must be used inside MindPulseProvider");
  return context;
}

export { DEFAULT_HELP_RESOURCES, DEFAULT_LEDGER, syntheticDemoRecords };
