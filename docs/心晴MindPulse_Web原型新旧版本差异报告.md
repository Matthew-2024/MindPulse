# 心晴 MindPulse Web 原型新旧版本差异报告

生成日期：2026-07-28  
比较方式：静态文本、HTML/CSS/脚本结构和相对依赖扫描；本报告未执行浏览器运行验证。

同步更新：2026-07-29 已从 `Matthew-2024/MindPulse` 的 `main` 分支（提交 `917f68ffd229df003b1c4add2a50ea2d52432800`）同步新版 HTML、4 个功能模块及配套测试。原报告中的依赖缺口已解决；当前工作区额外保留的 React/Vite 与 Supabase 文件未被删除。

## 1. 比较对象

| 版本 | 文件 | 更新时间 | 文件大小 | SHA-256 |
|---|---|---:|---:|---|
| 旧版 | `C:\Users\1\Desktop\app（mi）\心晴MindPulse_Web原型.html` | 2026-07-24 01:01:39 | 266,060 bytes | `6C890844EA519DF55793B4EFFAEBE3F8F82AB5C563E1346A40B2EEC591128CB9` |
| 新版 | `D:\2734604438\心晴MindPulse_Web原型 (1).html` | 2026-07-28 09:56:15 | 265,854 bytes | `41D4C9499B3CA1B572C02EEF1BBF35A8C2E319F9D2440C7715712E5B97ADA768` |

补充统计：旧版 4,255 行、248,912 字符；新版 3,822 行、248,545 字符。`git diff --no-index` 统计为 631 行新增、1,064 行删除，说明新版是一次较大范围的功能重组，不是局部样式修补。

## 2. 结论摘要

1. 新版的核心方向从“账号、加密同步、数据权限展示”转向“本地匿名工具集”：新增备忘录、待办日程和本机漂流瓶，并引入决策链路展示。
2. 视觉基础保持一致。两版的根级颜色 token、背景色和阴影定义一致；新版 CSS 选择器从 426 个增加到 475 个，新增样式主要服务于三个功能模块和决策信号展示。
3. 新版移除了旧版的邮箱验证码、Supabase Functions、加密 vault 同步、数据权限账本和可配置求助资源界面。相关数据边界和隐私承诺已经改变，不能只当作 UI 替换处理。
4. 同步前存在迁移阻塞：新版引用的 4 个新增脚本在当时的当前工作区和新版文件所在目录均未找到。该缺口已由 2026-07-29 的 GitHub 同步解决；规则验证页的空依赖保护仍是后续可改进项。

## 3. 文件和结构变化

| 指标 | 旧版 | 新版 | 变化 |
|---|---:|---:|---:|
| `<style>` 标签 | 1 | 1 | 不变 |
| 外部 `<script src>` | 7 | 5 | -2 |
| `<button>` 标签 | 111 | 125 | +14 |
| `<input>` 标签 | 18 | 12 | -6 |
| `<textarea>` 标签 | 4 | 7 | +3 |
| CSS class 名称 | 426 | 475 | +49 |

旧版的外部脚本位于旧版 HTML 第 668-674 行：

- `src/rules/browser-engine.js`
- `src/rules/browser-cases.js`
- `src/storage/vault-store.js`
- `src/config/runtime-config.js`
- `src/state/store.js`
- `src/security/risk-gate.js`
- `src/selectors/score-selectors.js`

新版的外部脚本位于新版 HTML 第 724-728 行：

- `src/rules/browser-engine.js`
- `src/domain/decision-policy.js`
- `src/features/memo/memo-model.js`
- `src/features/schedule/schedule-model.js`
- `src/features/bottle/bottle-repository.js`

新版路由映射位于第 2523 行，相比旧版第 3023 行新增了 4 个入口：

- `memo`：备忘录列表
- `memo-detail`：备忘录编辑
- `schedule`：待办日程
- `bottle`：匿名漂流瓶

## 4. 新增能力

### 4.1 备忘录

新版状态对象第 862-867 行新增 `memos` 和 `activeMemoId`；第 2614 行起新增列表和详情页。实现包含：

- 本地笔记列表和联想搜索
- 多条事项编辑、自动编号、插入、删除、上下移动
- 单独的笔记详情页
- 从首页工具区进入备忘录

依赖：`window.MindPulseMemoModel`，对应 `src/features/memo/memo-model.js`。

### 4.2 待办日程

新版状态对象第 863、869-870 行新增 `scheduleItems`、`scheduleView` 和 `scheduleRange`；第 2682 行起新增日程页。实现包含：

- 日期和时间输入
- 周视图日历
- 今天、3 天、8 天、30 天范围筛选
- 完成、编辑和删除待办

依赖：`window.MindPulseScheduleModel`，对应 `src/features/schedule/schedule-model.js`。

### 4.3 本机匿名漂流瓶

新版状态对象第 864、872 行新增 `bottleRepo` 和 `drawnBottle`；第 2715 行起新增漂流瓶页。求助页第 2868 行附近新增入口。实现包含：

- 本机投放瓶子
- 随机捞取瓶子
- 本机匿名回复
- 查看当前匿名档案投放的瓶子和回复数量

依赖：`window.MindPulseBottleRepository`，对应 `src/features/bottle/bottle-repository.js`。页面文案明确这是本机演示，不是真实社区。

### 4.4 决策信号展示

新版第 1492-1503 行新增 `currentDecisionTrace`、`decisionStrategyLabel` 和动作校验函数；首页和规则验证页增加 `decision-signal`、`lab-result` 等视觉组件。该方向把“为什么推荐这一步”展示得更直接，但依赖 `window.MindPulseDecisionPolicy`。

