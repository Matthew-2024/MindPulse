# Findings & Decisions

## Requirements
- 用户希望把竞品市场调研转化为“下一步怎么做”的具体方案。
- 方案需要能指导产品、研发、用户试用、专业审核和答辩表达。
- 方案应继承已有报告的证据边界，不把竞品官网未展示写成竞品绝对没有。
- 新增硬约束：当前只剩 5 天，截止日前目标必须从长期产品路线收缩为可演示、可答辩、可回归测试的最小闭环。

## Research Findings
- 情绪记录、趋势、相关性、多因素追踪、AI 陪伴、冥想音频、危机转介、真人倾听和心理咨询服务均已有成熟或快速发展的产品覆盖。
- 近期联网核验的代表产品包括 Daylio、Stoic、Bearable、MindDoc、Wysa、Youper、Headspace Ebb 和 7 Cups。
- Wysa、Youper、Headspace Ebb 已公开展示安全边界、危机转介、AI 限制或安全系统，因此“更安全”不能作为无证据的主张。
- 可防守的差异是把安全策略变成用户可见且不可绕过的执行层，并将个人基线、数据完整度、行动许可和求助表达连接成闭环。
- 校园 Warm Handoff 适合做中国高校本地化切入：联系人、服务时间、校内入口、资源核验状态、最小披露话术和主动发送控制。
- RISE 必须保持为可解释的个人状态观察指标，不是抑郁、焦虑或其他疾病诊断，也不证明干预疗效。

## Current Product Baseline
- 当前已有匿名状态记录：情绪、睡眠、精力、步数、连接感和备注。
- 当前已有个人基线、数据完整度、风险分层、Safety Gate、轻干预、求助草稿、校园资源配置、决策追踪和反馈学习基础。
- 关键实现位置：`src/domain/evaluate-state.ts`、`src/rules/risk-assessment.js`、`src/security/risk-gate.js`、`src/domain/types.ts`、`src/features/settings/SettingsPage.tsx`、`src/storage/vault-store.js`。
- 当前 Safety Gate 相关测试和类型检查已通过，方案重点应转向入口覆盖、真实理解度和资源可用性，而不是盲目增加规则数量。
- IndexedDB 不是加密存储，正式版还需要设备丢失、备份恢复、密钥和删除验证设计。
- `evaluateState()` 已统一执行个人基线、风险识别、Safety Hold、数据门控和推荐策略，并将 decisionId、reasonCodes、evidence、policyVersion、dataSource、confidence 写入 DecisionTrace。
- 当前高风险策略会把 allowedActions 收敛为 `help`，数据不足策略会把 allowedActions 收敛为 `checkin`；普通动作列表已集中在 `ORDINARY_ACTIONS`。
- 当前 `risk-gate.js` 能阻断普通 action、隐藏 self-check，并把高风险 companion 路由到 help；下一步仍需对所有页面、按钮、快捷入口和调用层做一次入口清单审计。
- `HelpDraftEvent` 已记录对象、需求、紧急程度、是否复制和是否包含状态摘要，但还没有独立的分享字段清单/预览结构，这是 Privacy Receipt 的主要补口。
- `HelpResources` 已有 verified/stale/unverified/invalid 状态、地区、服务时间和最近核验日期，下一步应把资源核验动作和失效兜底纳入试用验收。

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 采用 P0/P1/P2 交付顺序 | 先稳定安全闭环，再验证用户价值，最后扩展学校和研究能力 |
| 把“允许做什么/暂不建议做什么”作为核心界面 | 比单独显示 RISE 更能体现 Safety Gate 和行动决策价值 |
| 求助草稿默认最小披露且不自动发送 | 降低隐私和误报风险，保留用户控制权 |
| 用用户理解度、求助表达成本和动作完成率做早期指标 | 这些指标可在小样本试用中验证，不能越界替代临床疗效证据 |
| 5 天内只交付稳定闭环和证据，不做生产化扩张 | 5 天无法安全完成加密存储、校园后台、长期用户研究和完整专业治理；这些应放到截止日后 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| 部分外部网站无法在当前浏览器策略下实时打开 | 已在竞品报告中区分实时核验和此前公开资料，方案不依赖未核验事实 |

## Resources
- 竞品研究报告：`docs/竞品市场研究与创新策略报告_2026-07-31.md`
- 当前产品说明：`README.md`
- 策略编排：`src/domain/evaluate-state.ts`
- 风险识别：`src/rules/risk-assessment.js`
- 安全门控：`src/security/risk-gate.js`
- 求助资源设置：`src/features/settings/SettingsPage.tsx`
- 本地存储：`src/storage/vault-store.js`

