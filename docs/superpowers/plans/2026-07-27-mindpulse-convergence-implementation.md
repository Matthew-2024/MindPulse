# 心晴 MindPulse 收口式创新改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变心晴现有 UI 风格和相对比例的前提下，以 iPhone 14 Pro 竖屏 393 x 852 为主基准，完成可审计策略、不可绕过 Safety Gate、匿名漂流瓶演示、备忘录、待办日程和三状态答辩演示。

**Architecture:** 保留 `心晴MindPulse_Web原型.html` 作为无构建主入口，新增四个 UMD 风格纯 JavaScript 模块并挂载到 `globalThis`，浏览器通过普通 `<script>` 加载，Node 测试通过动态导入后读取全局 API。所有数据沿用匿名档案隔离的 `localStorage` 键；UI 继续使用现有 HTML 渲染函数和样式语言。

**Tech Stack:** 原生 HTML/CSS/JavaScript、ESM Node 测试脚本、Playwright/Edge、localStorage、现有 MindPulse 规则模块。

---

## 文件结构

- Create: `心晴MindPulse_Web原型_修改前备份.html` - 修改前可直接回滚版本。
- Create: `src/domain/decision-policy.js` - 决策追踪、Reason Code、Safety Gate 和命令守卫。
- Create: `src/features/memo/memo-model.js` - 备忘录规范化、事项操作、自动编号和联想搜索。
- Create: `src/features/schedule/schedule-model.js` - 日程规范化、日期范围、周/月/年分组和排序。
- Create: `src/features/bottle/bottle-repository.js` - 本地演示漂流瓶仓储及未来后端接口契约。
- Create: `tests/decision-policy-tests.js` - 决策、安全与个性化边界测试。
- Create: `tests/memo-model-tests.js` - 自动编号、插入、删除和联想搜索测试。
- Create: `tests/schedule-model-tests.js` - 日期范围和排序测试。
- Create: `tests/bottle-repository-tests.js` - 漂流瓶可见性和仓储接口测试。
- Create: `tests/convergence-ui-smoke.js` - 新首页、备忘录、日程、漂流瓶和 LAB 场景 UI 测试。
- Create: `tests/convergence-visual-smoke.js` - 393/375/430/1024 视口比例、溢出、触控尺寸和安全区测试。
- Modify: `心晴MindPulse_Web原型.html` - 加载模块、扩展状态/存储、改造首页及新增页面。
- Modify: `src/rules/personalization.js` - 三次普通反馈门槛和高风险排除。
- Modify: `src/rules/browser-engine.js` - 同步浏览器端个性化规则。
- Modify: `tests/run-rule-tests.js` - 更新个性化门槛断言。
- Modify: `tests/ui-smoke.js` - 主视口改为 393 x 852 并更新核心文案断言。
- Modify: `package.json` - 增加领域、新 UI 和视觉测试命令。
- Modify: `README.md` - 更新功能、运行方式和本地演示边界。

当前目录不是 Git 仓库，计划中的每个“检查点”保存测试输出而不创建提交；如果执行前恢复 `.git`，则在每个检查点按列出的文件创建独立提交。

### Task 1: 冻结基线与补齐测试命令

**Files:**
- Create: `心晴MindPulse_Web原型_修改前备份.html`
- Modify: `package.json`

- [ ] **Step 1: 冻结当前入口**

复制文件并验证哈希一致：

```powershell
Copy-Item -LiteralPath '.\心晴MindPulse_Web原型.html' -Destination '.\心晴MindPulse_Web原型_修改前备份.html'
Get-FileHash '.\心晴MindPulse_Web原型.html', '.\心晴MindPulse_Web原型_修改前备份.html'
```

Expected: 两个 SHA256 值相同。

- [ ] **Step 2: 在 `package.json` 增加新测试脚本**

