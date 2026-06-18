import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var store: MindPulseStore
    @State private var showingDetail = false

    var body: some View {
        let baseline = store.baseline
        let risk = store.risk
        let plan = store.plan
        let score = store.score

        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 22) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("MindPulse-RISE")
                            .font(.subheadline.bold())
                            .foregroundStyle(Color.mint)
                        Text(risk.level == .high ? "先联系一个可信任的人" : plan.title)
                            .font(.largeTitle.bold())
                            .lineSpacing(2)
                    }
                    Spacer()
                    VStack(spacing: 4) {
                        Text("\(score.total)")
                            .font(.system(size: 44, weight: .heavy, design: .rounded))
                        Text("恢复指数")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(14)
                    .background(Color.mint.opacity(0.14), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 24, style: .continuous).stroke(Color.mint.opacity(0.24), lineWidth: 1))
                }

                Text(risk.level == .high ? "现在不安排普通练习，先把求助这一步发出去。" : "今天先不用解决所有事，只走第一步就够了。")
                    .font(.body)
                    .foregroundStyle(.secondary)

                HStack(spacing: 10) {
                    MetricTile(title: "睡眠偏移", value: "\(baseline.sleepPercentDelta)%")
                    MetricTile(title: "风险等级", value: risk.level.rawValue)
                    MetricTile(title: "Safety Gate", value: risk.safetyGateLabel)
                }

                HStack(spacing: 12) {
                    PrimaryButton(title: risk.level == .high ? "打开求助入口" : "开始第一步", systemImage: risk.level == .high ? "phone.fill" : "arrow.right") {
                        if risk.level == .high {
                            store.selectedTab = .help
                        } else if let first = plan.path.first {
                            store.complete(first)
                        }
                    }
                    SecondaryButton(title: "看依据", systemImage: "doc.text.magnifyingglass") {
                        showingDetail = true
                    }
                }
            }
            .padding(24)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        }
        .mindPulseBackground()
        .sheet(isPresented: $showingDetail) {
            NavigationStack {
                DetailView()
            }
        }
    }
}

struct DetailView: View {
    @EnvironmentObject private var store: MindPulseStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        let score = store.score
        let risk = store.risk
        let plan = store.plan
        let baseline = store.baseline

        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                SectionHeader(title: "判断详情", subtitle: "把分数、依据和下一步讲清楚。")
                MPCard {
                    Text("RISE 方法")
                        .font(.headline)
                    Text("Rhythm 节奏 + Interaction 连接 + Self-report 自评 + Engagement 干预反馈。")
                        .foregroundStyle(.secondary)
                }
                MPCard {
                    Text("恢复指数 \(score.total)")
                        .font(.title2.bold())
                    Text(score.explanation)
                        .foregroundStyle(.secondary)
                    VStack(spacing: 8) {
                        scoreLine("情绪", score.breakdown.mood, 60)
                        scoreLine("睡眠", score.breakdown.sleep, 18)
                        scoreLine("活动", score.breakdown.steps, 14)
                        scoreLine("连接", score.breakdown.social, 12)
                        scoreLine("干预完成", score.breakdown.intervention, 8)
                    }
                }
                MPCard {
                    Text("个人基线对比")
                        .font(.headline)
                    Text(baseline.desc)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    Text("我的正常水平：睡眠 \(baseline.normalSleep, specifier: "%.1f")h / 步数 \(Int(baseline.normalSteps)) / 连接 \(Int(baseline.normalSocial))%")
                    Text("今天：睡眠 \(store.latestRecord.sleepHours, specifier: "%.1f")h / 步数 \(store.latestRecord.steps) / 连接 \(store.latestRecord.socialScore)%")
                    Text("偏移：\(baseline.level)")
                        .font(.headline)
                }
                MPCard(tint: Color.orange.opacity(0.08)) {
                    Text("风险判断")
                        .font(.headline)
                    Text("\(risk.level.rawValue) · \(risk.tag)")
                        .font(.title3.bold())
                    Text(risk.reason)
                        .foregroundStyle(.secondary)
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(risk.evidence, id: \.self) { evidence in
                            Label(evidence, systemImage: "checkmark.seal")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                MPCard(tint: Color.mint.opacity(0.10)) {
                    Text("推荐路径")
                        .font(.headline)
                    ForEach(plan.path) { id in
                        InterventionRow(id: id)
                    }
                    Text("排序依据：\(plan.reasons.joined(separator: "、"))")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .padding()
        }
        .mindPulseBackground()
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("关闭") { dismiss() }
            }
        }
    }

    private func scoreLine(_ title: String, _ value: Int, _ max: Int) -> some View {
        HStack {
            Text(title)
                .font(.caption)
                .frame(width: 64, alignment: .leading)
            ProgressView(value: Double(value), total: Double(max))
                .tint(.mint)
            Text("\(value)")
                .font(.caption.bold())
                .frame(width: 32, alignment: .trailing)
        }
    }
}
