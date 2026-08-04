# 心晴 MindPulse

心晴 MindPulse 是面向大学生心理压力早期觉察的端侧轻干预系统原型。作品不做心理诊断，也不替代专业咨询，而是把日常情绪记录、睡眠/活动节奏信号、MindPulse-RISE 可解释恢复指数、轻干预建议和求助表达生成串成一个低门槛闭环。

国赛版本的核心目标：把心晴从“高保真心理健康 App 原型”升级为一个端侧匿名、可运行、可解释、可验证、可自我审查，并始终把心理安全边界放在普通推荐逻辑之上的计算机设计作品。

## Canonical Product Entry

The release product is the React/Vite application rooted at `src/main.tsx`. Run it with `npm.cmd run dev:react`, build it with `npm.cmd run build`, and use `npm.cmd run test:react:canonical` for the canonical browser regression suite. The React app, its domain modules, and its current test matrix are the authoritative implementation boundary.

The current release baseline is documented in `docs/release-baseline-2026-08-04.md`; the interaction and Safety Gate contract is documented in `docs/action-policy-matrix-2026-08-04.md`.

The standalone `心晴MindPulse_Web原型.html` and its standalone HTML smoke tests are retained as a legacy reference package only. They are not a second release product, are not maintained for silent parity with React, and are not release evidence for the canonical app. New behavior belongs in the React/Vite entry and its canonical tests.

## 作品定位

- 目标用户：有压力、焦虑、低落、睡眠紊乱，但尚未主动求助的大学生。
- 核心问题：很多学生不是完全不需要帮助，而是不知道如何识别状态、如何迈出第一步、如何向他人开口。
- 产品边界：只做早期觉察、轻量行动和求助转接，不做医学诊断，不输出治疗建议。
- 国赛表达：心晴是第一道低门槛求助桥梁，不是心理咨询师，也不是危机干预终点。

## 核心功能

1. 即时情绪记录：用户用低负担方式记录此刻情绪、睡眠、精力、连接意愿和一句备注；同一天可以保留多条记录，例如 2 小时前生气、1 小时前开心。
2. 匿名档案：使用端侧匿名 ID 隔离不同用户的记录、个人基线和推荐反馈，不做手机号/学号登录。
3. 节奏分析：结合情绪自评、睡眠、步数、社交连接度生成 MindPulse-RISE 恢复指数。
4. 个人基线：用近几天历史节奏判断“今天是否偏离自己的正常状态”，而不是和别人比较。
5. 可解释规则：展示恢复指数分数拆解、个人基线偏移、风险证据和推荐依据，避免黑盒判断。
6. 自适应轻干预：根据状态推荐呼吸、散步、专注、记录、睡前放松、联系朋友等微行动，并记录完成后分数变化，下一次优先推荐对当前匿名档案更有效的动作。
7. 日报与周报：今日记录会自动汇总成日内时间线、日报和 7 天周报，展示情绪变化、平均恢复指数、低睡眠日和 Safety Gate 触发次数。
8. 求助表达：帮助用户整理发给老师、朋友或家人的第一句话。
9. Safety Gate 风险闸门：识别稳定观察、普通波动、中度关注和高风险求助场景；高风险时停止普通自助建议，只进入求助入口。
10. 验证证据板：在设置页展示本地样本数、平均恢复指数、干预完成覆盖率和 Safety Gate 触发数，明确区分演示验证与真实用户研究。
11. 隐私控制：即时记录、日报/周报聚合结果和干预完成情况写入浏览器本地存储，支持 JSON 导出和本地数据清除；后续可再讨论 IndexedDB、端侧数据库或同步方案。
12. 可审计策略：每次评估生成固定 Reason Code、决策编号、允许/阻断动作、证据、策略版本、数据来源和置信度；高风险和数据不足策略在领域层不可绕过。
13. 备忘录与日程：支持多笔记、事项自动连续编号、中间插入/删除/移动、模糊及联想搜索；待办日程默认周视图，可切换月/年，并按 1、3、8、30 天范围检索。
14. 匿名漂流瓶演示：支持本机投放、随机捞取和匿名回应，仓储接口为未来真实后端保留替换点；当前明确标注为本机演示海域，不代表已上线多用户社区。

## 当前交付物