## 5. 移除或弱化的能力

### 5.1 账号和云端同步

旧版从第 731 行起包含 `ACCOUNT_STATE_KEY`、Supabase Functions 配置、IndexedDB vault、PBKDF2 加密和云端副本操作；旧版设置页还包含邮箱验证、开启/关闭同步、立即同步、恢复副本和清除云端副本。

新版不再引用以下旧版外部脚本和函数：

- `src/storage/vault-store.js`
- `src/config/runtime-config.js`
- `src/state/store.js`
- `src/security/risk-gate.js`
- `src/selectors/score-selectors.js`
- `enableEncryptedSync`
- `restoreEncryptedSync`
- `syncEncryptedNow`
- `clearCloudCopy`
- `requestEmailCode` / `verifyEmailCode`

新版设置页第 2893 行附近改为展示“本机分析”和“云端同步未开放”的说明，没有旧版的实际账号验证和同步操作。

### 5.2 求助资源配置

旧版有 `renderHelpResourceCard` 和 `saveHelpResources`，允许用户配置学校心理中心、辅导员和可信任联系人；新版求助页使用固定资源，不再出现 `renderHelpResourceCard`、`saveHelpResources` 及对应输入框。

### 5.3 反馈学习控制

旧版设置页有 `toggleFeedbackLearning`，允许用户关闭推荐反馈学习；新版设置页保留说明，但当前静态扫描未发现对应的切换按钮和处理函数。若该能力仍是产品要求，需要在新版中补回或明确改为固定策略。

## 6. 数据存储和导出变化

旧版使用本地 vault / IndexedDB 及可选加密云端副本；新版在第 1022-1031 行通过 `localStorage` 的档案 key 持久化核心记录，并新增：

- `profileKey("memos")`
- `profileKey("scheduleItems")`
- `mindpulse:<profile>:bottleReplies`

导出逻辑也发生变化：

- 旧版第 2552 行附近导出账号状态、vault、数据账本、帮助资源和干预事件等信息。
- 新版第 2106 行附近导出 `memos`、`scheduleItems`、本人瓶子及其回复，但不再导出账号同步和数据账本结构。

清除逻辑从旧版第 2588 行的 vault 删除流程改为新版第 2137 行的 localStorage 删除流程。迁移时需要确认：旧版已有本地 vault 数据是否保留、是否需要迁移到新版 key，以及新版是否仍需支持云端数据删除承诺。

## 7. 迁移阻塞和风险（同步前审查）

### 高优先级：新增脚本缺失

当前工作区 `src` 目录中已存在旧版依赖，但不存在以下新版依赖：

- `src/domain/decision-policy.js`
- `src/features/memo/memo-model.js`
- `src/features/schedule/schedule-model.js`
- `src/features/bottle/bottle-repository.js`

新版所在目录 `D:\2734604438` 下也未找到这些文件。因为新版页面使用相对路径加载脚本，直接把 HTML 复制进当前项目仍会缺少 4 个文件。

### 高优先级：规则验证页的空依赖调用

新版第 3015 行直接调用 `window.MindPulseDecisionPolicy.evaluateState(...)`，没有像第 1493 行那样做存在性保护。即使普通首页通过 fallback 继续渲染，进入“规则验证”页仍可能因为 `window.MindPulseDecisionPolicy` 未定义而中断。

### 中优先级：数据模型断裂

新版新增数据 key，但没有迁移旧版 vault 数据的逻辑。旧版已有记录、反馈、求助资源和云端同步状态不会自动转换为新版模型。

### 中优先级：隐私说明和实际能力不一致的风险

新版把云同步收敛为“未开放”，降低了网络侧风险；但如果项目仍保留旧版的隐私说明、文档或后端功能，需要同步更新产品文案，避免“支持加密同步”和“云端未开放”两套承诺并存。

## 8. 建议的迁移顺序

1. 先补齐并审查 4 个新增脚本，确认它们的全局导出名分别为 `MindPulseDecisionPolicy`、`MindPulseMemoModel`、`MindPulseScheduleModel` 和 `MindPulseBottleRepository`。
2. 为 `renderRuleLab` 增加 `MindPulseDecisionPolicy` 缺失时的 fallback 或禁用状态，避免点击规则验证直接抛异常。
3. 明确数据策略：保留旧版 vault 并做迁移，还是明确新版从空的本地匿名档案开始。
4. 决定是否永久移除邮箱验证、加密同步、数据账本和求助资源配置；若移除，应同步清理文档、测试和后端入口。
5. 补齐依赖后，再用浏览器验证首页、备忘录、日程、漂流瓶、求助和规则验证六条主路径，并检查移动端布局。

## 9. 最终判断

新版更像是“本地匿名陪伴工具”的产品方向调整，而不是旧版的纯视觉升级。功能上更贴近日常使用，但它牺牲了旧版已经实现的账号/加密同步和数据治理能力。同步前缺少的新增模块已在本次更新中补齐；后续仍需确认数据策略，再决定是否把新版进一步纳入当前 Vite 项目。

### 同步后状态

- 已补齐：`src/domain/decision-policy.js`、`src/features/memo/memo-model.js`、`src/features/schedule/schedule-model.js`、`src/features/bottle/bottle-repository.js`。
- 已加入：领域测试、收敛 UI 测试和视觉回归测试入口。
- 已验证：规则 20/20、领域模型测试、收敛 UI、收敛视觉、TypeScript 类型检查和 Vite 构建均通过。
- 兼容处理：保留当前工作区 React 工程所需的规则导出，并补充 GitHub 新测试需要的个性化反馈 API；远端 HTML 继续使用同步后的 `browser-engine.js`。
