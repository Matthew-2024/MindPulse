export const ACTION_FEEDBACK_MIN_DELAY_MS = 10 * 60 * 1000;
export const ACTION_FEEDBACK_MAX_DELAY_MS = 30 * 60 * 1000;
export const ACTION_FEEDBACK_CLOCK_SKEW_MS = 2 * 60 * 1000;

function asTime(value) {
  const time = new Date(value || "").getTime();
  return Number.isFinite(time) ? time : null;
}

function isHighRisk(risk) {
  return risk?.riskCode === "high" || risk?.riskMode === "help" || risk?.mode === "help" || risk?.level === "high";
}

function isInsufficient(risk) {
  return risk?.riskCode === "insufficient" || risk?.riskMode === "ask" || risk?.mode === "ask";
}

export function feedbackWindowFor(completion) {
  const completedAt = asTime(completion?.createdAt);
  if (completedAt === null) return null;
  return {
    opensAt: new Date(completedAt + ACTION_FEEDBACK_MIN_DELAY_MS).toISOString(),
    closesAt: new Date(completedAt + ACTION_FEEDBACK_MAX_DELAY_MS).toISOString()
  };
}

export function isEligibleFeedbackEvent(event) {
  if (!event || event.eventType !== "outcome-feedback") return false;
  if (!event.feedbackCompletionEventId || event.eligibleForLearning !== true || event.feedbackTimingValid !== true) return false;
  if (event.learningExclusionReason || !["better", "same", "worse"].includes(event.outcome)) return false;
  if (isHighRisk(event) || isInsufficient(event)) return false;
  if (event.feedbackContext?.dataMode && event.feedbackContext.dataMode !== "real-trial") return false;
  return true;
}

export function feedbackEligibilityFor({ completion, feedbackEvents = [], outcome, now = Date.now(), currentRisk, currentRecord }) {
  const window = feedbackWindowFor(completion);
  const nowTime = typeof now === "number" ? now : asTime(now);
  const completedAt = asTime(completion?.createdAt);
  const result = {
    eligible: false,
    timingValid: false,
    exclusionReason: "clock-invalid",
    feedbackDueAt: window?.opensAt,
    feedbackExpiresAt: window?.closesAt,
    contextChanged: false
  };

  if (nowTime === null || completedAt === null || !window) return result;
  if (nowTime < completedAt - ACTION_FEEDBACK_CLOCK_SKEW_MS) return result;
  if (nowTime < completedAt + ACTION_FEEDBACK_MIN_DELAY_MS) return { ...result, timingValid: true, exclusionReason: "too-early" };
  if (nowTime > completedAt + ACTION_FEEDBACK_MAX_DELAY_MS) return { ...result, timingValid: true, exclusionReason: "too-late" };

  const contextChanged = Boolean(
    completion?.contextAfter?.id && currentRecord?.id && completion.contextAfter.id !== currentRecord.id
  );
  const alreadyRecorded = Array.isArray(feedbackEvents) && feedbackEvents.some((event) => (
    event?.eventType === "outcome-feedback" && event.feedbackCompletionEventId === completion?.id
  ));
  const completionRisk = { riskCode: completion?.riskCode, riskMode: completion?.riskMode };
  const syntheticData = completion?.feedbackContext?.dataMode && completion.feedbackContext.dataMode !== "real-trial";

  if (outcome === "skipped") return { ...result, timingValid: true, exclusionReason: "skipped", contextChanged };
  if (alreadyRecorded) return { ...result, timingValid: true, exclusionReason: "duplicate", contextChanged };
  if (isHighRisk(completionRisk) || isHighRisk(currentRisk)) return { ...result, timingValid: true, exclusionReason: "high-risk", contextChanged };
  if (isInsufficient(completionRisk) || isInsufficient(currentRisk)) return { ...result, timingValid: true, exclusionReason: "insufficient-data", contextChanged };
  if (syntheticData) return { ...result, timingValid: true, exclusionReason: "synthetic-data", contextChanged };
  if (contextChanged) return { ...result, timingValid: true, exclusionReason: "context-changed", contextChanged };
  if (!["better", "same", "worse"].includes(outcome)) return { ...result, timingValid: true, exclusionReason: "skipped", contextChanged };

  return { ...result, eligible: true, timingValid: true, exclusionReason: undefined, contextChanged: false };
}
