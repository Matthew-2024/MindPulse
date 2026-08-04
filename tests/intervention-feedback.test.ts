import { describe, expect, it } from "vitest";
import { personalizeRecommendation, summarizeInterventionFeedback } from "../src/rules/personalization.js";
import { feedbackEligibilityFor, feedbackWindowFor } from "../src/rules/intervention-feedback.js";

const completedAt = "2026-08-04T10:00:00.000Z";
const feedbackAt = "2026-08-04T10:15:00.000Z";

function completion(overrides: Record<string, unknown> = {}) {
  return {
    id: "completion-1",
    interventionId: "journal",
    createdAt: completedAt,
    eventType: "completion",
    riskCode: "normal",
    riskMode: "action",
    contextAfter: { id: "record-1" },
    feedbackContext: { dataMode: "real-trial" },
    ...overrides
  };
}

function eligibleFeedback(index: number, outcome: "better" | "same" | "worse" = "better") {
  return {
    id: `feedback-${index}`,
    interventionId: "journal",
    eventType: "outcome-feedback",
    outcome,
    eligibleForLearning: true,
    feedbackTimingValid: true,
    feedbackCompletionEventId: `completion-${index}`,
    riskCode: "normal",
    riskMode: "action",
    feedbackContext: { dataMode: "real-trial" }
  };
}

describe("intervention outcome feedback eligibility", () => {
  it("opens only after ten minutes and closes after thirty", () => {
    const event = completion();
    expect(feedbackWindowFor(event)).toEqual({
      opensAt: "2026-08-04T10:10:00.000Z",
      closesAt: "2026-08-04T10:30:00.000Z"
    });
    expect(feedbackEligibilityFor({ completion: event, outcome: "better", now: "2026-08-04T10:09:59.999Z" }).exclusionReason).toBe("too-early");
    expect(feedbackEligibilityFor({ completion: event, outcome: "better", now: "2026-08-04T10:30:00.001Z" }).exclusionReason).toBe("too-late");
  });

  it("keeps missing feedback neutral and marks duplicate feedback ineligible", () => {
    const event = completion();
    expect(summarizeInterventionFeedback([])).toEqual({});
    expect(feedbackEligibilityFor({
      completion: event,
      outcome: "better",
      now: feedbackAt,
      feedbackEvents: [{ eventType: "outcome-feedback", feedbackCompletionEventId: event.id }]
    }).exclusionReason).toBe("duplicate");
  });

  it("rejects backward clock drift and any high-risk or insufficient-data feedback", () => {
    const event = completion();
    expect(feedbackEligibilityFor({ completion: event, outcome: "better", now: "2026-08-04T09:57:59.999Z" }).exclusionReason).toBe("clock-invalid");
    expect(feedbackEligibilityFor({ completion: event, outcome: "better", now: feedbackAt, currentRisk: { riskCode: "high", mode: "help" } }).exclusionReason).toBe("high-risk");
    expect(feedbackEligibilityFor({ completion: event, outcome: "better", now: feedbackAt, currentRisk: { riskCode: "insufficient", mode: "ask" } }).exclusionReason).toBe("insufficient-data");
  });

  it("excludes changed contexts and does not use score movement as outcome evidence", () => {
    const event = completion({ beforeScore: 20, afterScore: 95, delta: 75 });
    expect(feedbackEligibilityFor({
      completion: event,
      outcome: "better",
      now: feedbackAt,
      currentRecord: { id: "record-2" }
    }).exclusionReason).toBe("context-changed");

    const scoreMovementOnly = { ...event, eventType: "completion", eligibleForLearning: false };
    expect(summarizeInterventionFeedback([scoreMovementOnly])).toEqual({});
    const feedback = [eligibleFeedback(1, "same"), eligibleFeedback(2, "same"), eligibleFeedback(3, "better")];
    expect(summarizeInterventionFeedback(feedback).journal).toMatchObject({ count: 3, avgOutcome: 0.3, eligible: true, confidence: "medium" });
    expect(personalizeRecommendation(["breathe", "journal"], {}, feedback)[0]).toBe("journal");
  });
});
