import SwiftUI

struct TrendView: View {
    @EnvironmentObject private var store: MindPulseStore

    var body: some View {
        let baseline = store.baseline
        let daily = store.dailyReport
        let weekly = store.weeklyReport

        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    SectionHeader(title: "日报 / 周报", subtitle: "即时记录、今日时间线和 7 天周报都在这里复盘。")

                    MPCard(tint: Color.mint.opacity(0.10)) {
                        Text(weekly.lowSleepDays >= 3 ? "最近被睡眠拖住" : baseline.title)
                            .font(.title2.bold())
                        Text(baseline.desc)
                            .foregroundStyle(.secondary)
                        HStack(spacing: 10) {
                            MetricTile(title: "平均睡眠", value: String(format: "%.1fh", baseline.normalSleep))
                            MetricTile(title: "低睡眠", value: "\(weekly.lowSleepDays) 天")
                            MetricTile(title: "总步数", value: "\(store.records.reduce(0) { $0 + $1.steps } / 1000)k")
                        }
                    }

                    DailyReportCard(report: daily)
                    WeeklyReportCard(report: weekly)

                    MPCard {
                        Text("个人基线对比")
                            .font(.headline)
                        Text("我的正常水平：睡眠 \(baseline.normalSleep, specifier: "%.1f")h / 步数 \(Int(baseline.normalSteps)) / 连接 \(Int(baseline.normalSocial))%")
                        Text("今天：睡眠 \(store.latestRecord.sleepHours, specifier: "%.1f")h / 步数 \(store.latestRecord.steps) / 连接 \(store.latestRecord.socialScore)%")
                        Text("偏移：\(baseline.level)")
                            .font(.headline)
                    }
                }
                .padding()
            }
            .navigationTitle("日报")
            .mindPulseBackground()
        }
    }
}

private struct DailyReportCard: View {
    let report: DailyReport

    var body: some View {
        MPCard {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("今日记录")
                        .font(.caption.bold())
                        .foregroundStyle(.mint)
                    Text(report.title)
                        .font(.title3.bold())
                    Text(report.summary)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                VStack {
                    Text("\(report.records.count)")
                        .font(.title.bold())
                    Text("条")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            HStack(spacing: 10) {
                MetricTile(title: "主要情绪", value: report.mainMood)
                MetricTile(title: "日报均分", value: "\(report.averageScore)")
                MetricTile(title: "风险", value: report.risk.rawValue)
            }

            VStack(alignment: .leading, spacing: 10) {
                ForEach(Array(report.records.prefix(4))) { record in
                    HStack(alignment: .top, spacing: 10) {
                        Text(record.date, style: .time)
                            .font(.caption.bold())
                            .foregroundStyle(.secondary)
                            .frame(width: 54, alignment: .leading)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(record.mood.title)
                                .font(.subheadline.bold())
                            Text(record.note.isEmpty ? "没有填写备注" : record.note)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(record.entryType == "instant" ? "即时" : "今日")
                            .font(.caption2.bold())
                            .foregroundStyle(.mint)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.mint.opacity(0.12), in: Capsule())
                    }
                    .padding(10)
                    .background(Color.white.opacity(0.70), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
            }
        }
    }
}

private struct WeeklyReportCard: View {
    let report: WeeklyReport

    var body: some View {
        MPCard(tint: Color.orange.opacity(0.08)) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("周报")
                        .font(.caption.bold())
                        .foregroundStyle(.orange)
                    Text(report.title)
                        .font(.title3.bold())
                    Text(report.summary)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                VStack {
                    Text("\(report.total)")
                        .font(.title.bold())
                    Text("条")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            HStack(spacing: 6) {
                ForEach(report.buckets) { bucket in
                    VStack(spacing: 5) {
                        Text(bucket.label)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        Text("\(bucket.records.count)")
                            .font(.headline.bold())
                        Text(bucket.hasHighRisk ? "求助" : "记录")
                            .font(.caption2.bold())
                            .foregroundStyle(bucket.hasHighRisk ? .red : .orange)
                    }
                    .frame(maxWidth: .infinity, minHeight: 62)
                    .background(bucket.records.isEmpty ? Color.white.opacity(0.58) : Color.white.opacity(0.86), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(bucket.hasHighRisk ? Color.red.opacity(0.35) : Color.mint.opacity(bucket.records.isEmpty ? 0 : 0.35), lineWidth: 1)
                    )
                }
            }

            HStack(spacing: 10) {
                MetricTile(title: "平均指数", value: "\(report.averageScore)")
                MetricTile(title: "低睡眠日", value: "\(report.lowSleepDays)")
                MetricTile(title: "Safety Gate", value: "\(report.highRiskCount)")
            }
        }
    }
}