## Visual/Browser Findings
- Daylio 当前公开页面强调两步记录、图表/相关性、目标/习惯、导出和本地隐私。
- Stoic 当前公开页面已把 AI 日记、引导反思、趋势、连续记录、呼吸练习和多设备使用组合在一起。
- Bearable 当前公开页面强调 30+ 报告、多因素相关性、健康实验、加密、导出和删除。
- MindDoc 当前公开页面展示每天最多三次问题、70+ 课程/练习、个性化反馈、EU MDR Class I Medical Device 和超过 1000 名参与者的临床研究自述。
- Wysa 当前公开页面强调匿名、人工监督、引导式转介、AI 不自行决策，并明确不用于危机或急诊。
- Youper 当前公开页面明确展示自伤/自杀表达检测、危机资源转介、内容防护、检测局限和 18 岁以上限制。
- Headspace Ebb 当前公开页面展示想法整理、个性化内容、安全系统、加密和用户主动分享控制，同时声明不实时人工监控。
- 7 Cups 当前公开页面展示 24/7 匿名倾听、支持群组、Noni AI、青少年支持和持证治疗服务。

## Visual Shell Findings
- The post-home routes shared the background and surface treatment but still used a viewport-fixed navigation bar over long forms.
- The overlap was visible in the check-in body rhythm section, help choices, and settings resource form, especially on 375px and 1024px viewports.
- The fix uses a three-row secondary app shell: top bar, internally scrolling page content, and an in-flow bottom navigation row. The home route keeps its existing primary shell.
- The mobile secondary top bar now uses the same pale green surface as the rest of the app instead of the unrelated iOS gray background.

## Desktop Geometry Correction
- At `1901x871`, the secondary content shell measured `980px` even though the desktop prototype uses the wider `1120px` composition.
- The secondary navigation still inherited `left: 50%` and `translateX(-50%)` after becoming a grid-row item. In a grid row this translated the already-centered `430px` navigation to the far right.
- The corrected contract is: secondary desktop shell width `1120px`, navigation width `430px`, and navigation center equal to the viewport center. Mobile keeps full-width content and navigation.

## Phone Canvas Ratio Correction
- The supplied reference is a phone app canvas of approximately `487x872`; the previous implementation mixed a `430px` home shell, a `1120px` secondary shell, and a `430px` navigation row.
- The stable contract is now `.phone-app { width: min(100%, 487px); max-width: 487px; }`, with topbar, page shell, and bottom navigation all occupying that same canvas.
- Secondary pages use internal scrolling and single-column grids at this canvas, so long forms do not overlap the navigation and do not widen the phone layout.
- Visual verification at `487x872` matched the reference structure: approximately `82px` home top bar, `493px` status region, survey card below it, and a full-width bottom navigation row.
- At `1901x871`, the app remains a centered `487px` phone preview with no horizontal overflow; the surrounding browser area is intentionally empty because the product target is mobile.

## Bottom Navigation Center Action Polish
- The supplied crop exposed a local visual mismatch rather than a layout offset: the center `记录` item used a 54px floating circle, a large shadow, and the same 47px top padding as an older desktop/mobile treatment.
- The four regular navigation labels already shared a baseline at `487x872`; the center label also had the correct baseline, but its oversized circle made the whole group feel detached.
- The phone-scoped correction keeps the center action primary with a 48px circle and 22px plus icon, uses a quieter solid accent, and reduces the shadow to match the calm bottom-nav surface.

## Route Transition Motion
- The shared `AppShell` is the correct ownership boundary for route motion because every page already renders inside the same shell and the top/bottom chrome should remain visually stable.
- The transition is scoped to a keyed content wrapper, using a short opacity plus 10px upward movement; it does not animate layout dimensions or the phone canvas.
- `prefers-reduced-motion: reduce` disables the animation entirely, and browser verification confirmed both normal and reduced-motion behavior.

## Invisible Phone Scrollbar
- The visible bar in the supplied screenshot came from the internal `.page-shell` element, which intentionally owns vertical scrolling because the phone shell keeps the top and bottom navigation fixed in its own rows.
- Hiding the scrollbar on `html` or disabling overflow would be incorrect; the fix is scoped to `.phone-app .page-shell` and `.page-shell-help`, preserving `overflow-y: auto` while hiding only the native scrollbar chrome.
- Browser verification confirmed the scrollbar is hidden in Chromium and the content still scrolls programmatically, with no horizontal overflow.