| 类型 | 文件 |
|---|---|
| 可运行原型 | `心晴MindPulse_Web原型.html` |
| 参赛叙事 | `心晴MindPulse_启迪赛道冲奖方案.html` |
| iOS 路线 | `心晴MindPulse_无Mac开发路线.html` |
| iOS SwiftUI 原型 | `ios/MindPulseSwiftUI/` |
| 技术说明 | `docs/技术说明.docx` |
| 算法说明 | `docs/恢复指数与风险分级算法说明.docx` |
| 心理安全 | `docs/心理安全与伦理说明.docx` |
| 自我审查 | `docs/自我审查项目.md` |
| 提交前自查矩阵 | `docs/提交前自查矩阵.md` |
| 数据说明 | `docs/数据使用说明.md` |
| 用户验证 | `docs/用户研究与验证计划.docx` |
| 匿名试用执行包 | `docs/匿名试用执行包.md` |
| A07 试用证据台账 | `docs/user-study-evidence/README.md` |
| 工程路线 | `docs/工程化改造路线.docx` |
| 国赛方案 | `docs/国赛冲刺总方案.docx` |
| 国赛落地清单 | `docs/国赛落地修改清单.md` |
| PPT 与答辩自查口径 | `docs/PPT与答辩自查口径同步稿.md` |
| 答辩脚本 | `docs/国赛答辩脚本.docx` |
| 提交清单 | `docs/国赛提交清单.docx` |
| PPT 大纲 | `docs/国赛PPT大纲.docx` |
| 用户研究模板 | `docs/用户研究报告模板.docx` |
| 专业审核模板 | `docs/专业审核访谈纪要模板.docx` |
| 专业审核执行包 | `docs/专业审核执行包.md` |
| A08 专业审核证据台账 | `docs/professional-review-evidence/README.md` |
| 规则模块 | `src/rules/*.js` |
| 规则共享信号层 | `src/rules/signals.js` |
| 样例数据 | `data/demo-records.json` |
| 合成演示数据 | `data/synthetic-mindpulse-30-records.json`、`data/synthetic-mindpulse-30-analysis.json` |
| 规则测试 | `tests/rule-cases.json`、`tests/run-rule-tests.js` |
| 自查截图证据 | `docs/review-evidence/` |
| 当前测试与自查报告 | `docs/当前测试与自查报告.md`、`docs/测试报告.docx` |
| 竞赛级优化评估 | `docs/竞赛级优化评估报告.md` |

## 完成度说明

| 模块 | 当前状态 | 说明 |
|---|---|---|
| Web 交互原型包 | 已实现 | 通过入口 HTML 运行，需保留同目录的 `src/` 脚本与资源 |
| 匿名用户档案 | 已实现 | 首屏匿名档案页 + 端侧匿名 ID，支持创建、切换、删除档案，不收集手机号/学号 |
| 情绪记录 | 已实现 | 支持情绪、睡眠、精力、连接意愿和文本备注 |
| 即时记录 | 已实现 | 同一日可追加多条带时间戳的即时记录，保留日内情绪变化 |
| 真实数据输入 | 已实现 | 支持手动输入睡眠小时、步数和社交连接度 |
| 恢复指数 | 已实现 | 可解释规则引擎，已抽出独立规则模块 |
| 个人基线偏移 | 已实现 | 依据当前档案历史记录判断睡眠、活动、连接、情绪偏移 |
| 风险分级 | 已实现 | 关键词、连续低睡眠、连续负面状态触发 |
| 推荐路径 | 已实现 | 情绪状态到轻干预路径映射，高风险只进求助入口，并加入完成反馈自适应 |
| 解释详情 | 已实现 | 首页可展开分数拆解、风险依据、推荐路径和数据来源 |
| 线上规则验证 | 已实现 | 设置页可现场运行规则用例 |
| 验证证据板 | 已实现 | 设置页从本地记录即时计算 RISE 均值、干预覆盖率和 Safety Gate 触发数 |
| 本地存储 | 已实现 | localStorage 保存记录和干预状态 |
| PWA 基础能力 | 已实现 | 已补 manifest、图标和 Service Worker |
| 放松音频 | 已实现 | Web Audio 生成呼吸底噪、雨声、森林氛围 |
| 日报 / 周报 | 已实现 | 从当前匿名档案本地记录表自动聚合今日时间线、日报和 7 天周报 |
| 数据导出 | 已实现 | 导出 JSON 记录，包含匿名档案、原始记录、风险结果、日报和周报 |
| 决策追踪 | 已实现 | 固定 Reason Code、允许/阻断动作、证据、策略版本、数据来源和置信度 |
| Safety Gate 命令守卫 | 已实现 | 高风险只允许求助，数据不足只允许补充记录；直接调用普通行动也会被阻断 |
| 备忘录 | 已实现 | 多笔记、事项自动编号、中间插入/删除/移动、模糊和同义词联想搜索 |
| 待办日程 | 已实现 | 周/月/年视图、日期待办、日期范围筛选和截止时间排序 |
| 匿名漂流瓶 | 本机演示已实现 | 本地瓶池、随机捞取、匿名回应和回复隔离；真实后端待后续接入 |
| 规则测试 | 已实现 | `node tests/run-rule-tests.js` 可验证核心规则 |
| UI 冒烟测试 | 已实现 | `node tests/ui-smoke.js` 可验证线上核心演示路径、即时记录、日报/周报和导出结构 |
| iOS SwiftUI 原型 | 已实现 | 已提供独立 SwiftUI 版本，包含匿名档案、RISE、Safety Gate、验证证据板；需在 Mac/Xcode 上最终编译 |
| 用户研究 | 执行包和证据台账已补 | `docs/匿名试用执行包.md` 与 `docs/user-study-evidence/README.md` 已明确知情说明、记录表、必备证据文件和回填规则；真实结果待 10-20 人匿名试用后补 |
| 专业审核 | 执行包和证据台账已补 | `docs/专业审核执行包.md` 与 `docs/professional-review-evidence/README.md` 已明确审核路径、问题记录、必备证据文件和回填规则；真实意见待老师审核后补 |
| HealthKit | 规划中 | 当前使用模拟睡眠和步数，正式 iOS 版才接入 |
| Core ML | 规划中 | 当前使用可解释规则，未来可接端侧分类模型 |

