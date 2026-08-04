# Task Plan: 心晴 MindPulse 下一步产品与验证方案

## Goal
在 5 天硬截止前，把已有竞品调研和当前原型能力收缩为一套可演示、可答辩、可回归测试的最小产品闭环，并明确截止日后的延伸路线。

## Current Phase
Current active plan: Phase 23, Encrypted Cross-device Continuity. Phases 17-22 local engineering items are complete; Phase 23 has a tested local cryptographic contract but no reviewed production transport. Usability, professional approval, native-client delivery, and all later external validation remain open.
Phase 16: Five-Day Evidence, Regression & Freeze（P0 已实现，正在执行全量回归与冻结）

## Phases

### Phase 1: Requirements & Discovery
- [x] 明确用户需要的是基于调研的下一步行动方案
- [x] 读取已有竞品研究报告
- [x] 梳理当前 Safety Gate、个人基线、求助草稿和资源配置实现
- [x] 将已有发现写入 findings.md
- **Status:** complete

### Phase 2: Planning & Structure
- [x] 确定产品主目标和非目标
- [x] 按 P0/P1/P2 排列功能与验证任务
- [x] 定义 30/60/90 天交付物和负责人边界
- **Status:** complete

### Phase 3: Plan Document
- [x] 写入正式下一步方案文档
- [x] 明确用户试用、专业审核和安全回归测试方案
- **Status:** complete

### Phase 4: Verification & Delivery
- [x] 检查方案与当前代码结构、现有报告保持一致
- [x] 更新进度记录和错误记录
- [x] 向用户交付文档路径和关键决策摘要
- **Status:** complete

### Phase 5: Five-Day Deadline Replan
- [x] 将正式方案重排为 5 天冲刺版本
- [x] 明确截止日前必须交付和明确延期的内容
- [x] 更新日程、验收标准和进度记录
- **Status:** complete

### Phase 6: Local Bottle Demo
- [x] 实现本机漂流瓶页面：投放、随机捞取、匿名回应
- [x] 增加本机隐藏/举报边界，并接入档案清理
- [x] 接入 `/bottle` 路由和首页入口，不增加底部导航项
- [x] 增加仓储测试和 React 浏览器 Smoke，覆盖双击、持久化、响应式与高风险跳转
- **Status:** complete

## Key Questions
1. 心晴下一阶段应该验证什么核心价值，而不是继续堆叠哪些功能？
2. 如何把 Safety Gate、个人基线和校园求助桥做成可演示、可测试、可迭代的产品闭环？
3. 哪些数据和功能必须明确禁止，避免产品滑向诊断、监控或自动上报？

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 以“早期觉察与求助转接”作为主目标 | 情绪记录、AI 陪伴和内容资源已有大量成熟竞品，心晴需要验证中间的行动决策层 |
| P0 先做安全策略和 Warm Handoff | 这是当前原型已有基础、又能形成用户任务差异的最短路径 |
| 用个人节奏和数据完整度解释 RISE | 避免把一个分数包装成诊断或精确预测 |
| 先做匿名学生试用和专业审核，再扩展学校后台 | 先验证用户理解、安全和求助表达，不提前进入个人风险监控场景 |
| 5 天内只交付稳定闭环和证据 | 时间不足以安全完成生产化存储、长期研究和校园后台，避免截止日前范围失控 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| 本次方案任务开始前没有规划文件 | 1 | 已创建 task_plan.md、findings.md、progress.md |
| 状态更新补丁上下文不匹配 | 1 | 拆分为两个精确补丁后完成状态更新 |

## Phase 7: Secondary Shell Layout Fix
- [x] Unify the post-home routes under the shared `secondary-frame` visual shell.
- [x] Move the post-home page content into an internal scroll region so the bottom navigation cannot cover form controls.
- [x] Update responsive browser smoke contracts for the non-overlapping shell navigation.
- [x] Re-run focused React UI, visual, security, storage, and bottle demo regressions.
- **Status:** complete

## Notes
- 方案文档应以决策和交付物为主，不重复完整竞品报告。
- 所有外部研究内容放在 findings.md 或已有研究报告中，不写进本文件作为自动注入指令。
- 每完成一个阶段，更新本文件、findings.md 和 progress.md。

