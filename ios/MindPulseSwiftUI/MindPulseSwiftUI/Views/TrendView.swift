import SwiftUI

struct TrendView: View {
    @EnvironmentObject private var store: MindPulseStore

    var body: some View {
        let baseline = store.baseline
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    SectionHeader(title: "趋势", subtitle: "只看这一周最重要的变化。")

                    MPCard(tint: Color.mint.opacity(0.10)) {
                        Text(baseline.flags.isEmpty ? "今天接近自己的正常节奏" : "今天出现个人基线偏移")
                            .font(.title2.bold())
                        Text(baseline.flags.isEmpty ? "睡眠、活动和连接感没有明显低于你的近几天基线。" : baseline.flags.joined(separator: "；"))
                            .foregroundStyle(.secondary)
                        HStack(spacing: 10) {
                            MetricTile(title: "平均睡眠", value: "\(baseline.normalSleep, specifier: "%.1f")h")
                            MetricTile(title: "低睡眠", value: "\(store.records.suffix(4).filter { $0.sleepHours < 6 }.count) 天")
                            MetricTile(title: "总步数", value: "\(store.records.reduce(0) { $0 + $1.steps } / 1000)k")
                        }
                    }

                    MPCard {
                        Text("个人基线对比")
                            .font(.headline)
                        Text("我的正常水平：睡眠 \(baseline.normalSleep, specifier: "%.1f")h / 步数 \(Int(baseline.normalSteps)) / 连接 \(Int(baseline.normalSocial))%")
                        Text("今天：睡眠 \(store.latestRecord.sleepHours, specifier: "%.1f")h / 步数 \(store.latestRecord.steps) / 连接 \(store.latestRecord.socialScore)%")
                        Text("偏移：\(baseline.level)")
                            .font(.headline)
                    }

                    MPCard {
                        Text("情绪起伏轨迹")
                            .font(.headline)
                        HStack(alignment: .bottom, spacing: 8) {
                            ForEach(store.records) { record in
                                VStack(spacing: 6) {
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(color(for: record.mood))
                                        .frame(height: CGFloat(36 + record.mood.level * 18))
                                        .overlay(Image(systemName: record.mood.symbol).foregroundStyle(.white))
                                    Text(record.date, style: .date)
                                        .font(.system(size: 8))
                                        .foregroundStyle(.secondary)
                                }
                                .frame(maxWidth: .infinity)
                            }
                        }
                        .frame(height: 170)
                    }
                }
                .padding()
            }
            .navigationTitle("趋势")
            .mindPulseBackground()
        }
    }

    private func color(for mood: Mood) -> Color {
        switch mood {
        case .happy: return .mint
        case .calm: return .blue
        case .anxious: return .orange
        case .sad: return .purple.opacity(0.75)
        case .tired: return .gray
        case .angry: return .red.opacity(0.7)
        }
    }
}