```json
{
  "test:domain": "node tests/decision-policy-tests.js && node tests/memo-model-tests.js && node tests/schedule-model-tests.js && node tests/bottle-repository-tests.js",
  "test:convergence:ui": "node tests/convergence-ui-smoke.js",
  "test:convergence:visual": "node tests/convergence-visual-smoke.js"
}
```

- [ ] **Step 3: 记录原始基线**

Run:

```powershell
node tests/run-rule-tests.js
node tools/analyze-synthetic-records.js
```

Expected: 20 条规则/个性化用例通过；30 条合成记录完成分析。浏览器测试若因未安装 Playwright 失败，记录为依赖缺失，不归类为产品回归。

- [ ] **Step 4: 检查点**

确认备份文件不再修改，后续所有生产改动只进入主 HTML 和新增模块。

### Task 2: 可审计决策模型与 Safety Gate

**Files:**
- Create: `tests/decision-policy-tests.js`
- Create: `src/domain/decision-policy.js`

- [ ] **Step 1: 写失败测试**

```javascript
await import("../src/domain/decision-policy.js");
const { evaluateState, assertActionAllowed } = globalThis.MindPulseDecisionPolicy;

const insufficient = evaluateState([{ mood: "calm", note: "第一次记录" }], { source: "自我记录" });
assert.deepEqual(insufficient.reasonCodes, ["DATA_INSUFFICIENT"]);
assert.deepEqual(insufficient.allowedActions, ["checkin"]);

const crisis = evaluateState([
  { mood: "sad", sleepHours: 4.4, steps: 1200, socialScore: 8, note: "我很绝望，想消失" }
], { source: "自我记录" });
assert.equal(crisis.mode, "HIGH_RISK");
assert.deepEqual(crisis.allowedActions, ["help"]);
assert.throws(() => assertActionAllowed(crisis, "breathe"), /SAFETY_GATE_BLOCKED/);
assert.doesNotThrow(() => assertActionAllowed(crisis, "help"));
```

同时断言 `decisionId`、`evaluatedAt`、`evidence`、`policyVersion`、`dataSource`、`confidence` 均存在。

- [ ] **Step 2: 运行并确认 RED**

Run: `node tests/decision-policy-tests.js`

Expected: FAIL，因为 `src/domain/decision-policy.js` 不存在。

- [ ] **Step 3: 实现最小 UMD API**

```javascript
(function (global) {
  var REASON_CODES = Object.freeze({
    DATA_INSUFFICIENT: "DATA_INSUFFICIENT",
    BASELINE_DEVIATION: "BASELINE_DEVIATION",
    LOW_SLEEP_REPEATED: "LOW_SLEEP_REPEATED",
    LOW_CONNECTION_REPEATED: "LOW_CONNECTION_REPEATED",
    NEGATIVE_MOOD_REPEATED: "NEGATIVE_MOOD_REPEATED",
    TEXT_CRISIS_SIGNAL: "TEXT_CRISIS_SIGNAL",
    SINGLE_WAVE: "SINGLE_WAVE",
    STABLE_BASELINE: "STABLE_BASELINE"
  });

  function assertActionAllowed(trace, action) {
    if (!trace || trace.allowedActions.indexOf(action) < 0) {
      throw new Error("SAFETY_GATE_BLOCKED: " + action);
    }
  }

  global.MindPulseDecisionPolicy = {
    REASON_CODES: REASON_CODES,
    evaluateState: evaluateState,
    assertActionAllowed: assertActionAllowed,
    POLICY_VERSION: "mindpulse-policy-2.0"
  };
})(globalThis);
```

`evaluateState(records, options)` 使用现有 `MindPulseRules`（浏览器）或内置等价信号读取逻辑（Node）生成固定字段；危机词优先，高风险只允许 `help`，记录不足两条只允许 `checkin`。

- [ ] **Step 4: 运行并确认 GREEN**

Run: `node tests/decision-policy-tests.js`

Expected: 所有决策字段和 Safety Gate 断言通过。