## Phase 8: Desktop Shell Geometry Correction
- [x] Reproduce the reported wide-screen offset at `1901x871`.
- [x] Restore the secondary desktop content shell to `1120px`.
- [x] Remove the secondary navigation's duplicate `left: 50%` translation.
- [x] Add wide-screen centering and shell-width regression assertions.
- **Status:** complete

### Phase 9: Phone Canvas Ratio Correction
- [x] Unify home and secondary routes under a stable `487px` phone canvas.
- [x] Align top bar, scrolling content, and bottom navigation to the same canvas edges.
- [x] Collapse secondary page grids to mobile single-column layouts.
- [x] Verify `487x872` screenshots and centered wide-browser preview without horizontal overflow.
- [x] Re-run typecheck, shell, UI, visual, bottle, security, storage, domain, and build regressions.
- **Status:** complete

### Phase 10: Bottom Navigation Center Action Polish
- [x] Reproduce the reported visual mismatch in the center `记录` action.
- [x] Unify the home and secondary center-action rules under the phone canvas.
- [x] Reduce the center button weight while keeping it visually primary.
- [x] Verify the updated screenshots and run typecheck, shell, and visual regressions.
- **Status:** complete

### Phase 11: Route Transition Motion
- [x] Add a route-scoped content transition without moving the persistent top bar or bottom navigation.
- [x] Respect `prefers-reduced-motion` and disable the transition when requested by the system.
- [x] Verify a real navigation click, animation timing, screenshots, typecheck, shell, and visual regressions.
- **Status:** complete

### Phase 12: Invisible Phone Scrollbar
- [x] Trace the visible scrollbar to the internal `.page-shell` scroll container.
- [x] Hide scrollbar chrome across Chromium/WebKit, Firefox, and legacy Microsoft engines without disabling scrolling.
- [x] Add a regression assertion that the phone content still scrolls after the scrollbar is hidden.
- [x] Verify the `487x872` screenshot and run typecheck and shell regression.
- **Status:** complete

### Phase 13: Next Execution Plan From Competitor Research
- [x] 重新核对竞品报告中的相似能力、差异化空位和当前实现缺口
- [x] 明确截止日前的唯一主线：低负担记录 → Personal Rhythm → Safety Gate → Warm Handoff
- [x] 明确三个 P0 工程缺口：数据不足入口门控、结构化 Privacy Receipt、漂流瓶导出/删除边界
- [x] 写入按天排程、分工、验收标准、测试矩阵、演示脚本和截止日后路线
- **Status:** complete

## Phase 9 Error Log
| Error | Attempt | Resolution |
|-------|---------|------------|
| PowerShell inline diff command used an invalid multi-path form | 1 | Re-ran file reads and used targeted patches |
| Inline Node command quoting removed module string literals | 1 | Switched to a PowerShell here-string passed to Node |
| First Phase 9 documentation patch context did not match current file placement | 1 | Read exact file tails and appended targeted patches |

## Phase 13 Decisions
| Decision | Rationale |
|---|---|
| 不再继续扩展 AI 聊天、内容库或真实社区 | 竞品已覆盖这些方向，5 天内无法形成可防守差异 |
| 将“数据不足”纳入漂流瓶和普通互动入口门控 | 只拦截高风险不足以证明三态安全策略完整 |
| 将 Privacy Receipt 从页面文案升级为结构化事件 | 用户控制权需要可展示、可测试、可导出的证据 |
| 将漂流瓶导出和删除边界纳入 P0 | 漂流瓶虽是 Demo，但仍产生本机匿名数据，必须可控 |
| 截止日验收以理解度和可复现性为核心 | 竞品功能数量不是心晴当前的竞争优势 |

## Phase 13 Errors Encountered
| Error | Attempt | Resolution |
|---|---|---|
| 旧规划文件的阶段顺序已增加到 Phase 12，初次补丁锚点不匹配 | 1 | 读取实际文件尾部，新增 Phase 13，不覆盖既有阶段记录 |