## Local Bottle Demo Findings
- 当前 React 应用原先没有漂流瓶页面或路由，但 `src/features/bottle/bottle-repository.js` 已提供本机仓储契约，可直接复用。
- Demo 采用本机 `localStorage`，明确显示“本机演示海域”和“未连接真实社区”；不接账号、私信、公开社区或真实用户数据。
- 页面提供投放、随机捞取、匿名回应、当前瓶子本地隐藏和本地举报；举报只写入当前设备并自动隐藏瓶子，不伪装成已发送给运营方。
- 高风险状态由既有 `SafetyRedirect` 和 `BottlePage` 双重阻断，进入 `/bottle` 会回到 `/help`，不绕过 Safety Gate。
- 快速双击投放/回应增加时间闸门，避免同步本地写入造成重复演示数据；刷新后自己的瓶子仍保留在本机。
- 真实多人版本仍需独立完成内容审核、举报处理、危机升级、未成年人保护、身份/隐私治理和社区运营，不能把本 Demo 直接当作上线社区。

## 2026-08-02 Execution Audit
- 竞品报告不要求继续复制竞品功能；最可防守的主线是“低负担记录 → 数据完整度 → Personal Rhythm → Safety Gate → Warm Handoff”。
- 当前代码审计发现：`BottlePage` 已阻断高风险，但数据不足状态仍需要纳入 `/bottle` 等普通互动入口的统一门控矩阵。
- 当前 `HelpComposer` 已有可见的分享前预览，但收据主要存在于文案和 `HelpDraftEvent` 的基础字段中，缺少 `decisionId`、`includedFields`、`excludedFields`、`sourceTypes`、`userEdited`、`copiedAt` 等结构化证据。
- 当前 `SettingsPage.exportRecords()` 导出状态记录和行动事件，但没有把自己的漂流瓶、可见回应和本机隐藏/举报边界纳入导出验收；需要补齐导出和删除测试。
- 当前页面视觉壳体、路由动画、漂流瓶 Demo、UI/安全/存储回归已完成；下一阶段不应再把视觉打磨误认为竞品差异化建设。
- 5 天计划的完成标准应从“功能页面存在”升级为“用户能说出两条依据、能区分三态、能指出分享/不分享字段、工程测试证明 0 绕过”。

## 2026-08-02 Previous UI Closure
- 上一轮手机端页面调整已通过实际浏览器验证，不再存在待收尾的壳层问题。
- `487x872` 下首页和后续页面共用同一手机画布；宽屏预览仍居中显示 `487px`，没有横向溢出。
- 底部导航是独立的 shell row，长表单和帮助页内容不会被覆盖；`.page-shell` 仍可滚动，只隐藏原生滚动条外观。
- 路由切换动画只作用于内容区，并保留 `prefers-reduced-motion` 关闭路径。
- 本轮没有修改 `ScoreSnapshot`、`InsightPage` 或任何分数计算逻辑；“暂不计算”仍作为下一项独立任务处理。

## 2026-08-02 Five-Day Execution Findings

- `referenceScore` 已在 Node 规则、浏览器规则引擎和 React 页面中形成同一契约：空记录为 `null`，部分记录按已填写信号归一化，完整记录才显示完整状态分；测试现在同时断言这三种情况。
- 规则 parity 首次补充字段断言时暴露了浏览器引擎没有同步最新的 `companion` / `bottle` 高风险阻断集合；使用 `npm.cmd run build:browser-engine` 从 canonical modules 生成后恢复一致。
- Warm Handoff 导出测试必须经过 `acceptDownloads: true`，且高风险页面不能直接打开设置；测试现在先走“已联系支持，重新评估”，再验证导出，不放宽高风险路由门控。
- 清理漂流瓶数据时，回应按瓶子所有者存储会让当前用户写给示例瓶的回应落在其他 owner 的键下；`clearOwnData` 现在按 `senderId` 扫描 `*:bottleReplies`，只删除当前用户写出的回应。
- 证据采集脚本必须等待 450ms 路由动画结束，否则部分/高风险截图会落在淡入中间帧，无法作为答辩截图。
- 计划要求的用户走查和专业审核属于外部真实活动；当前只生成执行模板、停止规则和验收字段，不能把合成 Fixture 或自动化测试写成参与者结果。

## 2026-08-04 Innovation Program Scope

- The current request authorizes planning, not implementation of product code.
- Start with current-code reconciliation because earlier records say referenceScore semantics, phone-shell overlap, bottle cleanup, and Warm Handoff export were changed in Phase 15/16. Re-test before treating them as open defects.
- P0 order remains actionable high-risk resources, crisis reassessment lifecycle, and one canonical policy path.
- Dependency order: Warm Handoff/Privacy Receipt -> real action feedback -> minimal check-in/dual thresholds -> Policy SDK/Red-Team -> encrypted continuity/Trusted Circle -> campus operations.
- External user research and professional review remain release gates. Synthetic fixtures and smoke tests prove reproducibility only.
- Non-goals: generic AI chat, public anonymous community, rankings, automatic outreach, diagnosis, crisis prediction, or efficacy claims.

## 2026-08-02 Freeze Audit Findings

