# Policy SDK Baseline

## Canonical Core

`src/rules/policy-sdk.js` is the versioned policy-core contract. It calls only the canonical signal, risk-assessment, and recommendation modules and emits a limited deterministic decision payload:

- policy id, version, and FNV-1a package hash;
- risk code and mode;
- allowed and blocked actions;
- recommended path; and
- policy evidence.

The payload intentionally excludes vault data, free-form notes beyond the evaluated input, personalization, and UI state.

## Current Adapters

- Node imports `evaluatePolicyCore()` directly.
- The browser engine is generated from the same source modules and exposes `MindPulseRules.evaluatePolicyCore()`.
- The current iOS fixture adapter is `evaluateIosPolicyCore()`; it is a deterministic contract adapter, not a shipped native client.

`tests/policy-sdk.test.ts` replays golden inputs across all three. Cases include ordinary, incomplete, crisis, repeated negative, quoted, negated, mixed-language, safe-phrase, and historical-crisis text.

## Remaining Phase 22 Work

- approval records and signature ownership;
- persisted replay/diff and rollback records;
- a Rule Lab old/new comparison surface and exportable review artifact; and
- a production native iOS adapter implementation.