### Phase 14: Previous Phone UI Closure
- [x] Confirm the shared phone canvas remains `487px` on home and secondary routes.
- [x] Confirm bottom navigation stays in its own shell row and does not cover page content.
- [x] Confirm route transitions and hidden phone scrollbars preserve usable scrolling.
- [x] Re-run phone UI, visual, security, storage, decision, domain, typecheck, and build regressions.
- **Status:** complete

## Current Session Boundary
- The previous layout work is closed and verified.
- The score-availability change is now implemented as a provisional reference index with explicit empty/partial/full semantics.

### Phase 15: P0 Execution Evidence Closure
- [x] Add empty/partial/full reference-index assertions to profile, parity, and React decision tests.
- [x] Rebuild the browser rules engine so Node and browser blocked-action sets remain aligned.
- [x] Extend browser bottle smoke through throw → reply → export → delete → local-key cleanup.
- [x] Remove current-profile replies written under another bottle owner's local key during deletion.
- [x] Create the state matrix, Day 1 baseline, Privacy Receipt field definition, export example, deletion-key list, demo script, and user/professional review templates.
- [x] Re-capture stable 487x872 evidence screenshots after waiting for route animation completion.
- **Status:** complete

### Phase 16: Five-Day Regression & Freeze
- [x] Execute every regression command listed in `docs/心晴下一步执行计划_2026-08-02.md`, plus the new matrix, handoff, decision, parity, and evidence checks.
- [x] Record version, build time, test time, output summary, and known unfinished external evidence.
- [x] Copy source, `dist`, `docs`, and evidence into a dated freeze directory.
- [x] Generate and verify a read-only delivery archive with the non-production-encryption disclaimer.
- [x] Audit every plan completion gate; keep real-user walkthrough and professional review explicitly pending until real people complete them.
- **Status:** complete for all code/document/freeze work; external human validation remains pending.

## Phase 15/16 Error Log
| Error | Attempt | Resolution |
|---|---:|---|
| Warm Handoff export test timed out | 1 | Enabled `acceptDownloads` and moved export verification after the required safety reassessment path |
| Deep-link matrix waited for a redirect event that had already completed | 1 | Asserted the settled pathname with `waitForFunction` |
| Empty fixture restored synthetic data after clearing storage | 1 | Preserved `mindpulseReactVaultCleared=1` in the fixture |
| Node/browser high-risk blocked actions diverged | 1 | Regenerated `src/rules/browser-engine.js` from canonical modules |
| Screenshot captured route-transition mid-frame | 1 | Added a 450ms settled-frame wait to the evidence collector |
| Freeze regression service unavailable on port 5181 | 1 | Confirmed the dev service was on 5180; reran browser checks with `REACT_BASE_URL=http://127.0.0.1:5180` |
| Decision Smoke read a transient pre-commit view | 1 | Made the fixture self-contained and waited for all partial-score conditions before asserting |
| ZIP verification expected forward-slash entries on Windows | 1 | Verified actual backslash archive entries and regenerated the archive with final metadata |

## Phase 17: Innovation Program Baseline Reconciliation
- [x] Re-run the current React, domain, security, storage, accessibility, and self-audit checks before changing behavior.
- [x] Classify every previous finding as open, fixed, stale, or requires external validation; specifically re-check referenceScore semantics, phone-shell overlap, bottle deletion, and Warm Handoff export.
- [x] Declare React/Vite as the canonical product entry or document a separate legacy product boundary; do not maintain silent parity between two applications.
- [x] Create a release baseline with current build timestamp, test matrix, known failures, and explicit non-goals.
- **Status:** complete for current engineering baseline; Phase 18 and external validation remain open.
- **Exit gate:** every P0/P1 finding has an owner, reproduction case, expected behavior, and regression test.

## Phase 18: Safety and Data Semantics Closure
- [x] Fix the high-risk dead end: provide a verified default/fallback resource path, allow safe resource configuration without bypassing Safety Gate, and make every high-risk entry actionable offline.
- [x] Define the crisis reassessment lifecycle: trigger, hold, reassessment, release criteria, audit event, and expiry; test historical crisis text plus a later calm record.
- [x] Make score semantics explicit for empty, partial, and complete records; show referenceScore for partial data and never represent missing data as zero.
- [x] Separate intervention completion from intervention outcome; remove fixed score deltas from learning inputs until subjective feedback exists.
- [x] Add a single action-policy matrix covering every route, button, keyboard shortcut, and domain/API call.
- **Status:** complete for the current local/offline React product; verified resources, richer disclosure, and subjective feedback are extended in later phases.
- **Exit gate:** high-risk ordinary-action bypass rate is 0; no-resource and offline cases have a usable fallback; partial-score tests pass in Node, browser, and React.

