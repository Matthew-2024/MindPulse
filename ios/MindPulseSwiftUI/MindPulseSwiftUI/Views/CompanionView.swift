import SwiftUI

struct CompanionView: View {
    @EnvironmentObject private var store: MindPulseStore
    @State private var currentIndex = 0

    var body: some View {
        let plan = store.plan
        let safeIndex = min(currentIndex, max(0, plan.path.count - 1))
        let current = plan.path[safeIndex]

        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    SectionHeader(title: "陪伴", subtitle: "今天只走一步。")

                    MPCard(tint: Color.mint.opacity(0.10)) {
                        HStack {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("陪伴路线")
                                    .font(.subheadline.bold())
                                    .foregroundStyle(.mint)
                                Text(plan.title)
                                    .font(.title2.bold())
                            }
                            Spacer()
                            Text("\(safeIndex + 1) / \(plan.path.count)")
                                .font(.headline)
                                .padding(10)
                                .background(Color.white.opacity(0.72), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                        }
                        Text("依据：\(plan.reasons.joined(separator: "、"))")
                            .foregroundStyle(.secondary)
                        ForEach(Array(plan.path.enumerated()), id: \.offset) { index, id in
                            InterventionRow(id: id, detail: index == safeIndex ? "现在这一步" : nil)
                        }
                    }

                    LearningCard()

                    MPCard {
                        Text("现在这一步：\(current.title)")
                            .font(.title3.bold())
                        Text("先完成这一小步，完成后会写回首页恢复指数。")
                            .foregroundStyle(.secondary)
                        PrimaryButton(title: "完成这一步", systemImage: current.symbol) {
                            if current == .help {
                                store.selectedTab = .help
                            } else {
                                store.complete(current)
                                currentIndex = safeIndex + 1 >= plan.path.count ? 0 : safeIndex + 1
                            }
                        }
                        SecondaryButton(title: safeIndex + 1 >= plan.path.count ? "已到最后一步" : "换下一步", systemImage: "arrow.forward") {
                            currentIndex = safeIndex + 1 >= plan.path.count ? safeIndex : safeIndex + 1
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("陪伴")
            .mindPulseBackground()
        }
    }
}

struct LearningCard: View {
    @EnvironmentObject private var store: MindPulseStore

    var body: some View {
        MPCard {
            Text("干预反馈学习")
                .font(.headline)
            if let best = store.learningRows().max(by: { $0.stat.averageDelta < $1.stat.averageDelta }) {
                Text("因为你过去完成「\(best.id.title)」后平均提升 \(best.stat.averageDelta) 分，今天会优先参考这类动作。")
                    .foregroundStyle(.secondary)
            }
            ForEach(store.learningRows()) { row in
                InterventionRow(id: row.id, detail: "完成 \(row.stat.count) 次，平均提升 \(row.stat.averageDelta) 分")
            }
        }
    }
}
