# MindPulse Release Baseline: 2026-08-04

## Scope

This baseline covers the React/Vite release product and its local, offline-first demo behavior. The canonical entry is `src/main.tsx`; the standalone HTML application is retained as a legacy reference package and is excluded from release evidence.

## Build and verification timestamps

- Baseline date: 2026-08-04
- Runtime check: 2026-08-04 15:39:20 +08:00
- Production build artifact: `dist/index.html`, written 2026-08-04 15:34:34
- Browser verification target: `http://127.0.0.1:5180`
- Node.js: `v26.1.0`
- npm: `11.13.0`

## Test matrix

The complete `npm.cmd run preflight` completed successfully after the route-animation wait correction.

| Area | Command | Result | Evidence |
|---|---|---|---|
| Production build | `npm.cmd run build` | PASS | Vite production bundle generated |
| Type safety | `npm.cmd run typecheck` | PASS | TypeScript no-emit check |
| Copy safety | `npm.cmd run audit:copy` | PASS | No panic-amplifying, diagnostic, or cure-promising copy |
| Self audit | `npm.cmd run audit:self` | PASS | Canonical boundary and evidence consistency |
| Formal documents | `npm.cmd run audit:docx` | PASS | 9 formal docx files and 40 required concepts |
| Rules and parity | `npm.cmd run test:rules`, `npm.cmd run test:parity` | PASS | 20 rule/profile cases; 18 shared browser/Node cases |
| Domain models | `npm.cmd run test:domain` | PASS | Decision, memo, schedule, bottle, and PWA checks |
| Risk/profile policy | `npm.cmd run test:profile`, `npm.cmd run test:policy` | PASS | Missing-data, baseline, trace, and evidence boundaries |
| Security and Safety Gate | `npm.cmd run test:security`, `npm.cmd run test:safety`, `npm.cmd run test:react:security`, `npm.cmd run test:react:matrix` | PASS | High-risk ordinary actions remain blocked |
| Storage and deletion | `npm.cmd run test:storage`, `npm.cmd run test:react:storage`, `npm.cmd run test:react:bottle` | PASS | Export, confirmation, deletion, and bottle-key cleanup |
| Accessibility and shell | `npm.cmd run test:accessibility`, `npm.cmd run test:react:shell` | PASS | Dialog, focus, live region, touch targets, shell geometry |
| React product flows | `npm.cmd run test:react:canonical` | PASS | UI, shell, security, storage, decision, bottle, visual, handoff, matrix |
| Synthetic analysis | `npm.cmd run analyze:synthetic` | PASS | 30 synthetic records analyzed; output is demo evidence only |

## Findings reconciliation

| Finding | Status | Owner | Reproduction case | Expected behavior | Regression or evidence |
|---|---|---|---|---|---|
| High-risk ordinary-action bypass | Fixed | Safety policy owner | High-risk fixture, then direct companion/bottle/action entry | Redirect or remain on Help; no ordinary action opens | `tests/safety-gate-smoke.js`, `tests/react-security-smoke.js`, `tests/safety-gate-matrix.test.ts` |
| Crisis reassessment dead end | Fixed, lifecycle baseline added | Safety policy owner | Save crisis note, open reassessment, save later calm record | Historical note remains local; reassessment evaluates the new record, releases with cutoff and audit event | `tests/react-security-smoke.js`, `tests/evaluate-state.test.ts` |
| Partial/empty reference score ambiguity | Fixed | Domain/profile owner | Empty, partial, and complete records | Empty score is missing; partial data may show a reference score; no missing value becomes zero | `tests/profile-strategy-smoke.js`, `tests/react-decision-smoke.js`, `tests/rule-parity.js` |
| Phone-shell overlap and wide-screen offset | Fixed | UI shell owner | 375x667, 430x932, 487x872, and desktop routes | Content remains scrollable, centered, and clear of navigation | `tests/react-shell-style-smoke.js`, `tests/react-visual-smoke.js` |
| Bottle deletion and cross-owner reply cleanup | Fixed | Storage owner | Create, reply, export, delete, then inspect local keys | Current profile data and authored replies are removed; unrelated replies remain | `tests/bottle-repository-tests.js`, `tests/react-bottle-smoke.js`, `docs/本机数据删除键清单_2026-08-02.md` |
| Warm Handoff export boundary | Fixed for current MVP | Privacy/handoff owner | Create a help draft, export receipt, inspect downloaded JSON | Export contains structured receipt metadata, no outbound send, and no edited body persistence | `tests/help-warm-handoff-smoke.js`, `tests/react-storage-smoke.js` |
| No-resource and offline high-risk fallback | Open P0 | Safety/resource owner | High-risk fixture with empty or invalid resources and blocked network | User can immediately call, copy, or use a verified/fallback path offline | Phase 18 safety/resource tests; current gap is explicitly not release-complete |
| Fixed score deltas used as learning input | Open P1 | Personalization owner | Complete an action without subjective outcome feedback | Completion is recorded separately and cannot change ranking by a hard-coded delta | Phase 18 intervention-learning tests |
| Field-level minimal disclosure preview | Open P1 | Privacy/handoff owner | Edit a help draft and inspect preview/storage/export | User selects fields for one-time sharing; body is not persisted | Phase 19 handoff tests |
| Real-user and professional validation | Requires external validation | Product/research owner | Run approved walkthrough and professional review templates with real participants | Results are recorded without claiming completion in synthetic/demo evidence | `docs/user-study-evidence/`, `docs/professional-review-evidence/` |

## Known failures and limitations

- No automated check in this baseline is failing.
- The high-risk resource path is not yet release-complete when configured resources are absent, stale, invalid, or unavailable offline. This is the first Phase 18 implementation target.
- Synthetic records, screenshots, and local smoke tests do not count as real-user or professional validation.
- Legacy standalone HTML tests may describe the historical application contract. They are intentionally separate from `verify` and do not establish parity with the canonical React product.

## Explicit non-goals for this baseline

- No diagnosis, treatment, clinical risk claim, or replacement for professional care.
- No automatic external contact, automatic reporting, contact discovery, or background escalation.
- No cloud sync, cross-device recovery, production encryption, campus analytics, or admin publishing.
- No efficacy claim from synthetic records, intervention completion, or fixed score movement.
- No claim that real-user walkthroughs or professional review have occurred.

## Gate decision

Phase 17 engineering baseline is reproducible and passes. Phase 17 may close with the open P0/P1 items above carried into Phase 18 and Phase 19. The overall product goal remains open until the later safety, policy, privacy, reliability, and external-validation phases are complete.