- [ ] **Step 5: 检查点**

Run: `node tests/run-rule-tests.js`

Expected: 原 20 条规则用例仍通过。

### Task 3: 个性化三次门槛与高风险排除

**Files:**
- Modify: `tests/decision-policy-tests.js`
- Modify: `src/rules/personalization.js`
- Modify: `src/rules/browser-engine.js`
- Modify: `tests/run-rule-tests.js`

- [ ] **Step 1: 写 0、2、3 次反馈的失败测试**

```javascript
const base = ["breathe", "walk", "journal"];
assert.deepEqual(personalizeRecommendation(base, { journal: { count: 2, totalDelta: 20 } }), base);
assert.equal(personalizeRecommendation(base, { journal: { count: 3, totalDelta: 27 } })[0], "journal");
assert.equal(personalizationStatus({ journal: { count: 2 } }).formed, false);
assert.equal(personalizationStatus({ journal: { count: 3 } }).formed, true);
```

高风险完成记录传入时，`recordSafeFeedback(stats, feedback)` 必须保持统计不变并增加 `excludedHighRisk`。

- [ ] **Step 2: 运行并确认 RED**

Run: `node tests/decision-policy-tests.js`

Expected: FAIL，当前两次反馈会影响排序，且缺少状态/排除 API。

- [ ] **Step 3: 实现门槛**

```javascript
export const PERSONALIZATION_MIN_SAFE_FEEDBACK = 3;

export function personalizationStatus(stats = {}) {
  const count = Object.values(stats).reduce((sum, stat) => sum + (stat.safeCount || stat.count || 0), 0);
  return { formed: count >= 3, safeFeedbackCount: count, required: 3, excludedHighRisk: stats.__meta?.excludedHighRisk || 0 };
}
```

`personalizeRecommendation()` 在有效普通反馈总数小于 3 时返回原顺序。浏览器 UMD 实现同步相同逻辑。

- [ ] **Step 4: 运行并确认 GREEN**

Run:

```powershell
node tests/decision-policy-tests.js
node tests/run-rule-tests.js
```

Expected: 新边界测试和更新后的 P02 全部通过。

### Task 4: 备忘录领域模型

**Files:**
- Create: `tests/memo-model-tests.js`
- Create: `src/features/memo/memo-model.js`

- [ ] **Step 1: 写自动编号失败测试**

```javascript
await import("../src/features/memo/memo-model.js");
const memo = globalThis.MindPulseMemoModel.createMemo("竞赛准备");
let next = globalThis.MindPulseMemoModel.insertItem(memo, 0, "准备答辩稿");
next = globalThis.MindPulseMemoModel.insertItem(next, 1, "检查比赛材料");
next = globalThis.MindPulseMemoModel.insertItem(next, 1, "补充国赛截图");
assert.deepEqual(globalThis.MindPulseMemoModel.numberedItems(next).map((x) => x.number), [1, 2, 3]);
next = globalThis.MindPulseMemoModel.removeItem(next, next.items[1].id);
assert.deepEqual(globalThis.MindPulseMemoModel.numberedItems(next).map((x) => x.number), [1, 2]);
```

再断言事项文本不包含持久化编号字段，空事项不进入 `numberedItems()`。

- [ ] **Step 2: 写联想搜索失败测试**

```javascript
const results = globalThis.MindPulseMemoModel.searchMemos([next], "竞赛");
assert.equal(results[0].memo.id, next.id);
assert.equal(results[0].reason, "联想词：比赛/国赛/答辩");
```

- [ ] **Step 3: 运行并确认 RED**

Run: `node tests/memo-model-tests.js`

Expected: FAIL，因为模型文件不存在。

- [ ] **Step 4: 实现不可变事项操作与搜索**