## Phase 19: Innovation 1 + 6, Warm Handoff and Minimal Disclosure MVP
- [x] Define `ResourcePack`, `SupportResource`, `DisclosureReceipt`, verification status, region/campus scope, service hours, expiry, and fallback resources.
- [x] Implement client cache, schema validation, expiry handling, offline fallback, verified-resource ranking, and invalid-resource reporting as local domain contracts.
- [x] Extend HelpComposer receipt metadata with pack/resource/version/action/field information; edited body remains transient and is never persisted.
- [x] Add one-campus seed data with manual verification ownership and a 90-day review SLA.
- [x] Add resource publishing, verification, and invalidation interfaces behind an admin boundary; do not expose student records.
- **Status:** complete for the local MVP. The development-only review surface is isolated from the vault provider; production publishing remains unavailable pending authenticated server roles and tenant isolation.
- **Exit gate:** passed for the user-facing local MVP in `tests/react-resource-pack-smoke.js`: a high-risk user can call/copy/open a verified resource in a clean offline fixture and automatic external contact count remains 0.

## Phase 20: Innovation 2, Real N-of-1 Action Feedback
- [x] Add a post-action feedback event with outcome, burden, context, delay window, and optional note; keep it distinct from completion.
- [x] Ask for feedback after 10-30 minutes and allow skip; exclude high-risk, insufficient-data, and invalid-timing events from learning.
- [x] Require at least three valid safe pairs before ranking actions; expose sample count and confidence, not efficacy claims.
- [x] Test missing/duplicate feedback, clock drift, regression to the mean, and context changes.
- **Status:** complete for the local React MVP. Feedback notes remain in the local vault and are excluded from JSON export; real-world validity remains an external-validation question.
- **Exit gate:** recommendations change only from eligible paired feedback; fixed score deltas are removed from personalization.

## Phase 21: Innovation 4 + 5, Minimal Check-in and Dual Thresholds
- [x] Build an information-gain heuristic from data completeness, missing signals, risk uncertainty, and baseline readiness.
- [x] Ask one highest-value question at a time, always offer skip, and explain why the signal is requested.
- [x] Combine personal baseline deviation with absolute safety floors for sleep and repeated negative states; define conflict precedence.
- [x] Add natural-day report aggregation, explicit missing states, and date labels instead of zero-height missing bars.
- **Status:** engineering complete for the local React MVP. The usability-trial measurements in the exit gate remain external validation and are not claimed complete.
- **Exit gate:** time-to-first-useful-next-step, completion rate, false certainty rate, and threshold comprehension are measured in usability trials.

## Phase 22: Innovation 3 + 9, Policy SDK and Safety Red-Team Lab
- [x] Select one canonical policy implementation and generate browser/iOS adapters from it; remove silent duplicate rule edits.
- [x] Add policy package schema, version hash, golden cases, approval record, replay, diff, rollback, and decision-trace compatibility.
- [x] Expand cases for typos, quotes, metaphors, negation, mixed language, safe phrases, historical crisis text, and adversarial input.
- [x] Provide a local Rule Lab flow for old/new policy comparison and exportable review evidence.
- **Status:** complete for local React/Node/browser engineering. The iOS adapter remains a deterministic fixture contract, not a shipped native client; professional or production approval remains external work.
- **Exit gate:** same input and policy version produce the same decision across Node, browser, React, and iOS adapter fixtures.

## Phase 23: Innovation 7, Encrypted Cross-device Continuity
- [x] Threat-model device theft, XSS, malicious extensions, lost recovery codes, duplicate devices, and deletion requests.
  - [x] Implement the local client contract for key generation, recovery/passkey wrapping, AES-GCM encryption, manifest revision metadata, conditional writes, conflict handling, and hard-delete receipts.
  - [x] Add local bounds, opaque vault discovery, session revocation/logout, local manifest lifecycle cleanup, and account-deletion contract coverage.
  - [ ] Add an authenticated production transport with strict CORS/OTP rate limits, actual WebAuthn PRF enrollment, and deployed two-device validation.
