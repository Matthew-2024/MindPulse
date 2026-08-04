# MindPulse Release Gate Audit: 2026-08-04

## Scope and Decision Rule

This audit covers the remaining release gates from Phases 23, 25, 26, and 27. A local test, a source template, a screenshot, or a plan document is not substituted for a deployment, a real participant, or a professional review. The canonical product remains the React/Vite application.

## Evidence Matrix

| Gate | Current status | Authoritative local evidence | What is still required before it can close |
|---|---|---|---|
| Encrypted continuity client contract | Local contract passed | `tests/encrypted-continuity.test.ts`; `src/domain/encrypted-continuity.ts`; `src/domain/continuity-manifest-store.ts` | A reviewed authenticated transport, real WebAuthn PRF ceremony, and deployed two-device recovery/conflict/delete exercise |
| Continuity server template safeguards | Source contract, static Deno type check, and mocked revoke-device behavior passed; runtime unverified | `supabase/migrations/20260618_mindpulse_secure_sync.sql`; `supabase/functions/`; `supabase/config.toml`; `tests/supabase-security-contract.js`; `tests/supabase-device-revocation-contract.js`; `supabase/functions/revoke-device/handler.test.ts` | Configured Supabase secrets and allowlist, live Deno request checks, real mail delivery/rate-limit tests, deployment security review |
| Campus operations privacy boundary | Local MVP plus deployable source contract passed; runtime unverified | `src/domain/resource-operations.ts`; `src/domain/resource-operation-store.ts`; `supabase/migrations/20260804_resource_operations_tenant_boundary.sql`; `supabase/functions/resource-admin/`; `tests/resource-operations.test.ts`; `tests/resource-operations-server-contract.js`; `tests/react-resource-admin-smoke.js` | Deploy authenticated server-side roles and tenant isolation, create verified operator memberships, perform a deployed export audit, and complete a resource-owner pilot |
| Canonical application regression | Local gate passed | `npm.cmd run preflight`; `output/regression-artifacts/mindpulse-0.1.0-2026-08-04T15-06-53-970Z.json` | A hosted CI run with the uploaded `preflight-regression-evidence` artifact |
| Dependency release gate | Open release blocker | `docs/dependency-security-status-2026-08-04.md` | Published supported remediation for the React Router advisory, or an explicit risk decision from the responsible release authority |
| Anonymous usability trial | Not started | `docs/匿名试用执行包.md`; `docs/user-study-evidence/README.md` are preparation materials only | 10-20 real anonymous participants over 3-5 days; complete consent, ledger, quotes, risk-event, and summary evidence |
| Professional review | Not started | `docs/专业审核执行包.md`; `docs/professional-review-evidence/README.md` are preparation materials only | At least one qualified reviewer, material-version record, review issues, fix log, permission note, and post-fix verification |
| Release freeze | Not eligible | Earlier local freeze and current regression artifacts | Freeze only after every release-blocking gate above has authoritative evidence and the release authority approves the limitation statement |

## Preconditions Not Present in This Workspace

- No system Deno executable, Supabase CLI, or configured project credentials are available, so Function deployment and runtime behavior cannot be verified here. A temporary `npx deno` invocation can typecheck source and run mocked behavior tests, but cannot supply deployment or live-request evidence.
- No usable Git worktree or remote repository is available, so a hosted CI run cannot be inspected or triggered from this checkout.
- No real participant records, consent decisions, or reviewer feedback are present. No synthetic data may be used to close either human-validation gate.
- No release authority has supplied an accepted risk decision for the unresolved React Router advisory.

## Closure Sequence

1. Provision the reviewed Supabase project, secrets, exact origin allowlist, mail provider, and Deno/Supabase runtime; deploy and test the continuity transport with two independent devices.
2. Implement and deploy authenticated tenant-scoped resource administration before treating campus operations as a backend capability.
3. Publish the repository, observe a hosted CI run, and retain the uploaded `preflight-regression-evidence` artifact.
4. Resolve the dependency advisory through an available patch or an authorized release decision.
5. Run the approved anonymous trial and professional review, record only the specified de-identified evidence, resolve blocking findings, and rerun the full preflight.
6. Create a new freeze only after the preceding gates are evidenced; retain limitations without diagnostic, efficacy, or approval claims beyond the evidence.

## Current Decision

The local product and source-level contracts are suitable for demonstration and further controlled preparation. They are not eligible for a network-hosted or externally validated release while any row in this matrix remains open.
