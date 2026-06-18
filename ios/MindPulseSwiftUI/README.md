# 心晴 MindPulse SwiftUI 原型

这个目录是独立的 iOS SwiftUI 版本，不共用 Web 原型的 HTML、CSS 或 JavaScript 文件。

## 目录结构

```text
MindPulseSwiftUI/
  App/
    MindPulseSwiftUIApp.swift
  Models/
    MindPulseModels.swift
  Services/
    MindPulseStore.swift
    RISEEngine.swift
  Views/
    Components.swift
    RootView.swift
    HomeView.swift
    CheckInView.swift
    TrendView.swift
    CompanionView.swift
    HelpView.swift
    SettingsView.swift
    RuleLabView.swift
```

## 在 Xcode 中使用

1. 在 Mac 上打开 Xcode，创建一个新的 iOS App 项目。
2. Interface 选择 `SwiftUI`，Language 选择 `Swift`。
3. 删除 Xcode 自动生成的默认 `ContentView.swift` 和默认 App 文件。
4. 将本目录下 `MindPulseSwiftUI` 文件夹里的 `App`、`Models`、`Services`、`Views` 添加到 Xcode 项目中。
5. 推荐 Deployment Target 使用 iOS 16 或更高版本。

## 已实现页面

- 匿名档案入口：支持多个本地匿名档案。
- 首页：MindPulse-RISE 恢复指数、风险等级、Safety Gate 和推荐第一步。
- 记录：情绪、睡眠、步数、连接感、精力、文字记录。
- 趋势：个人基线、睡眠/活动/连接偏移、情绪轨迹。
- 陪伴：按推荐路径完成轻干预，并写回反馈学习。
- 求助：Safety Gate 流程和求助话术生成。
- 设置：档案管理、重置演示数据、验证证据板、规则实验室入口。
- 规则实验室：13 条规则样例、P01 个人基线、P02 个性化排序、危机拦截验证，自动汇总为 15 条验证结果。

## 与 Web 版同步的竞赛级强化

- iOS 版已补齐与 Web 规则实验室一致的 R01-R13 规则用例。
- `RiskAssessment` 增加 `desc` 和 `evidence`，首页判断详情可展示 Safety Gate 证据。
- 设置页“匿名试验摘要”已改为“验证证据板”，从当前本地档案即时计算记录数、平均 RISE、干预覆盖率和 Safety Gate 触发数。
- 验证证据板只用于演示规则链路，不伪装成真实用户研究数据。

## 当前限制

- 数据目前保存在本机 `UserDefaults`，适合比赛原型和单机演示。
- 三个人跨设备共享数据需要后续接入后端或 CloudKit。
- 当前仓库运行环境是 Windows，不能直接用 Xcode 编译验证；需要在 Mac 上打开后做一次编译检查。