- [x] Keep cloud data opaque and document the recovery failure path; do not enable sync by default before review.
  - **Status:** in progress. The local protocol has AES-GCM encryption, recovery/passkey-PRF wrapper contracts, bounded opaque snapshots, conditional revision conflict detection, session state, strict metadata-only manifest persistence, and hard-delete receipts, all covered by an in-memory opaque-transport fixture. A reviewed authenticated transport, actual WebAuthn PRF ceremony, CORS/OTP enforcement, and production two-device deployment are still required.
  - **Server-template hardening:** the checked-in Supabase functions now reject non-exact CORS origins and never log delivery-fallback verification codes. `test:supabase-security` is included in `preflight`; deployment/runtime proof remains external because this workspace has no configured Supabase project.
  - **Device-revocation hardening:** shared and combined server session checks now require an active matching device before authorizing a request. The checked-in `revoke-device` Edge Function validates the target UUID and account ownership, revokes the device and all of its active account sessions, and clears the caller cookie on self-revocation. Its handler is exercised against a local mocked Supabase REST boundary for another-device revoke, self-revoke, unowned target rejection, and request field rejection. `supabase/config.toml` disables platform JWT gating only for this function because it performs its own cookie-session authorization. Deployment, live runtime execution, and a real device test remain open.
  - **Local verification:** `npm.cmd run typecheck`, `npm.cmd run test:continuity` (7 tests), `npm.cmd run test:react:storage`, and `npm.cmd run preflight` passed on 2026-08-04 after the device-revocation behavior-test addition. An ephemeral `npx deno check --node-modules-dir=auto` typechecked all eight Edge Function entry points, while `npx deno test --node-modules-dir=auto --allow-env supabase/functions/revoke-device/handler.test.ts` passed all four mocked behavior cases without executing any real request. Latest local regression metadata: `output/regression-artifacts/mindpulse-0.1.0-2026-08-04T15-06-53-970Z.json` (`verification.status: passed`, 92 screenshot hashes).
  - **Exit gate:** two-device recovery, conflict, deletion, and zero-plaintext server tests pass against a reviewed production transport; failures do not silently lose local data.

## Phase 24: Innovation 8, Trusted Circle Support Loop
- [x] Model explicit invitation, scope, expiry, revocation, check-back status, and no-contact-import behavior.
- [x] Start with local reminder/text generation; do not add automatic messaging or contact discovery.
- [x] Test consent, recipient misunderstanding, revocation, expiry, and high-risk escalation.
- **Status:** complete for the local React MVP. Invitations are local metadata only; the app offers copy-only text and local check-back states, never contact discovery or automated delivery. Real recipient understanding and consent remain external validation.
- **Exit gate:** every external action requires an explicit user gesture and raw history is never shared by default.

## Phase 25: Innovation 10, Privacy-preserving Campus Operations
- [x] Define resource-health metrics with minimum sample thresholds and no student-level risk output.
- [x] Build local resource publication, verification, invalidation, service metadata review, and five-action-suppressed aggregate health review without opening a student vault.
  - [ ] Build authenticated admin publishing, stale-link workflows, and service-hours operations against a server-side tenant boundary.
  - [ ] Add role-based access, audit logs, tenant isolation, retention, and deletion policies.
  - [ ] Pilot with one campus resource owner before multi-campus rollout.
  - **Server source contract:** `supabase/migrations/20260804_resource_operations_tenant_boundary.sql` and `supabase/functions/resource-admin/` define an authenticated tenant membership boundary, resource-only metadata schema, publish/verify/invalidate lifecycle, 90-day aggregation, and five-action suppression. `supabase/config.toml` explicitly directs the platform to this Function's own Cookie-session authorization, and `test:resource-operations-server` guards both facts in `preflight`. It is not deployed and no operator membership or pilot has been created.
- **Exit gate:** admin reports contain only aggregated resource operations; export audit finds no raw note, identifier, or risk list.

