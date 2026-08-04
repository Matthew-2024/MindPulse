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
  /** Provisional normalized view using only signals that are present. */
  referenceScore?: number | null;
  referenceRawTotal?: number;
  referenceMax?: number;
  referenceSignalCount?: number;
  referenceSignalRequired?: number;
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
  eventType?: "completion" | "outcome-feedback";
  beforeScore: number;
  afterScore: number;
  delta: number;
  riskCode: string;
  riskMode: RiskMode;
  eligibleForLearning: boolean;
  outcome?: "better" | "same" | "worse" | "skipped";
  outcomeRecordedAt?: string;
  feedbackCompletionEventId?: string;
  feedbackDueAt?: string;
  feedbackExpiresAt?: string;
  feedbackOpenedAt?: string;
  feedbackTimingValid?: boolean;
  learningExclusionReason?: FeedbackLearningExclusionReason;
  burden?: InterventionFeedbackBurden;
  feedbackNote?: string;
  feedbackContext?: InterventionFeedbackContext;
  contextBefore?: MindPulseRecord;
  contextAfter?: MindPulseRecord;
}

export type InterventionFeedbackBurden = "low" | "medium" | "high";

export type FeedbackLearningExclusionReason =
  | "high-risk"
  | "insufficient-data"
  | "duplicate"
  | "too-early"
  | "too-late"
  | "clock-invalid"
  | "context-changed"
  | "synthetic-data"
  | "skipped";

export interface InterventionFeedbackContext {
  completionRecordId?: string;
  feedbackRecordId?: string;
  dataMode: DataMode;
  riskCode: string;
  riskMode: RiskMode;
  contextChanged: boolean;
}

export interface InterventionOutcomeInput {
  completionEventId: string;
  outcome: "better" | "same" | "worse" | "skipped";
  burden?: InterventionFeedbackBurden;
  note?: string;
}

export interface SafetyHold {
  active: boolean;
  triggeredAt: string;
  triggerRecordId?: string;
  triggerReason: string;
  expiresAt: string;
  releasedAt?: string;
  releaseRecordId?: string;
  expiredAt?: string;
}

export type SafetyEventKind = "triggered" | "reassessment-opened" | "released" | "retriggered" | "expired";

export interface SafetyEvent {
  id: string;
  type: "safety-event";
  kind: SafetyEventKind;
  createdAt: string;
  decisionId?: string;
  recordId?: string;
  triggerRecordId?: string;
  reason?: string;
  criteria?: string;
}

export type HelpResourceVerificationStatus = "verified" | "stale" | "unverified" | "invalid";

export interface HelpResources {
  hotline: string;
  hotlineHours: string;
  resourceRegion: string;
  campusName: string;
  counselingCenter: string;
  counselor: string;
  campusLink: string;
  campusHours: string;
  resourceVerifiedAt: string;
  resourceVerificationStatus: HelpResourceVerificationStatus;
  resourceVerificationActionAt: string;
  trustedContact: string;
}

export type HelpTarget = "friend" | "teacher" | "family";
export type HelpNeed = "listen" | "stay" | "accompany";
export type HelpUrgency = "now" | "later";

export interface HelpDraftEvent {
  type: "help-draft";
  decisionId: string;
  resourcePackId?: string;
  resourceId?: string;
  resourceVersion?: string;
  action?: "preview" | "copy" | "open";
  target: HelpTarget;
  need: HelpNeed;
  urgency: HelpUrgency;
  copied: boolean;
  includeStateSummary?: boolean;
  includedFields: string[];
  excludedFields: string[];
  sourceTypes: string[];
  userEdited: boolean;
  copiedAt?: string | null;
  createdAt: string;
}

export type TrustedCircleScope = "check-in" | "practical" | "company";
export type TrustedCircleInvitationStatus = "active" | "revoked" | "expired";
export type TrustedCircleCheckbackStatus = "planned" | "completed" | "skipped";

export interface TrustedCircleInvitation {
  id: string;
  recipientLabel: string;
  scope: TrustedCircleScope;
  createdAt: string;
  expiresAt: string;
  status: TrustedCircleInvitationStatus;
  noContactImport: true;
  revokedAt?: string;
}

export interface TrustedCircleCheckback {
  id: string;
  invitationId: string;
  dueAt: string;
  createdAt: string;
  updatedAt: string;
  status: TrustedCircleCheckbackStatus;
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
  interventionStats: Record<string, Record<string, unknown>>;
  interventionEvents: InterventionEvent[];
  surveyHistory: unknown[];
  tasks: unknown[];
  feedbackLearningEnabled: boolean;
  dataLedger: DataLedger;
  helpResources: HelpResources;
  trustedCircleInvitations: TrustedCircleInvitation[];
  trustedCircleCheckbacks: TrustedCircleCheckback[];
  safetyHold: SafetyHold | null;
  safetyEvents: SafetyEvent[];
  safetyReassessmentOpen: boolean;
  dataMode: DataMode;
  vaultId: string;
  loaded: boolean;
  saving: boolean;
  error: string | null;
}