```javascript
function numberedItems(memo) {
  return memo.items
    .filter(function (item) { return item.text.trim(); })
    .map(function (item, index) { return { id: item.id, text: item.text, number: index + 1 }; });
}

function insertItem(memo, index, text) {
  var items = memo.items.slice();
  items.splice(Math.max(0, Math.min(index, items.length)), 0, makeItem(text));
  return touchMemo(memo, items);
}
```

同义词表固定导出为 `SEARCH_SYNONYMS`，搜索评分按标题直接命中、事项直接命中、联想词、字符重合度排序。

- [ ] **Step 5: 运行并确认 GREEN**

Run: `node tests/memo-model-tests.js`

Expected: 插入、删除、空事项和联想搜索全部通过。

### Task 5: 日程领域模型

**Files:**
- Create: `tests/schedule-model-tests.js`
- Create: `src/features/schedule/schedule-model.js`

- [ ] **Step 1: 写范围和排序失败测试**

```javascript
const now = new Date("2026-07-27T09:00:00+08:00");
const items = [
  { id: "a", title: "第八天", dueAt: "2026-08-03T18:00:00+08:00", done: false },
  { id: "b", title: "明天", dueAt: "2026-07-28T10:00:00+08:00", done: false },
  { id: "c", title: "已完成", dueAt: "2026-07-28T08:00:00+08:00", done: true }
];
assert.deepEqual(itemsInRange(items, now, 8).map((x) => x.id), ["b", "a"]);
assert.equal(startOfWeek(now).getDay(), 1);
```

同时断言第 9 天不在 8 天范围、无截止时间排末尾、月/年分组键正确。

- [ ] **Step 2: 运行并确认 RED**

Run: `node tests/schedule-model-tests.js`

Expected: FAIL，因为模型文件不存在。

- [ ] **Step 3: 实现本地日期模型**

```javascript
function startOfLocalDay(value) {
  var date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function itemsInRange(items, from, days) {
  var start = startOfLocalDay(from);
  var end = new Date(start);
  end.setDate(end.getDate() + days - 1);
  end.setHours(23, 59, 59, 999);
  return normalizeItems(items)
    .filter(function (item) { return !item.done && item.dueAt && new Date(item.dueAt) >= start && new Date(item.dueAt) <= end; })
    .sort(function (a, b) { return new Date(a.dueAt) - new Date(b.dueAt); });
}
```

- [ ] **Step 4: 运行并确认 GREEN**

Run: `node tests/schedule-model-tests.js`

Expected: 周一开周、8 天边界和截止时间排序通过。

### Task 6: 漂流瓶本地仓储与后端替换接口

**Files:**
- Create: `tests/bottle-repository-tests.js`
- Create: `src/features/bottle/bottle-repository.js`

- [ ] **Step 1: 写仓储失败测试**

```javascript
const storage = makeMemoryStorage();
const repo = createLocalBottleRepository(storage, { random: () => 0 });
const own = repo.createBottle("profile-a", "最近比赛压力有点大");
const drawn = repo.drawBottle("profile-a");
assert.notEqual(drawn.ownerId, "profile-a");
repo.replyToBottle("profile-a", drawn.id, "希望你今晚能休息一下");
assert.deepEqual(repo.listRepliesForOwnBottle("profile-a", own.id), []);
assert.deepEqual(repo.listRepliesForOwnBottle("profile-b", own.id), []);
```

另外断言仓储实例包含设计规定的五个方法，空内容不创建，演示瓶不泄露真实身份。

- [ ] **Step 2: 运行并确认 RED**

Run: `node tests/bottle-repository-tests.js`

Expected: FAIL，因为仓储文件不存在。

- [ ] **Step 3: 实现接口**

```javascript
function createLocalBottleRepository(storage, options) {
  return {
    listOwnBottles: listOwnBottles,
    createBottle: createBottle,
    drawBottle: drawBottle,
    replyToBottle: replyToBottle,
    listRepliesForOwnBottle: listRepliesForOwnBottle
  };
}
```

