# 心晴 MindPulse 自查截图证据索引

本目录保存当前 Web 原型的自动化截图证据，用于提交前审查、现场演示复核和答辩材料截图来源。截图由下面命令生成：

```bash
npm.cmd run capture:evidence
```

截图只证明当前原型路径可稳定复现，不代表真实用户研究结果或专业审核意见。

## 截图清单

| 文件 | 对应自查项 | 证明内容 |
|---|---|---|
| `01-anonymous-profile.png` | A02、A09 | 匿名档案入口说明不需要手机号/学号，体现数据最小化 |
| `02-home-status.png` | A01、A04 | 首页展示恢复指数、风险等级和 Safety Gate |
| `03-home-evidence.png` | A04 | 首页背面展示判断依据、个人基线和推荐解释 |
| `04-rise-detail.png` | A04 | 详情页展示分数拆解、RISE 方法、风险判断和数据来源 |
| `05-high-risk-feedback.png` | A03、A10 | 高风险记录反馈显示“打开求助入口”，不把普通轻干预作为主路径 |
| `06-help-page.png` | A03、A10 | 求助页展示热线、可信任对象和 Safety Gate 流程 |
| `07-settings-evidence-board.png` | A05、A09 | 设置页展示验证证据板、导出记录和删除本地数据入口；A09 的实际可操作性由 `tests/ui-smoke.js` 校验 |
| `08-rule-lab-20of20.png` | A03、A04 | 规则实验室展示自动化规则测试 20/20 通过和个性化用例 |

## 复验规则

提交前如果修改以下内容，需要重新运行截图采集：

1. 风险词、Safety Gate、求助页或推荐逻辑。
2. 首页恢复指数、解释详情或规则实验室。
3. 匿名档案、隐私、导出、删除或设置页。
4. PPT、答辩脚本或视频中引用了旧截图。

复验后同时运行：

```bash
npm.cmd run verify
```

其中 `tests/ui-smoke.js` 会实际触发 JSON 下载，检查 `mindpulse-records.json` 包含匿名档案、记录、分数拆解和风险结果；随后接受删除确认，并检查当前匿名档案下的记录、干预、问卷和任务本地存储已清空。