- 最终浏览器测试端点为 `http://127.0.0.1:5180`。开始冻结时 `5181` 已不再监听；错误保留在回归日志中并在健康端点重新验证，不能把环境连接拒绝误记为产品失败。
- `react-decision-smoke` 暴露了测试需要自包含数据清理和等待 React 异步持久化/渲染完成的要求。修复后，该测试在最终回归中稳定通过。
- 日期冻结目录包含源码、测试、工具、`dist`、文档、回归日志、六张关键证据截图、冻结清单和元数据；归档 ZIP 已设为只读并核验 11 项关键条目。
- ZIP 的最终 SHA-256 不能同时作为 ZIP 内部自证字段（写入值会改变 ZIP 本身）。冻结元数据明确要求外部核验最终哈希；本次最终外部核验值记录在 `task_plan.md`、`progress.md` 和交付说明中。
- `docs/user-study-evidence/` 与 `docs/professional-review-evidence/` 目前只有 README/执行说明，未发现填好的真实参与者或审核记录。因此“真实走查”和“专业审核”保持待执行；工程冻结完成不等于这些外部活动完成。

## 2026-08-04 Phase 17 Baseline Inspection

- The active implementation entry is the React/Vite application under `src/`, with `package.json` exposing the canonical React test and build commands.
- Phase 17 is still unchecked in `task_plan.md`; no current-code reconciliation or release baseline has been recorded yet.
- The workspace contains a `.git` directory but no `.git/HEAD`, so Git history and status are unavailable as evidence for this session. File contents, test output, and generated artifacts must be treated as the authoritative current state.
- The current package scripts include separate Node/domain, browser-engine, React/Playwright, accessibility, storage, security, self-audit, and build checks. The first baseline run will use those existing contracts before behavior changes.
- Baseline results on 2026-08-04: `typecheck`, `test:domain`, `test:security`, `test:storage`, `test:accessibility`, `test:profile`, `test:parity`, and `test:policy` passed.
- `audit:self` failed before any behavior change. It reports stale expected phrases in `tests/ui-smoke.js` and `tests/demo-flow-smoke.js` (`mindpulse-records.json`, `exported.risk`, `exported.dailyReport`, `exported.weeklyReport`, `clearDialogMessage`, `afterClear.length === 0`, and an old `自动化规则测试：20 / 20` contract), plus a potentially unsafe phrase hit in `docs/PPT与答辩自查口径同步稿.md`.
- The self-audit failure is a release-gate finding, not evidence that the corresponding product behavior is broken. The next inspection must compare the audit contracts with current source and tests, then either update stale contracts or document a justified false positive.
- Inspection classifies the seven missing phrases in `tests/ui-smoke.js` and `tests/demo-flow-smoke.js` as legacy standalone-HTML contracts. They are not the React/Vite product entry and should not be used as a hidden parity requirement.
- The `临床验证` hit in `docs/PPT与答辩自查口径同步稿.md` is a false positive: it appears in a table column explicitly labeled as prohibited wording. The audit needs a table-aware/explicit allowed-context contract or a dedicated marker for this documented boundary.
- Phase 17 should make React/Vite the canonical product entry, keep the standalone HTML as an explicitly archived legacy reference if retained, and make the self-audit verify that boundary plus the current React contracts.
- Canonical React browser baseline: `test:react:ui`, `test:react:shell`, `test:react:storage`, `test:react:bottle`, `test:react:visual`, and `test:react:matrix` passed. `test:react:security`, `test:react:decision`, and `test:react:handoff` failed.
- `react-security-smoke.js` and `help-warm-handoff-smoke.js` both time out after saving the reassessment, not while opening `/checkin`. The `/help -> /checkin` transition is reproducibly successful. The actual dead end is that `assessRisk()` scans the original crisis note inside the seven-day history window; clearing `evaluationHold` during reassessment therefore still returns high risk and redirects back to `/help`.
- `react-decision-smoke.js` fails at the empty-state primary-action assertion in the full script, but a clean diagnostic using the same route, demo-context sequence, and role selector reaches `/checkin`. Treat this as an isolation/state-boundary issue until instrumentation identifies the differing state.
- A clean rerun of `test:react:decision` passed once after the diagnostic. The remaining decision failure is not yet a confirmed product defect; it needs repeat-run evidence and likely test isolation/timing hardening after the safety lifecycle fix.

---
*本文件保存研究与决策事实；新增发现后继续更新。*
## 2026-08-04 Phase 17 Baseline Closure

