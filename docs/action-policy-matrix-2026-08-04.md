# MindPulse Action Policy Matrix: 2026-08-04

This is the canonical interaction policy for the React/Vite product. A route or button may render only when its decision state allows it; direct domain calls remain guarded even if a UI control is bypassed.

## Decision states

| State | Allowed product action | Blocked product actions | Required outcome |
|---|---|---|---|
| `high` / `help` | `help` and explicit user-selected resource or draft actions | Companion, bottle, ordinary interventions, self-check, check-in except explicit reassessment | Help page remains the only ordinary route; no automatic contact |
| `insufficient` / `ask` | `checkin` | Companion, bottle, ordinary interventions, self-check, ordinary help shortcut | Ask for the next missing record; do not show a precise complete-state score |
| `normal`, `medium`, or `stable` with a ready baseline | State review, reports, check-in, Companion, bottle, and allowed low-burden actions | Only actions listed in the decision trace as blocked | Show evidence and keep the user in control |
| `reassessment-open` | A new check-in record | Ordinary actions remain blocked until that record is evaluated | A later calm record may release the hold with a cutoff and audit event |

## Route and gesture matrix

| Route / control | User gesture | Domain or storage call | High-risk behavior | Insufficient-data behavior | Regression |
|---|---|---|---|---|---|
| `/` primary action | Click | Read current decision; navigate to Help, Check-in, or Companion | Navigate to `/help` | Navigate to `/checkin` | `tests/react-ui-smoke.js`, `tests/react-security-smoke.js`, `tests/react-decision-smoke.js` |
| `/` score evidence | Click | Open local evidence view | Evidence may be read; no ordinary action is started | Evidence may be read; score remains explicitly incomplete | `tests/react-ui-smoke.js` |
| `/` check-in entry | Click | Navigate to `/checkin` | Safety redirect keeps the user on Help unless reassessment is open | Allowed | `tests/react-decision-smoke.js`, `tests/safety-gate-matrix.test.ts` |
| Bottom navigation: Home, Reports, Help | Click or keyboard activation | React Router navigation | Home/Reports are prevented; Help remains available | Reports and Help remain available | `tests/react-security-smoke.js`, `tests/react-shell-style-smoke.js` |
| Bottom navigation: Companion | Click or keyboard activation | `canEnterCompanion` and route safety redirect | Prevented and remains on Help | Redirects to Check-in | `tests/safety-gate-smoke.js`, `tests/safety-gate-matrix.test.ts` |
| Bottom navigation: Check-in | Click or keyboard activation | Navigate to `/checkin` | Only explicit reassessment may use it | Allowed | `tests/react-decision-smoke.js` |
| `/checkin` save | Form submit / Enter | `addRecord`, `evaluateState`, safety lifecycle persistence | New crisis signal triggers/retains hold and routes to Help | Saves the missing signal and routes to Insight or Help | `tests/react-security-smoke.js`, `tests/react-decision-smoke.js` |
| `/checkin` skip | Click or keyboard activation | React Router navigation | Does not release a hold | Does not fabricate a record | `tests/react-ui-smoke.js` |
| `/help` resource links | Explicit click | `hotlineHrefFor`, `externalHrefFor` | Only valid, non-invalidated configured links render | Fallback remains visible | `tests/react-decision-smoke.js` |
| `/help` offline fallback | Read, then click draft anchor | `supportFallbackFor`, HelpComposer | No network, fake hotline, or automatic contact required | Same fallback is available | `tests/react-security-smoke.js`, `tests/evaluate-state.test.ts` |
| `/help` reassess | Click | `beginSafetyReassessment`, then `/checkin` | Requires a new record; does not clear history | Not shown | `tests/react-security-smoke.js`, `tests/evaluate-state.test.ts` |
| HelpComposer target/need/urgency | Click or keyboard activation | Local component state only | Allowed as explicit user-selected support drafting | Allowed when Help is opened | `tests/help-warm-handoff-smoke.js` |
| HelpComposer draft editing | Type / paste | Local component state; no body persistence | No outbound send | No outbound send | `tests/security-smoke.js`, `tests/help-warm-handoff-smoke.js` |
| HelpComposer copy | Click or keyboard activation | Clipboard API; `recordHelpEvent` stores metadata only | Explicit user gesture required | Explicit user gesture required | `tests/help-warm-handoff-smoke.js` |
| `/insight` scenario buttons | Click or keyboard activation | Local `evaluateState` simulation | Read-only simulation; no record write | Read-only simulation; incomplete state stays visible | `tests/react-decision-smoke.js`, `tests/react-visual-smoke.js` |
| `/companion` open | Route navigation | `canEnterCompanion` | Redirect to Help | Redirect to Check-in | `tests/safety-gate-matrix.test.ts` |
| `/companion` complete | Click or keyboard activation | `completeIntervention`, local vault write | Not rendered in high risk | Not rendered before baseline | `tests/react-ui-smoke.js`, `tests/decision-policy-tests.js` |
| `/companion` learning status | Read-only | `summarizeInterventionFeedback` | Completion events are excluded | No learning claim | `tests/profile-strategy-smoke.js`, `tests/decision-policy-tests.js` |
| `/reports` trend links | Click or keyboard activation | Read local records; navigate to Insight/Check-in | Read-only; no ordinary intervention | Missing days remain missing, not zero | `tests/react-ui-smoke.js`, `tests/react-visual-smoke.js` |
| `/bottle` throw/draw/reply | Click or keyboard activation | Local bottle repository | Route is blocked in high risk | Route is redirected to Check-in | `tests/react-bottle-smoke.js`, `tests/safety-gate-matrix.test.ts` |
| `/bottle` hide/report | Click or keyboard activation | Local hidden/report keys | No external report is sent | Same local boundary | `tests/react-bottle-smoke.js`, `tests/bottle-repository-tests.js` |
| `/settings` resource save | Form submit / Enter | `setHelpResources`, local vault write | Configures resources only; never bypasses Safety Gate | Allowed | `tests/react-decision-smoke.js`, `tests/react-ui-smoke.js` |
| `/settings` resource verification | Click or keyboard activation | Local verification status update | Invalid/stale resources cannot create links | Allowed | `tests/evaluate-state.test.ts`, `tests/react-decision-smoke.js` |
| `/settings` export | Click | Local JSON Blob download; bottle export | No automatic send | Export may show empty data explicitly | `tests/react-storage-smoke.js`, `tests/help-warm-handoff-smoke.js` |
| `/settings` reset demo | Click | `resetDemoData`, local vault write | Demo only; never overwrites external data | Restores local fixture | `tests/react-decision-smoke.js` |
| `/settings` clear local data | Confirm, then click | `clearLocalData`, IndexedDB delete, bottle cleanup | No remote deletion claim | Leaves a cleared empty fixture | `tests/react-storage-smoke.js`, `tests/react-bottle-smoke.js` |
| `/rules` fixture selector | Click or keyboard activation | Read-only `evaluateState` fixture evaluation | Demonstrates Help-only gate | Demonstrates Check-in gate | `tests/react-security-smoke.js` |
| External policy reference link | Explicit click | Browser navigation to public reference | No user data is sent by the app | Same | `tests/policy-basis-smoke.js` |

