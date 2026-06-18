import SwiftUI

struct RuleLabView: View {
    @Environment(\.dismiss) private var dismiss

    private var results: [RuleLabResult] {
        RISEEngine.ruleCases().map { ruleCase in
            let risk = RISEEngine.assessRisk(records: ruleCase.records)
            let plan = RISEEngine.recommendPath(record: ruleCase.records.last!, risk: risk, stats: [:])
            return RuleLabResult(ruleCase: ruleCase, actualRisk: risk.level, actualPath: plan.path)
        }
    }

    private var baselineSample: BaselineSample {
        let records = [
            labRecord(.calm, sleep: 7.2, steps: 7200, social: 66, note: "正常上课，状态平稳", dayOffset: -5),
            labRecord(.calm, sleep: 7.0, steps: 6900, social: 62, note: "图书馆学习，节奏正常", dayOffset: -4),
            labRecord(.happy, sleep: 7.5, steps: 8100, social: 72, note: "和同学吃饭，状态不错", dayOffset: -3),
            labRecord(.calm, sleep: 6.8, steps: 6600, social: 58, note: "正常复习", dayOffset: -2),
            labRecord(.anxious, sleep: 4.6, steps: 1900, social: 20, note: "今天明显不想动，也不想说话", dayOffset: 0)
        ]
        let baseline = RISEEngine.calculateBaseline(records: records)
        return BaselineSample(baseline: baseline, passed: baseline.flags.count >= 2)
    }

    private var personalizedSample: PersonalizedSample {
        let record = labRecord(.anxious, sleep: 6.4, steps: 4100, social: 42, note: "想到答辩有点紧张", dayOffset: 0)
        let stats: [InterventionID: InterventionStat] = [
            .journal: InterventionStat(count: 8, totalDelta: 96, lastDelta: 12, lastAt: nil),
            .breathe: InterventionStat(count: 2, totalDelta: 2, lastDelta: 1, lastAt: nil),
            .walk: InterventionStat(count: 1, totalDelta: 0, lastDelta: 0, lastAt: nil)
        ]
        let risk = RISEEngine.assessRisk(records: [record])
        let plan = RISEEngine.recommendPath(record: record, risk: risk, stats: stats)
        return PersonalizedSample(path: plan.path, passed: plan.path.first == .journal)
    }

    private var safetyGateSample: SafetyGateSample {
        let record = labRecord(.sad, sleep: 3.5, steps: 900, social: 12, note: "我撑不住了，想消失", dayOffset: 0)
        let risk = RISEEngine.assessRisk(records: [record])
        let plan = RISEEngine.recommendPath(record: record, risk: risk, stats: [:])
        return SafetyGateSample(risk: risk.level, path: plan.path, passed: risk.level == .high && plan.path == [.help])
    }