内置演示瓶池只含匿名昵称、非危机示例文本和稳定 ID；当前档案回复保存在 `mindpulse:<profileId>:bottleReplies`。

- [ ] **Step 4: 运行并确认 GREEN**

Run: `node tests/bottle-repository-tests.js`

Expected: 随机捞取、回复隔离、空内容和接口契约通过。

### Task 7: 集成存储、导出与清除

**Files:**
- Create: `tests/convergence-ui-smoke.js`（先加入存储断言）
- Modify: `心晴MindPulse_Web原型.html`

- [ ] **Step 1: 写失败 UI/存储断言**

```javascript
const exported = await exportFromSettings(page);
assert(Array.isArray(exported.memos), "export should include memos");
assert(Array.isArray(exported.scheduleItems), "export should include scheduleItems");
assert(Array.isArray(exported.bottles), "export should include own bottles");
```

删除档案后检查 `memos`、`scheduleItems`、`bottles`、`bottleReplies` 四个 profile key 均为空。

加入损坏存储与写入失败断言：

```javascript
await page.evaluate(() => localStorage.setItem("mindpulse:local-demo:memos", "{broken"));
await page.reload();
assert.equal(await page.locator("[data-memo-card]").count(), 0, "broken memo JSON should fall back to an empty collection");
await page.evaluate(() => {
  const original = Storage.prototype.setItem;
  Storage.prototype.setItem = function () { throw new DOMException("quota", "QuotaExceededError"); };
  window.__restoreStorageSetItem = () => { Storage.prototype.setItem = original; };
});
```

执行一次保存后断言页面仍保留编辑内容并显示“本机存储空间不足或不可用”，随后调用 `window.__restoreStorageSetItem()`。

- [ ] **Step 2: 运行并确认 RED**

Run: `node tests/convergence-ui-smoke.js`

Expected: FAIL，导出缺少新增集合。

- [ ] **Step 3: 扩展状态和存储**

在主 HTML 增加：

```javascript
memos: loadProfileCollection("memos"),
scheduleItems: loadProfileCollection("scheduleItems"),
bottleRepository: createBottleRepositoryForProfile(),
memoView: "list",
scheduleView: "week"
```

`persistState()`、`enterProfile()`、`deleteCurrentProfile()`、`exportRecords()` 和 `clearLocalData()` 同步处理新增键。读取时仅接受数组和规范化对象。

- [ ] **Step 4: 运行并确认 GREEN**

Run: `node tests/convergence-ui-smoke.js`

Expected: 新增集合可导出并随档案删除。

### Task 8: 首页、决策详情、Safety Gate 与规则实验室

**Files:**
- Modify: `tests/convergence-ui-smoke.js`
- Modify: `心晴MindPulse_Web原型.html`

- [ ] **Step 1: 写首页与安全失败测试**

```javascript
assert(body.includes("个人节奏偏移"));
assert(body.includes("数据完整度"));
assert(body.includes("当前安全策略"));
assert(body.includes("当前策略允许的下一步"));
assert(!isLargestText("本次记录指数"));
```

设置高风险记录后，断言点击 Companion 导航仍进入求助页；通过 `MindPulseDebug.openIntervention("breathe")` 必须抛出 `SAFETY_GATE_BLOCKED`。

- [ ] **Step 2: 写 LAB 场景失败测试**

```javascript
for (const id of ["LAB-01", "LAB-02", "LAB-03"]) {
  await page.click(`[data-lab-scenario="${id}"]`);
  assert((await page.locator("[data-lab-result]").innerText()).includes(id));
}
assert((await selectLab("LAB-03")).includes("只允许求助"));
```

- [ ] **Step 3: 运行并确认 RED**

Run: `node tests/convergence-ui-smoke.js`

Expected: FAIL，首页仍以恢复指数为主且 LAB 场景不存在。

- [ ] **Step 4: 加载模块并接入策略**

