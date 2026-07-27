export type RiskMode = "action" | "ask" | "help";

export type DataMode = "synthetic-demo" | "real-trial" | "public-reference" | "empty";

export type SignalKey = "mood" | "sleep" | "steps" | "social";

export type ReasonCode =
  | "DATA_INSUFFICIENT"
  | "BASELINE_DEVIATION"
  | "LOW_SLEEP_REPEATED"
  | "LOW_CONNECTION_REPEATED"
  | "NEGATIVE_MOOD_REPEATED"
  | "TEXT_CRISIS_SIGNAL"
  | "SAFETY_HOLD"
  | "SINGLE_WAVE"
  | "STABLE_BASELINE";

export interface MindPulseRecord {
  id?: string;
  createdAt?: string;
  entryType?: "daily" | "instant" | "synthetic";
  dataMode?: DataMode;
  dataInputMode?: string;
  mood?: string;
  moodScore?: number;
  sleepHours?: number;
  steps?: number;
  socialScore?: number;
  note?: string;
  energyLevel?: "low" | "mid" | "high";
  connectionNeed?: "need" | "ok" | "avoid";
  signalPresence?: Partial<Record<SignalKey, boolean>>;
  signalSources?: Partial<Record<SignalKey, string>>;
  completedInterventions?: string[];
  riskCode?: string;
  riskMode?: RiskMode;
}

export interface SignalContribution {
  signal: string;
  label: string;
  value: number | null;
  score: number;
  max: number;
  present: boolean;
  source: string;
  reason: string;
  share?: number;
}

export interface ScoreResult {
  total: number;
  rawTotal?: number;
  max?: number;
  confidence?: string;
  confidenceText?: string;
  dataCompleteness?: DataCompleteness;
  breakdown: Record<string, number>;
  contributions: SignalContribution[];
  missingSignals?: string[];
  explanation?: string;
  [key: string]: unknown;
}

export interface DataCompleteness {
  available: number;
  required: number;
  ratio: number;
  percent: number;
  missing: string[];
  sources: Record<string, string>;
  signals?: Record<string, unknown>;
}

export interface BaselineSignal {
  baseline: number | null;
  current: number | null;
  delta: number | null;
  relativeDelta: number | null;
  sampleCount: number;
  ready: boolean;
  present: boolean;
  source: string;
  explanation: string;
}

export interface BaselineResult {
  level: string;
  title: string;
  desc: string;
  status: string;
  coldStart: boolean;
  baselineReady: boolean;
  historyRecords: number;
  readySignalCount: number;
  confidence: string;
  confidenceText: string;
  confidenceScore: number;
  dataCompleteness: DataCompleteness;
  base: Record<string, number | null>;
  delta: Record<string, number | null>;
  flags: string[];
  signals: Record<SignalKey, BaselineSignal>;
}

export interface RiskStrategy {
  riskCode: string;
  risk: string;
  level: string;
  mode: RiskMode;
  tag?: string;
  reason: string;
  desc?: string;
  evidence: string[];
  explanation: string;
  allowedActions: string[];
  blockedActions: string[];
  shouldRecommendSelfHelp: boolean;
  dataCompleteness: DataCompleteness;
  baselineStatus: string;
  confidence: string;
  policyVersion?: string;
  [key: string]: unknown;
}

export type PolicyEvidenceClass = "public-guidance" | "evidence-framework" | "public-research";

export interface PolicyReference {
  id: string;
  authority: string;
  publishedYear: string;
  title: string;
  url: string;
  evidenceClass: PolicyEvidenceClass;
  supports: string;
  doesNotSupport: string;
}

export interface RecommendationPlan {
  path: string[];
  reason: string;
  reasons: string[];
  mode: RiskMode;
  risk: string;
  riskCode: string;
  allowedActions: string[];
  blockedActions: string[];
  evidence: string[];
  explanation: string;
}

export interface DecisionTrace {
  decisionId: string;
  evaluatedAt: string;
  reasonCodes: ReasonCode[];
  mode: RiskMode;
  riskCode: string;
  allowedActions: string[];
  blockedActions: string[];
  evidence: string[];
  explanation: string;
  policyVersion: string;
  dataSource: string;
  confidence: string;
  policyReferences: PolicyReference[];
  policyNotes: string[];
}

export interface MindPulseDecision {
  score: ScoreResult;
  baseline: BaselineResult;
  risk: RiskStrategy;
  recommendation: RecommendationPlan;
  trace: DecisionTrace;
}

export interface AddRecordResult {
  record: MindPulseRecord;
  records: MindPulseRecord[];
  decision: MindPulseDecision;
  dataMode: DataMode;
}

export interface InterventionEvent {
  id: string;
  interventionId: string;
  createdAt: string;
  beforeScore: number;
  afterScore: number;
  delta: number;
  riskCode: string;
  riskMode: RiskMode;
  eligibleForLearning: boolean;
  contextBefore?: MindPulseRecord;
  contextAfter?: MindPulseRecord;
}

export interface SafetyHold {
  active: boolean;
  triggeredAt: string;
  triggerRecordId?: string;
  triggerReason: string;
}

export interface HelpResources {
  hotline: string;
  counselingCenter: string;
  counselor: string;
  trustedContact: string;
}

export type HelpTarget = "friend" | "teacher" | "family";
export type HelpNeed = "listen" | "stay" | "accompany";
export type HelpUrgency = "now" | "later";

export interface HelpDraftEvent {
  type: "help-draft";
  target: HelpTarget;
  need: HelpNeed;
  urgency: HelpUrgency;
  copied: boolean;
  createdAt: string;
}

export interface DataLedger {
  localStorage: string;
  indexedDb: string;
  cloudCopy: "off" | "encrypted-only";
  lastSyncAt?: string | null;
}

export interface MindPulseState {
  records: MindPulseRecord[];
  completed: string[];
  interventionStats: Record<string, { count: number; totalDelta: number }>;
  interventionEvents: InterventionEvent[];
  surveyHistory: unknown[];
  tasks: unknown[];
  feedbackLearningEnabled: boolean;
  dataLedger: DataLedger;
  helpResources: HelpResources;
  safetyHold: SafetyHold | null;
  safetyReassessmentOpen: boolean;
  dataMode: DataMode;
  vaultId: string;
  loaded: boolean;
  saving: boolean;
  error: string | null;
}
