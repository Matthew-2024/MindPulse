# Real N-of-1 Feedback Policy

## Local Contract

- A completion event records that an ordinary action was finished. It is never a learning event.
- A feedback event must reference one completion event and records a subjective outcome, optional burden, bounded local note, feedback timing, and local context.
- The feedback prompt opens 10 minutes after completion and closes 30 minutes after completion. Users can skip without penalty.
- A feedback event is excluded from learning when the completion or current decision is high risk or data-insufficient, the timing is too early or late, device time moves backward, the completion already has feedback, the context changed after completion, or the source is synthetic data.
- Optional notes remain in the local vault only and are deliberately omitted from JSON export.

## Ranking Rule

- Only eligible `better`, `same`, or `worse` feedback changes recommendation order.
- A specific action requires at least three eligible pairs before it receives a ranking boost.
- The interface exposes the pair count and a sample-stability label. It does not claim efficacy, causality, diagnosis, or treatment effect.

## Regression Coverage

- `tests/intervention-feedback.test.ts` covers missing feedback, duplicate feedback, delay boundaries, backward clock drift, high-risk/data-insufficient exclusion, context changes, and score-movement exclusion.
- `tests/profile-strategy-smoke.js` verifies only qualified feedback can form personalization.
- `tests/react-ui-smoke.js` verifies the companion route presents delayed subjective feedback rather than an instant score-result claim.