在现有浏览器规则脚本后加入：

```html
<script src="src/domain/decision-policy.js"></script>
<script src="src/features/memo/memo-model.js"></script>
<script src="src/features/schedule/schedule-model.js"></script>
<script src="src/features/bottle/bottle-repository.js"></script>
```

增加 `currentDecisionTrace()` 作为首页、导航、行动命令和规则实验室的唯一策略来源。`openIntervention()` 与 `markInterventionComplete()` 开头调用 `assertActionAllowed()`。

- [ ] **Step 5: 重排首页**

保持原 `status-card` 大小和圆角，只将主标题替换为基线标题，增加四项偏移网格、数据完整度、策略标签和允许动作。将指数缩为小型 badge；新增备忘录和日程紧凑入口。

- [ ] **Step 6: 实现 LAB-01/02/03**

场景按钮只存输入记录，输出实时调用 `evaluateState()`；结果展示固定字段和“合成演示场景”标记。

- [ ] **Step 7: 运行并确认 GREEN**

Run:

```powershell
node tests/convergence-ui-smoke.js
node tests/run-rule-tests.js
```

Expected: 新首页、安全路径、LAB 场景和原规则测试通过。

### Task 9: 备忘录、日程与漂流瓶页面

**Files:**
- Modify: `tests/convergence-ui-smoke.js`
- Modify: `心晴MindPulse_Web原型.html`

- [ ] **Step 1: 写备忘录完整路径失败测试**

```javascript
await openMemo(page);
await page.click("#memoCreate");
await page.fill("#memoTitle", "国赛准备");
await addMemoItem(page, "检查比赛材料");
await insertMemoItemAfter(page, 0, "完善答辩稿");
assert.deepEqual(await page.locator("[data-memo-number]").allInnerTexts(), ["1", "2"]);
await deleteMemoItem(page, 0);
assert.deepEqual(await page.locator("[data-memo-number]").allInnerTexts(), ["1"]);
await searchMemos(page, "竞赛");
assert((await page.locator("[data-memo-card]").innerText()).includes("国赛准备"));
```

- [ ] **Step 2: 写日程与漂流瓶失败测试**

新增明天和第八天事项，切换周/月/年，选择 8 天范围，断言两个事项按日期排序。投放瓶子、随机捞取、回复并检查“本机演示海域”标记。

再覆盖边界：空白笔记标题显示“未命名笔记”；纯空白事项不显示编号；结束日期早于开始日期时页面给出明确提示且不保存；空白漂流瓶不会创建；快速双击投放按钮只生成一个瓶子。

- [ ] **Step 3: 运行并确认 RED**

Run: `node tests/convergence-ui-smoke.js`

Expected: FAIL，新页面入口尚未实现。

- [ ] **Step 4: 实现备忘录列表与详情**

增加 `renderMemoList()`、`renderMemoDetail()`、`saveMemoDraft()`。列表使用现有圆角卡片、搜索框和浮动新增按钮；详情使用返回栏、标题输入、更新时间和事项行。事项行编号来自 `numberedItems()`，插入/删除后重新渲染，不把编号写入数据。

- [ ] **Step 5: 实现日程页面**

增加 `renderSchedule()`，默认 `week`；分段控件切换 `week/month/year`。日期范围按钮传入 `itemsInRange()`，按 deadline 升序展示。底部暖心话从固定安全文案数组选择。

- [ ] **Step 6: 实现漂流瓶页面**

增加 `renderBottleSea()`、投放、随机捞取、回复和“我的瓶子”视图。页面明确显示“本机演示海域，尚未连接真实社区”。

- [ ] **Step 7: 运行并确认 GREEN**

Run:

```powershell
node tests/memo-model-tests.js
node tests/schedule-model-tests.js
node tests/bottle-repository-tests.js
node tests/convergence-ui-smoke.js
```

Expected: 三个领域模块和完整 UI 路径通过。