## Phase 26: UX, Accessibility, Reliability and Test Gate Repair
- [x] Re-test 375x667, 430x932, 487x872, and desktop layouts; preserve already-closed shell fixes unless a current regression is reproduced.
- [x] Add route focus management, skip link, selection semantics, copy-failure status, and visible missing-data states.
- [x] Make `preflight` invoke canonical React UI/security/storage/decision tests; update stale self-audit contracts and allow A07/A08 to advance only with evidence.
- [x] Add deterministic storage isolation for current-vault read/write/export boundaries.
- [x] Generate a versioned, metadata-only regression artifact after a successful local preflight.
- [x] Add enforceable aggregate and per-file coverage thresholds for core policy modules.
- [ ] Capture evidence of an actual remote CI execution with its uploaded artifact.
- [ ] Resolve or obtain an explicitly authorized release decision for the currently unpatched React Router RSC advisory before any network-hosted release.
- **Local CI readiness:** `.github/workflows/preflight.yml` pins Deno 2.9.4, statically checks all Edge Function entry points, runs the `revoke-device` mocked behavior test, and uploads both `output/playwright` and `output/regression-artifacts` as `preflight-regression-evidence`; `tests/ci-workflow-contract.js` enforces that configuration in `verify` and `preflight`.
- **Exit gate:** no known product P0/P1 or unreviewed release-blocking dependency advisory; all canonical tests run in preflight; React accessibility smoke passes; failed checks block release.

## Phase 27: External Validation and Release
- [ ] Run 10-20 anonymous student trials over 3-5 days using existing consent and risk stop rules.
- [ ] Complete at least one professional review covering Safety Gate, crisis copy, resource handoff, privacy, and boundaries.
- [ ] Measure first useful next step, resource action time, field comprehension, feedback completion, privacy clarity, and adverse/safety events.
- [ ] Freeze only the tested canonical app, policy version, resource-pack version, docs, test output, and known limitations.
- **Release rule:** no claims of clinical validity, efficacy, diagnosis, crisis prediction, or professional approval without external evidence.

## Estimated Schedule and Staffing

### Recommended team
- 1 product/UX owner.
- 2 frontend/full-stack engineers.
- 1 backend/security engineer.
- 1 part-time psychology/safety reviewer.
- 1 part-time campus resource operator for Phase 19 and Phase 25.

### Parallel team schedule: 18-24 weeks
| Window | Main delivery |
|---|---|
| Weeks 1-2 | Phase 17 baseline reconciliation and Phase 18 P0 safety closure |
| Weeks 3-6 | Phase 19 Warm Handoff/minimal disclosure; start Phase 26 test-gate repair |
| Weeks 5-8 | Phase 20 N-of-1 feedback and Phase 21 minimal check-in/dual thresholds |
| Weeks 7-12 | Phase 22 Policy SDK and Red-Team Lab |
| Weeks 10-17 | Phase 23 encrypted continuity; Phase 24 Trusted Circle starts after consent model review |
| Weeks 14-20 | Phase 25 one-campus operations pilot |
| Weeks 20-24 | Phase 26 closure, Phase 27 external validation, freeze, and release decision |

### Single-engineer schedule
- Expect 32-44 weeks, excluding waiting time for professional review, campus coordination, and real-user recruitment.
- Do not compress Phase 18, Phase 22, or Phase 23 by reducing security or review gates.

## Innovation Dependency Order
1. Phase 17 baseline reconciliation.
2. Phase 18 safety/data closure.
3. Phase 19 Warm Handoff + minimal disclosure.
4. Phase 20 N-of-1 feedback and Phase 21 minimal check-in/dual thresholds.
5. Phase 22 Policy SDK/red-team lab.
6. Phase 23 encrypted continuity and Phase 24 Trusted Circle.
7. Phase 25 campus operations.
8. Phase 26 test/UX gate repair, then Phase 27 external validation and release.

