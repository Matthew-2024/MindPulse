import { defineConfig } from "vitest/config";

const corePolicyTests = [
  "tests/evaluate-state.test.ts",
  "tests/resource-pack.test.ts",
  "tests/intervention-feedback.test.ts",
  "tests/phase21.test.ts",
  "tests/policy-sdk.test.ts",
  "tests/policy-registry.test.ts",
  "tests/encrypted-continuity.test.ts",
  "tests/trusted-circle.test.ts",
  "tests/resource-operations.test.ts"
];

export const corePolicyCoverageTests = corePolicyTests;

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text"],
      reportsDirectory: "output/core-policy-coverage",
      include: [
        "src/domain/evaluate-state.ts",
        "src/rules/policy-sdk.js",
        "src/rules/risk-assessment.js",
        "src/rules/recommendation.js",
        "src/rules/personalization.js",
        "src/rules/recovery-score.js",
        "src/rules/signals.js",
        "src/rules/minimal-checkin.js",
        "src/rules/intervention-feedback.js"
      ],
      exclude: ["**/output/**"],
      excludeAfterRemap: true,
      thresholds: {
        statements: 85,
        branches: 75,
        functions: 90,
        lines: 90
      }
    }
  }
});