## 如何运行

在保留 `src/` 与 `assets/` 同目录的前提下，用浏览器打开入口：

```text
心晴MindPulse_Web原型.html
```

建议以 iPhone 14 Pro 竖屏为主视口预览：

- iPhone 14 Pro 主尺寸：393 x 852
- 小屏参考尺寸：375 x 667
- 大屏兼容尺寸：430 x 932（393 px 手机画布居中）
- 平板参考尺寸：1024 x 768

运行规则测试：

```bash
node tests/run-rule-tests.js
```

运行 UI 冒烟测试：

```bash
node tests/ui-smoke.js
```

运行新增领域测试：

```bash
npm.cmd run test:domain
```

运行收口改造端到端和视觉测试：

```bash
npm.cmd run test:convergence:ui
npm.cmd run test:convergence:visual
```

运行 30 条合成演示数据分析：

```bash
node tools/analyze-synthetic-records.js
```

采集自查截图证据：

```bash
npm.cmd run capture:evidence
```

运行自我审查护栏：

```bash
npm.cmd run audit:self
```

运行正式 docx 口径审查：

```bash
npm.cmd run audit:docx
```

一键运行提交前审查：

```bash
npm.cmd run preflight
```

`preflight` 会依次运行文案安全审查、自我审查护栏、正式 docx 口径审查、演示路径测试和完整验证。

一键运行规则与 UI 验证：

```bash
npm.cmd run verify
```

当前测试结果：

```text
All 20 rule case(s) passed.
Demo flow smoke passed: score, explanation, intervention, high-risk help, export, and rule evidence.
UI smoke passed: home, detail, manual input, high-risk help, export/delete, rule lab.
```

注：部分 Windows PowerShell 环境会因执行策略拦截 `npm.ps1`，此时直接使用上面的 `node` 命令即可。

## 恢复指数规则

当前原型使用 MindPulse-RISE 可解释规则而不是黑盒模型：

```text
RISE 恢复指数 = Rhythm 节奏信号 + Interaction 连接信号 + Self-report 情绪自评 + Engagement 干预反馈

页面实现中对应为：
恢复指数 = 情绪分 + 睡眠分 + 活动分 + 社交连接分 + 干预完成分
```

输入信号：

- 情绪自评：1-5 分映射。
- 睡眠时长：小时。
- 步数：当天活动水平。
- 社交连接度：0-100%。
- 干预完成情况：是否完成呼吸、散步、记录等行动。
- 文本备注：仅用于端侧风险关键词识别。
- 匿名档案历史：用于计算个人基线偏移。

输出结果：

- 当前恢复指数。
- 个人基线偏移。
- 分数拆解。
- 推荐干预路径。
- 可解释依据。
- 风险等级。
- 干预前后变化。

详见：`docs/恢复指数与风险分级算法说明.md`。

## 风险分级

| 等级 | 触发条件 | 系统行为 |
|---|---|---|
| 稳定观察 | 当前状态较平稳 | 继续记录和维持节奏 |
| 普通波动 | 偶发焦虑、疲惫、低落 | 推荐低负担轻干预 |
| 中度关注 | 连续低睡眠或多日负面状态 | 提示联系朋友、辅导员或咨询中心 |
| 高风险 | 出现自伤、自杀、不想活、绝望等危机词 | Safety Gate 触发，停止普通自助建议，优先展示热线和可信任成人 |

国赛答辩口径：

> 风险分级不用于诊断，只用于决定系统是否继续推荐普通自助干预。Safety Gate 触发后，心理安全优先级高于所有普通推荐逻辑。

## 隐私与心理安全

- 当前原型数据仅保存在浏览器本地。
- 不读取聊天记录、联系人、定位等敏感信息。
- 不上传情绪文本。
- 支持 JSON 导出。
- 支持删除本地数据。
- 高风险场景优先引导联系可信任的人或专业资源。
- 不自动上报，不替用户发送信息，求助内容由用户主动复制或发送。

详见：`docs/心理安全与伦理说明.md`。