    var body: some View {
        let passCount = results.filter(\.passed).count
        let safety = safetyGateSample
        let baseline = baselineSample
        let personalized = personalizedSample
        let personalizationPassCount = [baseline.passed, personalized.passed].filter { $0 }.count
        let verificationTotal = results.count + 2
        let verificationPassed = passCount + personalizationPassCount

        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    SectionHeader(title: "规则实验室", subtitle: "用样例验证 RISE、Safety Gate 和个性化排序。")

                    MPCard(tint: Color.mint.opacity(0.10)) {
                        Text("自动验证概览")
                            .font(.headline)
                        HStack(spacing: 10) {
                            MetricTile(title: "规则用例", value: "\(passCount)/\(results.count)")
                            MetricTile(title: "个性化", value: "\(personalizationPassCount)/2")
                            MetricTile(title: "自动验证", value: "\(verificationPassed)/\(verificationTotal)")
                        }
                    }

                    MPCard {
                        Text("RISE 方法拆解")
                            .font(.headline)
                        Label("Rhythm：睡眠、步数等日常节奏", systemImage: "waveform.path.ecg")
                        Label("Interaction：社交连接与求助意愿", systemImage: "person.2")
                        Label("Self-report：情绪自评和一句话记录", systemImage: "text.bubble")
                        Label("Engagement：干预完成后的反馈学习", systemImage: "checkmark.seal")
                    }

                    MPCard {
                        Text("13 条规则样例")
                            .font(.headline)
                        ForEach(results) { result in
                            RuleResultRow(result: result)
                        }
                    }

                    MPCard(tint: baseline.passed ? Color.mint.opacity(0.10) : Color.red.opacity(0.10)) {
                        Text("P01 个人基线偏移")
                            .font(.headline)
                        Text(baseline.passed ? "通过：当前记录明显低于个人近几天基线。" : "失败：未识别出足够的基线偏移。")
                            .font(.subheadline.bold())
                        Text("正常水平：睡眠 \(baseline.baseline.normalSleep, specifier: "%.1f")h / 步数 \(Int(baseline.baseline.normalSteps)) / 连接 \(Int(baseline.baseline.normalSocial))%")
                        Text("偏移结论：\(baseline.baseline.flags.isEmpty ? baseline.baseline.level : baseline.baseline.flags.joined(separator: "；"))")
                            .foregroundStyle(.secondary)
                    }

                    MPCard(tint: personalized.passed ? Color.mint.opacity(0.10) : Color.red.opacity(0.10)) {
                        Text("P02 个性化推荐排序")
                            .font(.headline)
                        Text(personalized.passed ? "通过：历史反馈使「写下想法」提前到推荐首位。" : "失败：个性化反馈没有影响排序。")
                            .font(.subheadline.bold())
                        ForEach(personalized.path) { id in
                            InterventionRow(id: id)
                        }
                    }

                    MPCard(tint: safety.passed ? Color.mint.opacity(0.10) : Color.red.opacity(0.10)) {
                        Text("Safety Gate 危机拦截")
                            .font(.headline)
                        Text(safety.passed ? "通过：危机文本触发高风险，推荐路径切换为求助入口。" : "失败：危机文本未正确拦截。")
                            .font(.subheadline.bold())
                        Text("实际风险：\(safety.risk.rawValue)")
                        ForEach(safety.path) { id in
                            InterventionRow(id: id)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("规则实验室")
            .mindPulseBackground()
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("关闭") { dismiss() }
                }
            }
        }
    }

    private func labRecord(_ mood: Mood, sleep: Double, steps: Int, social: Int, note: String, dayOffset: Int) -> MindPulseRecord {
        MindPulseRecord(
            date: Calendar.current.date(byAdding: .day, value: dayOffset, to: Date()) ?? Date(),
            mood: mood,
            sleepHours: sleep,
            steps: steps,
            socialScore: social,
            energyLevel: .mid,
            connectionNeed: .ok,
            note: note,
            dataInputMode: "ios-rule-lab",
            completedInterventions: []
        )
    }
}

private struct RuleResultRow: View {
    var result: RuleLabResult

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Label(result.ruleCase.id, systemImage: result.passed ? "checkmark.circle.fill" : "xmark.circle.fill")
                    .font(.subheadline.bold())
                    .foregroundStyle(result.passed ? Color.mint : Color.red)
                Text(result.ruleCase.name)
                    .font(.subheadline.bold())
                Spacer()
            }
            Text("风险：预期 \(result.ruleCase.expectedRisk.rawValue)，实际 \(result.actualRisk.rawValue)")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text("路径：\(result.actualPath.map(\.title).joined(separator: " -> "))")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(12)
        .background(Color.white.opacity(0.72), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

private struct RuleLabResult: Identifiable {
    var ruleCase: RuleCase
    var actualRisk: RiskLevel
    var actualPath: [InterventionID]

    var id: String { ruleCase.id }

    var passed: Bool {
        actualRisk == ruleCase.expectedRisk && actualPath == ruleCase.expectedPath
    }
}

private struct BaselineSample {
    var baseline: BaselineResult
    var passed: Bool
}

private struct PersonalizedSample {
    var path: [InterventionID]
    var passed: Bool
}

private struct SafetyGateSample {
    var risk: RiskLevel
    var path: [InterventionID]
    var passed: Bool
}