## Innovation Plan Error Log
| Error | Attempt | Resolution |
|---|---:|---|
| Multi-file planning patch could not match a garbled findings.md tail line | 1 | Split updates by file and use stable ASCII headings as anchors |
| Could not remove a legacy garbled current-phase line by exact text match | 1 | Kept the historical line and added an explicit current active-plan line above it |
| Aggregate preflight exceeded the interactive shell's 60-second timeout | 1 | Re-ran it as a background process with captured output; all checks completed successfully |
| Phase 23 settings patch used garbled Chinese context from terminal output | 1 | Re-read the UTF-8 source with stable JSX anchors and applied a targeted patch |
| Phase 24 multi-file patch assumed a different package-script ordering | 1 | Re-read the exact script lines and split the test integration into targeted patches |
| Phase 24 security-test patch used garbled Chinese assertion context | 1 | Inserted the route guard assertion using stable ASCII URL-wait anchors |
| Phase 26 accessibility search regex was malformed by PowerShell quoting | 1 | Re-ran the search with simple keyword matching |
| Phase 26 focus test assumed effects run once | 1 | Tracked actual pathname changes so React Strict Mode does not focus main content on initial mount |
| Phase 26 parallel verification command had a JavaScript string syntax error | 1 | Reissued the command with valid source; no project command ran in the failed attempt |
| Phase 26 copy-status patch used a Chinese JSX context anchor | 1 | Split the patch into ASCII-only code anchors, then corrected the nested fallback error branch |
| Phase 25 operations patch used a garbled Chinese test-button anchor | 1 | Split the patch into ASCII-only source and assertion anchors; no partial patch was applied |
| Temporary preflight-log cleanup was rejected by the execution policy | 1 | Kept the local `.preflight-20260804.log`; it contains only command output and does not affect the verified result |
| Parallel coverage commands shared a reports directory and produced a false per-file failure | 1 | Run coverage gates serially, as `preflight` does; both gates then passed with the same baseline |
| `npm audit fix` reached the newest stable React Router DOM but left a newer RSC advisory | 1 | Recorded it as a release blocker: `react-router@8.3.0` exists, but no compatible `react-router-dom@8.3.0` is published and dry-run audit fix does not resolve the advisory |
| Phase 18 rule fixture still used fixed score deltas for adaptive learning | 1 | Replaced the fixture with explicit subjective outcome events and added a completion-event exclusion assertion |
| Canonical React decision smoke asserted Check-in content before route rendering settled | 1 | Added a condition-based wait for the rendered Check-in text after URL settlement |

## Final Deliverable State

- **Engineering, documentation, screenshots, build, regression log, freeze directory, and read-only archive:** complete.
- **Frozen directory:** `output/freeze-2026-08-02/`.
- **Frozen archive:** `output/MindPulse-freeze-2026-08-02.zip` (read-only; SHA-256 `E75DDD1AFD63881AFB17F9B94B836B2747214411C0C95FA20263D356929E27C8`).
- **External work that cannot be claimed complete without real people:** three participant walkthroughs and one professional review. Templates, stop rules, and acceptance forms are ready in `docs/`; no fabricated outcome has been recorded.

## 2026-08-04 Remaining-work Evidence Audit

- The workspace has no usable Git worktree or remote, so the checked-in GitHub Actions workflow cannot provide observed remote-CI evidence from this checkout.
- The remaining Phase 23 transport, Phase 25 tenant backend, Phase 26 remote CI/dependency-release decision, and Phase 27 human/professional validation are separate external gates. Local automated evidence does not satisfy them.
- The Supabase Edge Function source can be typechecked and mocked locally through temporary Deno, but deployment and live runtime validation remain external because no configured project credentials or Supabase CLI are available.

## 2026-08-04 Execution Notes

| Error | Attempt | Resolution |
|---|---:|---|
| PowerShell parsed a quoted Supabase security regex as multiple `rg` paths | 1 | Use separate simple keyword scans; no project verification or source edit occurred in the failed command. |
| PowerShell altered a grouped Supabase session regex before `rg` received it | 1 | Re-run targeted simple-keyword reads; no project verification or source edit occurred in the failed command. |

## 2026-08-04 Release Gate Audit

- Requirement-by-requirement evidence and closure prerequisites are recorded in `docs/release-gate-audit-2026-08-04.md`.
- Local evidence is sufficient only for the completed implementation rows. Production transport, tenant backend, remote CI, dependency release decision, and human/professional validation remain explicitly open.