## Keyboard policy

The React product has no custom global keyboard shortcuts. Native controls provide the policy surface:

- Enter submits the Check-in and resource forms when focus is inside a form.
- Space or Enter activates focused buttons and links according to browser semantics.
- Tab and Shift+Tab move through visible controls; focus must remain visible.
- Escape is reserved for the existing dialog contract where a dialog is present; it does not release a Safety Hold or trigger an external action.
- No key opens an ordinary intervention, sends a draft, contacts a resource, or bypasses a route guard.

## Domain and storage guard list

| Call | Required guard |
|---|---|
| `evaluateState` | Must receive current records, hold, and reassessment options; its trace is authoritative for route/action decisions |
| `canStartAction` | Must be checked before ordinary action execution |
| `canEnterCompanion` | Must be checked before Companion renders |
| `addRecord` | Must evaluate the new record before persistence and update Safety Hold/events atomically |
| `completeIntervention` | Must reject high-risk and insufficient states; completion is not outcome feedback |
| `setHelpResources` | Must preserve local-only storage and resource verification state |
| `beginSafetyReassessment` | Must create an audit event and require a later record |
| `recordHelpEvent` | May store field/action metadata only; must not store edited draft body |
| `clearLocalData` | Must delete vault and current-profile bottle keys, including authored cross-owner replies |
| `supportFallbackFor` | Must return a usable local/offline path even when resources are empty, stale, or invalid |

## Matrix gate

The matrix is satisfied for the current React implementation when `npm.cmd run test:react:canonical`, `npm.cmd run test:domain`, `npm.cmd run test:profile`, `npm.cmd run test:parity`, and `npm.cmd run test:policy` pass. The legacy standalone checks remain available under `test:legacy:*` and are not release gates for the canonical React product. New routes, controls, keyboard interactions, or domain calls must add a row and a focused regression before release evidence is updated.