- The complete `npm.cmd run preflight` passed after the condition-based route-animation wait was added to `tests/react-decision-smoke.js`; no automated baseline check is currently failing.
- `docs/release-baseline-2026-08-04.md` records the build/runtime timestamps, canonical React test matrix, known limitations, explicit non-goals, and P0/P1 owner/reproduction/expected-behavior/regression mappings.
- Reconciliation result: referenceScore semantics, phone-shell geometry, bottle deletion, Warm Handoff export, high-risk ordinary-action blocking, and the crisis reassessment lifecycle are fixed and covered by current checks.
- Remaining engineering gaps are the verified/fallback resource path for no-resource and offline high-risk cases, separating intervention completion from outcome learning, and the richer field-level minimal-disclosure preview. These are carried into Phases 18 and 19.
- Real-user walkthroughs and professional review remain external validation requirements; synthetic records, screenshots, and smoke tests do not satisfy them.

## 2026-08-04 Phase 18 Closure

- High-risk Help now always renders `supportFallbackFor()` output with a local/offline action path. Empty, invalid, stale, and unavailable configured resources no longer leave the page without a usable next action; the app does not invent a hotline or perform automatic contact.
- Crisis lifecycle coverage remains explicit: trigger, active hold, reassessment-opened event, independent reassessment of the new record, released cutoff, and expiry are persisted and tested.
- Completion events now use `eventType: completion` and retain score movement only as session display data. Personalization ignores them; learning requires `eventType: outcome-feedback` plus a subjective `better`, `same`, or `worse` outcome.
- `docs/action-policy-matrix-2026-08-04.md` is the single route/control/keyboard/domain policy inventory for the current React product.
- Phase 18 verification: `npm.cmd run preflight` passed on 2026-08-04 after updating the P02 canonical fixture to use explicit outcomes.

## 2026-08-04 Phase 19 Initial Contracts

- Added `src/domain/resource-pack.ts` with `ResourcePack`, `SupportResource`, and `DisclosureReceipt` contracts, schema validation, 90-day review-date calculation, cache read/write, expiry handling, resource ranking, admin-only invalidation, and the demo-campus seed.
- The seed contains a verified local fallback and an explicitly unverified campus placeholder. It contains no fabricated hotline, URL, student record, or automatic contact behavior.
- HelpComposer receipts now include `resourcePackId`, `resourceId`, `resourceVersion`, and `action` metadata while retaining the existing included/excluded field lists. The edited draft is still not persisted.
- Remaining Phase 19 work is intentionally app-level: select and hydrate a cached ResourcePack in the Help UI, add a real admin publishing/verification interface with role boundary, and prove a verified resource can be called/opened/copied in a clean offline fixture.
- The local resource cache is now wired into the app store: hydrate after vault load, refresh after resource changes, and remove during local-data deletion. `tests/react-storage-smoke.js` verifies this lifecycle.
- `tests/react-resource-pack-smoke.js` proves the clean offline high-risk path: configure verified local hotline/campus resources, enter high risk by client-side navigation, retain call/campus/fallback/copy actions, and make no outbound request. The test is part of the canonical React runner.
- `src/features/resource-admin/ResourceAdminPage.tsx` is a development-only local resource-review interface. It is mounted outside `MindPulseProvider`, so it cannot open or read the student vault; `tests/react-resource-admin-smoke.js` verifies publish, reasoned invalidation, cache-only writes, and that no `mindpulse-local-vault` database is created.
- Phase 19 is complete for the local MVP. Production resource publishing is intentionally not claimed: it requires authenticated server roles, tenant isolation, and a real audit service.

## 2026-08-04 Phase 21 Engineering Closure

- `src/rules/minimal-checkin.js` ranks the next missing prompt from safety value, data incompleteness, available baseline samples, and a deterministic signal order. The Check-in page shows one question, explains why, and lets the user skip forward without fabricating a record.
- The risk policy now retains absolute sleep at or below 4.5 hours and three recent negative states above the cold-start gate. Multiple deviations from a ready real-trial baseline can also produce medium attention; synthetic demo records do not drive this personal escalation.
- `src/domain/report-aggregation.ts` groups records by local natural day. Reports reserve seven date-labelled columns and mark missing sleep/social values explicitly instead of treating them as zero.
- `tests/phase21.test.ts` and `tests/react-phase21-smoke.js` cover the policy contract and browser behavior. The React smoke is part of the canonical suite.
- Phase 21's usability metrics remain unmeasured external evidence. Local checks demonstrate behavior and boundaries, not completion rate, comprehension, or false-certainty outcomes with people.

## 2026-08-04 Phase 22 In Progress

