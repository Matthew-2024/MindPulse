import { describe, expect, it } from "vitest";
import { approvePolicyRelease, BASELINE_POLICY_RELEASE, diffPolicyReplays, POLICY_RELEASE_HISTORY_KEY, readPolicyReleaseHistory, replayGoldenCases, rollbackPolicyRelease, validatePolicyRelease, writePolicyReviewSnapshot } from "../src/domain/policy-registry.js";

function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem(key: string) { return values.get(key) || null; }, setItem(key: string, value: string) { values.set(key, value); } };
}

describe("policy release registry", () => {
  it("requires an explicit approver before a local package is approved", () => {
    expect(validatePolicyRelease(BASELINE_POLICY_RELEASE).valid).toBe(true);
    expect(() => approvePolicyRelease(BASELINE_POLICY_RELEASE, {})).toThrow("POLICY_RELEASE_INVALID");
    const approved = approvePolicyRelease(BASELINE_POLICY_RELEASE, { approvedBy: "safety-reviewer", approvedAt: "2026-08-04T10:00:00.000Z", approvalNote: "golden cases reviewed" });
    expect(approved.status).toBe("approved");
    expect(rollbackPolicyRelease([approved], approved.releaseId).status).toBe("rolled-back");
  });

  it("replays and diffs deterministic golden decisions", () => {
    const cases = [{ id: "safe", records: [{ mood: "calm", sleepHours: 7, steps: 6000, socialScore: 60 }] }, { id: "help", records: [{ mood: "sad", note: "我想从这个世界上消失" }] }];
    const previous = replayGoldenCases(cases);
    const next = replayGoldenCases(cases);
    expect(diffPolicyReplays(previous, next).every((item) => !item.changed)).toBe(true);
    expect(diffPolicyReplays(previous, [{ ...next[0], decision: { ...next[0].decision, mode: "help" } }, next[1]])[0].changed).toBe(true);
  });

  it("stores only release metadata and replay summaries outside the vault", () => {
    const storage = memoryStorage();
    const replay = replayGoldenCases([{ id: "safe", records: [{ mood: "calm" }] }]);
    const history = writePolicyReviewSnapshot(storage, BASELINE_POLICY_RELEASE, replay, "2026-08-04T10:00:00.000Z");
    expect(history).toHaveLength(1);
    expect(readPolicyReleaseHistory(storage)[0].replaySummary).toEqual({ caseCount: 1, decisionIds: ["safe"] });
    expect(readPolicyReleaseHistory(storage)[0].replay[0]).toMatchObject({ id: "safe", decision: { policyId: "mindpulse-safety-core" } });
    expect(storage.getItem(POLICY_RELEASE_HISTORY_KEY)).not.toContain("vault_");
  });
});
