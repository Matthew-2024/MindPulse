import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { evaluatePolicyCore, evaluateIosPolicyCore, POLICY_PACKAGE, POLICY_PACKAGE_HASH } from "../src/rules/policy-sdk.js";

let evaluateState: typeof import("../src/domain/evaluate-state").evaluateState;

const fixtures = [
  { name: "ordinary", records: [{ mood: "calm", sleepHours: 7, steps: 6000, socialScore: 60 }] },
  { name: "insufficient", records: [{ mood: "calm" }] },
  { name: "crisis", records: [{ mood: "sad", sleepHours: 4, note: "我想从这个世界上消失" }] },
  { name: "repeated-negative", records: [{ mood: "sad" }, { mood: "anxious" }, { mood: "tired" }] },
  { name: "quoted-crisis", records: [{ mood: "calm", note: "他说：我不想活了" }] },
  { name: "negated-phrase", records: [{ mood: "calm", note: "我不是想自杀，只是今天很累" }] },
  { name: "mixed-language", records: [{ mood: "sad", note: "I want to disappear from this world" }] },
  { name: "safe-phrase", records: [{ mood: "calm", note: "不想活在别人的期待里，但我会继续完成今天的事" }] },
  { name: "historical-crisis", records: [{ mood: "sad", note: "我想从这个世界上消失", createdAt: "2020-01-01T00:00:00.000Z" }, { mood: "calm", note: "今天平稳", createdAt: "2026-08-04T12:00:00.000Z" }] }
];

describe("policy SDK adapters", () => {
  it("uses one versioned package and stable hash", () => {
    expect(POLICY_PACKAGE.id).toBe("mindpulse-safety-core");
    expect(POLICY_PACKAGE_HASH).toMatch(/^fnv1a-[0-9a-f]{8}$/);
  });

  it("replays identical core decisions in Node, browser, and iOS adapters", () => {
    const browserContext = { window: {} };
    runInNewContext(readFileSync("src/rules/browser-engine.js", "utf8"), browserContext);
    for (const fixture of fixtures) {
      const node = evaluatePolicyCore(fixture.records);
      const ios = evaluateIosPolicyCore(fixture.records);
      const browser = browserContext.window.MindPulseRules.evaluatePolicyCore(fixture.records);
      expect(ios).toEqual(node);
      expect(browser).toEqual(node);
    }
  });

  it("keeps the React evaluator aligned with the same package on representative fixtures", async () => {
    Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
    evaluateState ||= (await import("../src/domain/evaluate-state")).evaluateState;
    const reactFixtures = [
      { records: [{ mood: "calm" }] },
      { records: [{ mood: "sad", note: "我想从这个世界上消失" }] },
      { records: [{ mood: "calm", sleepHours: 7, steps: 6000, socialScore: 60 }, { mood: "calm", sleepHours: 7.2, steps: 6200, socialScore: 62 }, { mood: "happy", sleepHours: 7.1, steps: 6100, socialScore: 61 }] },
      { records: [{ mood: "sad" }, { mood: "anxious" }, { mood: "tired" }] }
    ];
    for (const fixture of reactFixtures) {
      const core = evaluatePolicyCore(fixture.records);
      const react = evaluateState(fixture.records);
      expect({ riskCode: react.risk.riskCode, mode: react.risk.mode, path: react.recommendation.path, policyVersion: react.trace.policyVersion }).toEqual({ riskCode: core.riskCode, mode: core.mode, path: core.path, policyVersion: core.policyVersion });
    }
  });
});
