# Core Policy Coverage Gate

## Scope

The local coverage gate measures only the reviewed core-policy modules:

- `src/domain/evaluate-state.ts`
- `src/rules/policy-sdk.js`
- `src/rules/risk-assessment.js`
- `src/rules/recommendation.js`
- `src/rules/personalization.js`
- `src/rules/recovery-score.js`
- `src/rules/signals.js`
- `src/rules/minimal-checkin.js`
- `src/rules/intervention-feedback.js`

Generated browser adapters and frozen delivery copies are explicitly excluded. They are exercised through their own parity and browser checks, not double-counted as source coverage.

## Enforcement

`npm.cmd run preflight` runs both commands below before the canonical React suite:

```text
npm.cmd run test:coverage:core
npm.cmd run test:coverage:core:per-file
```

The aggregate gate requires at least 85% statements, 75% branches, 90% functions, and 90% lines. The per-file gate requires at least 70% statements, 65% branches, 60% functions, and 75% lines for every scoped module.

Vitest's V8 provider prints the report and exits nonzero when a threshold fails. JSON summary output is intentionally disabled because Windows paths with the project name can produce invalid backslash escapes in this provider's JSON file. The passing `preflight` result and the metadata-only regression artifact remain the release evidence.

## Boundary

This measures exercised implementation paths in the local test suite. It does not establish clinical validity, safety efficacy, real-user comprehension, professional approval, or remote CI execution.