### Task 10: iPhone 14 Pro 排版与视觉回归

**Files:**
- Create: `tests/convergence-visual-smoke.js`
- Modify: `心晴MindPulse_Web原型.html`
- Modify: `tests/ui-smoke.js`

- [ ] **Step 1: 写 393 x 852 失败测试**

```javascript
const viewports = [
  { width: 393, height: 852, expectedAppWidth: 393 },
  { width: 375, height: 667, expectedAppWidth: 375 },
  { width: 430, height: 932, expectedAppWidth: 393 },
  { width: 1024, height: 768, expectedAppWidth: 393 }
];
```

每个视口断言：`scrollWidth <= clientWidth`、应用宽度符合预期、底部导航不遮挡最后一个内容元素、主要按钮高度不小于 44、长标题不溢出。

- [ ] **Step 2: 运行并确认 RED**

Run: `node tests/convergence-visual-smoke.js`

Expected: 430/1024 下应用仍为 430 px，主基准不符合 393 px。

- [ ] **Step 3: 最小 CSS 适配**

```css
#app {
  width: min(100%, 393px);
  max-width: 393px;
  min-height: 100dvh;
  margin: 0 auto;
}
.nb { padding-top: calc(18px + env(safe-area-inset-top, 0px)); }
.tabbar { padding-bottom: env(safe-area-inset-bottom, 0px); }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
```

不更改现有基础字号、圆角、卡片 padding 和导航相对尺寸。仅在新组件内补局部响应式规则。

- [ ] **Step 4: 更新旧 UI 测试主视口**

将 `tests/ui-smoke.js` 的 430 x 932 改为 393 x 852，并保留 430 兼容检查在视觉测试中。

- [ ] **Step 5: 运行并确认 GREEN**

Run:

```powershell
node tests/convergence-visual-smoke.js
node tests/ui-smoke.js
```

Expected: 四个视口均无横向溢出、遮挡或画布拉伸。

### Task 11: 文档、完整验证与最终检查

**Files:**
- Modify: `README.md`
- Modify: `docs/当前测试与自查报告.md`

- [ ] **Step 1: 更新 README**

增加：可审计策略、三层 Safety Gate、备忘录自动编号/联想搜索、日程、漂流瓶本地演示、iPhone 14 Pro 主视口和未来后端替换接口。明确漂流瓶不是已上线社区。

- [ ] **Step 2: 安装锁定依赖（仅在缺失时）**

Run: `npm.cmd install`

Expected: 按 `package-lock.json` 安装 Playwright，不升级依赖版本。

- [ ] **Step 3: 运行领域与规则验证**

```powershell
npm.cmd run test:domain
npm.cmd run test:rules
npm.cmd run analyze:synthetic
```

Expected: 全部退出码为 0。

- [ ] **Step 4: 运行浏览器与视觉验证**

```powershell
npm.cmd run test:ui
npm.cmd run test:convergence:ui
npm.cmd run test:convergence:visual
npm.cmd run demo:smoke
```

Expected: 全部退出码为 0，无 pageerror、console error、横向溢出或遮挡。

- [ ] **Step 5: 运行提交前审查**

Run: `npm.cmd run preflight`

Expected: 文案安全、自我审查、DOCX 口径、演示路径、规则、合成分析和 UI 测试全部通过。

- [ ] **Step 6: Playwright 截图复核**

在 393 x 852 对匿名档案、首页正反面、备忘录列表/详情、日程周视图、漂流瓶、LAB-03 和高风险求助页截图；在 375 x 667、430 x 932、1024 x 768 对首页和备忘录详情截图。逐张检查字体、卡片、编号、导航、滚动和视觉比例。

- [ ] **Step 7: 最终差异检查**

确认备份 HTML 未改变；主 HTML 不引用外部字体、图片或 API；没有未完成占位标记、假后端成功文案或把合成演示写成真实用户结果。