- `src/rules/policy-sdk.js` is the new canonical, versioned policy-core envelope. It exposes the same deterministic output and hash in Node, generated browser rules, and an iOS fixture adapter.
- `src/domain/policy-registry.js` requires a release id, matching package/version/hash, golden case set, and explicit approver/timestamp before an approved release can exist. Replay diff and rollback reject invalid targets.
- Rule Lab can export only fixture/replay/release evidence. It does not inspect or export the user vault.
- The legacy `src/domain/decision-policy.js` is now a compatibility adapter over `policy-sdk`; silent duplicate risk/path evaluation has been removed. Its original global API remains only for legacy tests/assets.
- Persistent policy-release history and real old/new approval review remain unimplemented; the current registry deliberately holds no user or vault data.

## 2026-08-04 Phase 22 Closure

- `writePolicyReviewSnapshot()` now persists up to 20 local review snapshots under `mindpulse:policyReleaseHistory`. Each snapshot contains only release metadata, replay summary, and fixture decisions; it does not contain a vault id, user record, note, or export from `mindpulse-local-vault`.
- Browser, Node, React, and iOS fixture adapters share `policy-sdk.js`. The public-path normalization for insufficient data and medium-risk friend-first guidance now matches the React evaluator, and the policy SDK cross-adapter suite passes for ordinary, incomplete, crisis, repeated-negative, quoted, negated, mixed-language, safe-phrase, and historical-crisis fixtures.
- Rule Lab compares the current replay with the latest local review snapshot, supports explicit local snapshot save, and exports fixture/replay/release evidence only. An approved release still requires an explicit approver and timestamp; the baseline remains a local review state, not a clinical or production approval.
- Full verification on 2026-08-04: `npm.cmd run preflight` passed, including generated adapters, build, typecheck, audits, Node/domain suites, policy SDK/registry tests, and the canonical React Rule Lab smoke.
- The iOS adapter is deliberately a deterministic fixture contract. A shipped native client, actual professional approval, and any production release process remain outside this local-engineering phase.

## 2026-08-04 Phase 23 Local Continuity Contract

- `src/domain/encrypted-continuity.ts` defines a bounded AES-256-GCM envelope with authenticated metadata, random opaque vault locators, PBKDF2-SHA-256 recovery-code wrapping, a passkey-PRF wrapping contract, conditional revisions, conflict returns, session revoke/logout state, and conditional hard-delete receipts.
- `MemoryOpaqueVaultTransport` is deliberately a test fixture, not a cloud service. Its schema boundary accepts only the opaque envelope and rejects record-shaped plaintext. `tests/encrypted-continuity.test.ts` exercises second-device recovery, stale-write conflict, recovery/passkey wrapper recovery, ciphertext item limits, session controls, and deletion without silently discarding a conflict.
- Settings exposes `data-testid="continuity-boundary"` with `data-continuity-mode="off"`. It states that no reviewed transport exists and that the app will not upload records, create an account, or enable sync automatically.
- `docs/encrypted-continuity-threat-model-2026-08-04.md` records theft, XSS, malicious-extension, lost-factor, duplicate-device, and deletion risks. It explicitly states that CORS, authenticated endpoints, OTP rate limiting, actual WebAuthn PRF enrollment, and an independent security review are deployment requirements, not claims of this offline app.
- Verification on 2026-08-04: `npm.cmd run test:continuity`, `npm.cmd run test:domain`, `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run test:react:storage`, and the full `npm.cmd run preflight` passed.

## 2026-08-04 Phase 24 Trusted Circle Local MVP

- `src/domain/trusted-circle.ts` permits only an explicit, short-lived local invitation with a recipient label, one limited scope, expiry, revocation, and check-back status. It has no contact address, contact import, raw-history field, or automatic-message action.
- `src/features/trusted-circle/TrustedCirclePage.tsx` is available at `/circle` from Settings. It requires an explicit consent checkbox, makes a copy-only draft that says the recipient can decline, and keeps check-back creation/completion/revocation local to the vault.
- SafetyRedirect applies to `/circle`: while a high-risk hold is active, that route immediately returns to `/help`. No Trusted Circle action bypasses the help-only state.
- `tests/trusted-circle.test.ts` and `tests/react-trusted-circle-smoke.js` cover consent, scope, expiry, recipient refusal wording, no-contact-import persistence, copy-only behavior, check-back completion, revocation, and high-risk routing. Both are part of the regular domain/canonical React test paths.
- Human recipient comprehension, actual consent quality, and the usefulness of the reminder wording remain external-validation questions and are not claimed from automated tests. Full `npm.cmd run preflight` passed on 2026-08-04 with the Trusted Circle suite in the canonical React runner.

## 2026-08-04 Phase 25 Local Operations Foundation

- `src/domain/resource-operations.ts` defines a strict resource-operation event whitelist. It rejects vault/user/record identifiers, raw notes, risk fields, contact details, and any unrecognized fields before aggregation.
- Resource-health summaries are scoped to one tenant and suppress counts until five `link-opened` or `copy-requested` actions exist. The retention helper removes operation metadata older than 90 days.
- `tests/resource-operations.test.ts` covers forbidden fields, tenant isolation, minimum-sample suppression, and retention. This is a domain contract only; it does not create a production campus backend or claim a pilot.

