import { beforeAll, describe, expect, it } from "vitest";
import type { HelpResources, MindPulseRecord, SafetyHold } from "../src/domain/types";
import { resourceVerificationFor, supportFallbackFor } from "../src/domain/help-resources";

let evaluateState: typeof import("../src/domain/evaluate-state").evaluateState;
let canEnterCompanion: typeof import("../src/domain/evaluate-state").canEnterCompanion;
let assessRisk: typeof import("../src/rules/risk-assessment.js").assessRisk;

beforeAll(async () => {
  // The risk gate is a browser-only compatibility module. Give it the smallest
  // browser surface needed before loading the evaluator in Vitest's node runtime.
  Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
  const evaluator = await import("../src/domain/evaluate-state");
  evaluateState = evaluator.evaluateState;
  canEnterCompanion = evaluator.canEnterCompanion;
  assessRisk = (await import("../src/rules/risk-assessment.js")).assessRisk;
});

const completeRecord = (overrides: MindPulseRecord = {}): MindPulseRecord => ({
  mood: "calm",
  sleepHours: 8,
  steps: 8000,
  socialScore: 80,
  ...overrides
});

describe("decision data gates and trace evidence", () => {
  it("keeps a complete first record out of Companion until a personal baseline exists", () => {
    const decision = evaluateState([completeRecord()]);

    expect(decision.risk.mode).toBe("ask");
    expect(decision.risk.riskCode).toBe("insufficient");
    expect(decision.risk.allowedActions).toEqual(["checkin"]);
    expect(decision.recommendation.path).toEqual(["checkin"]);
    expect(canEnterCompanion(decision.risk)).toBe(false);
    expect(decision.trace.reasonCodes).toContain("DATA_INSUFFICIENT");
    expect(decision.trace.evidence.some((item) => item.includes("过往记录"))).toBe(true);
  });

  it("puts personal baseline deviation and its evidence in the decision trace", () => {
    const records = [
      completeRecord(),
      completeRecord({ sleepHours: 8.2, steps: 8200, socialScore: 82 }),
      completeRecord({ sleepHours: 5, steps: 3000, socialScore: 40 })
    ];
    const decision = evaluateState(records);

    expect(decision.baseline.baselineReady).toBe(true);
    expect(decision.trace.reasonCodes).toContain("BASELINE_DEVIATION");
    expect(decision.trace.evidence.some((item) => item.includes("睡眠低于个人基线"))).toBe(true);
    expect(decision.trace.evidence.some((item) => item.includes("活动低于个人基线"))).toBe(true);
  });

  it("lists missing current signals in the explanation chain", () => {
    const records = [
      completeRecord(),
      completeRecord({ mood: "happy" }),
      { mood: "tired" } satisfies MindPulseRecord
    ];
    const decision = evaluateState(records);

    expect(decision.risk.mode).toBe("ask");
    expect(decision.score.missingSignals).toEqual(["sleep", "steps", "social"]);
    expect(decision.trace.evidence.some((item) => item.includes("睡眠") && item.includes("活动") && item.includes("连接"))).toBe(true);
  });

  it("keeps historical crisis detection by default but releases it after an explicit reassessment cutoff", () => {
    const now = Date.now();
    const crisisAt = new Date(now - 60 * 60 * 1000).toISOString();
    const calmAt = new Date(now - 30 * 60 * 1000).toISOString();
    const crisis = completeRecord({ id: "crisis-1", createdAt: crisisAt, note: "我想从这个世界上消失" });
    const calm = completeRecord({ id: "reassessment-1", createdAt: calmAt, note: "我已经联系支持，现在重新记录当前状态" });
    const historicalRisk = assessRisk([crisis, calm], calm.note, { now });
    expect(historicalRisk.riskCode).toBe("high");

    const releasedHold: SafetyHold = {
      active: false,
      triggeredAt: crisisAt,
      triggerRecordId: crisis.id,
      triggerReason: "previous crisis signal",
      expiresAt: new Date(now + 6 * 24 * 60 * 60 * 1000).toISOString(),
      releasedAt: calmAt,
      releaseRecordId: calm.id
    };
    const reassessed = evaluateState([crisis, calm], "", [], {}, releasedHold, { now });
    expect(reassessed.risk.riskCode).not.toBe("high");
    expect(reassessed.trace.evidence.some((item) => item.includes("需要优先关注"))).toBe(false);
  });

  it("does not keep an expired safety hold active when the crisis history is outside its window", () => {
    const now = Date.now();
    const oldAt = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();
    const hold: SafetyHold = {
      active: true,
      triggeredAt: oldAt,
      triggerReason: "old crisis signal",
      expiresAt: new Date(now - 60 * 60 * 1000).toISOString()
    };
    const decision = evaluateState([completeRecord({ createdAt: oldAt, note: "我想从这个世界上消失" })], "", [], {}, hold, { now });
    expect(decision.risk.riskCode).not.toBe("high");
  });
});

describe("resource verification", () => {
  it("marks a resource last verified more than 90 days ago as stale", () => {
    const resources: HelpResources = {
      hotline: "12356",
      hotlineHours: "全天",
      resourceRegion: "上海",
      campusName: "示例大学",
      counselingCenter: "学生心理中心",
      counselor: "辅导员",
      campusLink: "https://example.edu/support",
      campusHours: "周一至周五 9:00-17:00",
      resourceVerifiedAt: "2020-01-01",
      resourceVerificationStatus: "verified",
      resourceVerificationActionAt: "2020-01-01T08:00:00.000Z",
      trustedContact: "朋友"
    };

    const verification = resourceVerificationFor(resources);

    expect(verification.status).toBe("stale");
    expect(verification.label).toBe("较久未核验");

    const changedWithoutReconfirmation = resourceVerificationFor({
      ...resources,
      resourceVerificationStatus: "unverified",
      resourceVerificationActionAt: ""
    });
    expect(changedWithoutReconfirmation.status).toBe("unverified");

    const fallback = supportFallbackFor({
      ...resources,
      hotline: "",
      campusLink: "",
      trustedContact: "",
      resourceVerificationStatus: "unverified",
      resourceVerifiedAt: "",
      resourceVerificationActionAt: ""
    });
    expect(fallback.id).toBe("offline-support-fallback");
    expect(fallback.steps.some((step) => step.includes("急救号码"))).toBe(true);
  });
});
