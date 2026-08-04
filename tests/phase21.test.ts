import { beforeAll, describe, expect, it } from "vitest";
import { aggregateNaturalDays } from "../src/domain/report-aggregation";
import { nextCheckinPrompt } from "../src/rules/minimal-checkin.js";
import { assessRisk } from "../src/rules/risk-assessment.js";

let evaluateState: typeof import("../src/domain/evaluate-state").evaluateState;

beforeAll(async () => {
  Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
  evaluateState = (await import("../src/domain/evaluate-state")).evaluateState;
});

describe("minimal check-in information gain", () => {
  it("asks one safety-relevant missing signal and makes skip advance to the next signal", () => {
    expect(nextCheckinPrompt([{}])?.signal).toBe("mood");
    expect(nextCheckinPrompt([{}], { skippedSignals: ["mood"] })?.signal).toBe("sleep");
    expect(nextCheckinPrompt([{ mood: "calm" }])?.signal).toBe("sleep");
  });
});

describe("dual thresholds", () => {
  it("keeps an absolute sleep floor above the cold-start data gate", () => {
    const risk = assessRisk([{ sleepHours: 4.4, signalPresence: { sleep: true } }]);
    expect(risk.riskCode).toBe("medium");
    expect(risk.evidence.some((item) => item.includes("4.5"))).toBe(true);
  });

  it("keeps repeated negative states above the cold-start data gate", () => {
    const records = ["sad", "anxious", "tired"].map((mood) => ({ mood, signalPresence: { mood: true } }));
    expect(assessRisk(records).riskCode).toBe("medium");
  });

  it("turns multiple personal-baseline deviations into medium attention without overriding a safety floor", () => {
    const records = [
      { mood: "calm", sleepHours: 8, steps: 8000, socialScore: 80, dataMode: "real-trial" as const },
      { mood: "calm", sleepHours: 7.8, steps: 7800, socialScore: 78, dataMode: "real-trial" as const },
      { mood: "calm", sleepHours: 5.5, steps: 3500, socialScore: 35, dataMode: "real-trial" as const }
    ];
    const decision = evaluateState(records);
    expect(decision.risk.riskCode).toBe("medium");
    expect(decision.risk.evidence.length).toBeGreaterThanOrEqual(2);
  });
});

describe("natural-day report aggregation", () => {
  it("groups same-day records and retains missing signals as missing rather than zero", () => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const earlier = new Date(now);
    earlier.setHours(8, 0, 0, 0);
    const reports = aggregateNaturalDays([
      { createdAt: earlier.toISOString(), sleepHours: 6 },
      { createdAt: now.toISOString(), sleepHours: 8 }
    ], now, 3);
    const today = reports.at(-1)!;
    expect(today.records).toHaveLength(2);
    expect(today.sleep).toEqual({ value: 7, state: "present" });
    expect(today.social).toEqual({ value: null, state: "missing" });
    expect(reports).toHaveLength(3);
    expect(reports[0].label).toMatch(/^\d+\/\d+$/);
  });
});