## 2026-08-04 Phase 25 Local Operations Integration

- `src/domain/resource-operation-store.ts` is a separate local metadata cache, not part of the IndexedDB student vault. The strict event validator now rejects unrecognized fields in addition to raw note, risk, contact, user, record, and vault fields.
- A successful HelpComposer copy records only `copy-requested` for the fallback resource. User clicks on configured hotline/campus resource cards record only `link-opened`. Both happen only after an explicit user gesture and do not send any request or contact anyone.
- `ResourceAdminPage` reads the metadata cache and renders tenant-scoped resource health only after the existing five-action minimum. It keeps the development-only boundary and does not mount the student vault provider. Local deletion clears this cache as an extra privacy measure.
- These controls are local contracts, not evidence of production access control, anonymization at a shared backend, a campus resource-owner workflow, or a pilot.

## 2026-08-04 Phase 26 Accessibility Increment

- The canonical React shell now exposes a keyboard-visible skip link to `#main-content`. Route changes made inside the SPA scroll to the top and move focus to the main landmark, while the initial page load preserves the skip link as the first keyboard target.
- `tests/react-shell-style-smoke.js` verifies both behaviors through keyboard Tab/Enter and a real bottom-navigation route change. It also guards against React Strict Mode double-effect behavior by testing the pathname-change rule rather than mount timing.
- Existing reports already make missing data visible and current selection controls use native buttons/checkboxes. Copy fallback is implemented for Help and Trusted Circle, but an explicit failure-status presentation remains a future polish item.
- HelpComposer and Trusted Circle now report copy failure through a `role="status"` message when both the Clipboard API and `execCommand` fallback fail. Help does not write a `copied=true` receipt on that path.

## 2026-08-04 Phase 26 Current Verification

- A fresh local `npm.cmd run preflight` passed after the Phase 26 accessibility, copy-failure, and CI-workflow changes. The command reaches the full canonical React suite through `test:react:canonical`, including security, storage, decision, visual, resource, policy-lab, Trusted Circle, and Safety Gate matrix checks.
- This is local evidence only. The workflow in `.github/workflows/preflight.yml` has not been observed executing remotely, and the remaining coverage, deterministic storage-isolation, and versioned-artifact gates are still unproven.

## 2026-08-04 Phase 26 Storage Isolation and Artifact Evidence

- `tests/react-storage-isolation-smoke.js` uses two fixed vault identifiers in one IndexedDB object store. It verifies that changing `mindpulseReactVaultId` loads the corresponding snapshot and that the JSON export for each vault excludes the other vault's unique record marker. This covers key selection and export isolation; it does not claim authentication or multi-device isolation.
- `tools/capture-regression-artifact.js` writes a timestamped manifest only after the full `preflight` pipeline reaches its final step. The manifest stores app/policy versions, screenshot paths, byte counts, SHA-256 hashes, and limitations, but no vault identifiers, records, notes, or screenshot bytes.
- Current local artifact: `output/regression-artifacts/mindpulse-0.1.0-2026-08-04T13-39-21-504Z.json`. It reports `passed`, indexes 92 screenshot hashes, and passed a direct sensitive-token scan. Remote CI execution and coverage thresholds remain unverified.

## 2026-08-04 Phase 26 Coverage and Dependency Findings

- `@vitest/coverage-v8@4.1.10` now enforces a scoped core-policy coverage gate in `preflight`. Its aggregate baseline is 85.85% statements, 76.41% branches, 91.58% functions, and 90.19% lines. A second serial run enforces a lower per-file floor so one module cannot silently collapse while the aggregate remains high.
- Generated browser adapters and frozen delivery copies are excluded from source coverage because they are verified by browser/parity tests and would otherwise distort the source-module measurement. Vitest JSON summary output is disabled because the V8 provider writes invalid JSON escapes for this Windows project path; the text report and nonzero threshold exit status are the authoritative local evidence.
- `npm audit fix` moved React Router from 7.0.0 to 7.18.2 and PostCSS to 8.5.25. The full preflight passed after this change, but `npm audit` still reports the RSC CSRF advisory for the newest published stable router. The product is a client-side BrowserRouter SPA without RSC, SSR, or server actions, yet no production-release claim is made while the advisory remains unresolved. See `docs/dependency-security-status-2026-08-04.md`.

## 2026-08-04 Phase 23 Manifest Lifecycle

- `src/domain/continuity-manifest-store.ts` stores only a strict, metadata-only local continuity marker: schema version, opaque locator, device ID, revision, enabled/updated timestamps, and recovery/passkey wrapper kinds. It rejects unknown fields and intentionally excludes raw keys, recovery codes, wrapper ciphertext, encrypted snapshots, records, notes, safety state, and receipts.
- Revision metadata is explicitly rewritten only when the caller has a newer in-memory manifest. This does not enable sync, create an account, or make the marker recoverable by itself.
- Local-device revocation, confirmed remote hard deletion, and the React local-data deletion flow clear the marker. `tests/encrypted-continuity.test.ts` now verifies strict validation, revision progression, and cleanup; `tests/react-storage-smoke.js` covers product-level local-data cleanup.

## 2026-08-04 Remote CI Evidence Boundary

- The workspace has no `.git` directory, so `git remote -v` cannot identify a hosted repository. The checked-in GitHub Actions workflow is configuration evidence only; no remote run or uploaded artifact can be observed or triggered from this directory.
- The workflow now uploads `output/playwright` and `output/regression-artifacts` together under the stable `preflight-regression-evidence` artifact name. `tests/ci-workflow-contract.js` validates triggers, immutable install, Chromium provisioning, canonical preflight, always-upload behavior, and both evidence directories. This makes the future remote evidence complete when a real repository run is available, but does not turn local execution into remote proof.

## 2026-08-04 Existing Supabase Delivery Surface

- The workspace already contains `supabase/migrations/20260618_mindpulse_secure_sync.sql` and Edge Function templates for email-code request/verification, opaque vault sync/recovery/delete, and a combined API. These are deployable source artifacts, not proof of a configured Supabase project, production secrets, a remote deployment, or a security review.
- This Windows workspace has no `deno` executable, so Edge Functions cannot be runtime-checked here. Source-level security contracts can prevent accidental regression, but deployed Supabase/Deno behavior remains an external validation step.
- The shared and combined Function CORS helpers previously accepted wildcard/prefix origins and fell back to an arbitrary request origin or `*` when no allowlist was configured. Both now use exact configured origins only. The standalone and combined email-code handlers no longer write fallback codes to logs; they return 503 unless an explicit development-only return flag is enabled.

## 2026-08-04 Release Gate Audit

- `docs/release-gate-audit-2026-08-04.md` distinguishes local passing evidence from deployment, remote-CI, dependency-authority, and human-validation proof. It preserves every open gate rather than inferring closure from templates or tests.

## 2026-08-04 Phase 25 Server Boundary Design

- The existing Supabase identity model exposes the authenticated `sessions.account_id` only to Edge Functions using a service role. A deployable operations function can therefore authorize an admin through an explicit tenant membership table while keeping resource-operation rows free of account IDs, vault IDs, notes, risk values, and contact data.
- The server contract will accept only resource configuration and operation metadata allowlists. It will return aggregate health only after the existing five qualifying `link-opened`/`copy-requested` minimum, matching the local MVP's privacy rule.
- `supabase/migrations/20260804_resource_operations_tenant_boundary.sql` and `supabase/functions/resource-admin/index.ts` now implement that deployable source contract. The operation table has a composite resource-and-tenant foreign key and no student data fields; the Function requires an active tenant membership before any operation. Deployment and runtime proof remain external.

## 2026-08-04 Server Device Revocation Root Cause

- Every standalone protected Supabase Function delegates to `_shared/utils.ts:requireSession`, while `mindpulse-api` duplicates the same logic. Both reject revoked sessions but do not query `devices.revoked_at` before updating device activity. A server-side device revocation therefore cannot reliably invalidate existing sessions until both authorization paths perform that check.
- Both session-validation paths now query the exact `(device_id, account_id)` row with `revoked_at is null` before either heartbeat update. `tests/supabase-device-revocation-contract.js` enforces it in preflight. This is source-level hardening only; no deployed revocation workflow was exercised.

## 2026-08-04 Phase 20 Closure

- Added `src/rules/intervention-feedback.js` as the canonical eligibility contract for the 10-30 minute feedback window. It rejects high-risk, insufficient-data, duplicate, invalid-clock, invalid-timing, synthetic-data, and context-changed feedback from learning.
- Feedback is now a separate event linked to one completion. It records subjective outcome, burden, timing metadata, and optional local note; completion score deltas remain unavailable to personalization.
- `summarizeInterventionFeedback()` accepts only explicitly eligible, linked real-trial feedback. Recommendation boosts apply only after one action has three valid pairs, and the companion UI shows pair count and a sample-stability label without efficacy language.
- Optional feedback notes persist only in the local vault and are stripped from the Settings JSON export.
- `tests/intervention-feedback.test.ts` covers missing feedback, duplicate feedback, clock drift, high-risk/data-insufficient exclusion, context changes, and score-movement exclusion. The browser companion flow now shows a delayed subjective-feedback state rather than an instant score conclusion.
