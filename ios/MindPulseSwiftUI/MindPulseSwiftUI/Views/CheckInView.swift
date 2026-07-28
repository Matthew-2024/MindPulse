import SwiftUI

struct CheckInView: View {
    @EnvironmentObject private var store: MindPulseStore
    @State private var mood: Mood = .anxious
    @State private var sleepHours = 5.5
    @State private var steps = 3200.0
    @State private var social = 38.0
    @State private var energy: EnergyLevel = .mid
    @State private var connection: ConnectionNeed = .ok
    @State private var note = ""
    @State private var saved = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    SectionHeader(title: "记录今天", subtitle: "按自己的节奏来，不用一次想清楚。")

                    MPCard {
                        Text("今天更接近哪一种感觉？")
                            .font(.headline)
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 10) {
                            ForEach(Mood.allCases) { item in
                                Button {
                                    mood = item
                                } label: {
                                    VStack(spacing: 8) {
                                        Image(systemName: item.symbol)
                                        Text(item.title)
                                            .font(.caption.bold())
                                    }
                                    .frame(maxWidth: .infinity, minHeight: 74)
                                    .background(mood == item ? Color.mint.opacity(0.20) : Color.white.opacity(0.72), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    MPCard {
                        Text("真实数据输入")
                            .font(.headline)
                        VStack(alignment: .leading) {
                            Text("睡眠 \(sleepHours, specifier: "%.1f")h")
                            Slider(value: $sleepHours, in: 0...12, step: 0.1)
                            Text("步数 \(Int(steps))")
                            Slider(value: $steps, in: 0...20000, step: 100)
                            Text("社交连接度 \(Int(social))%")
                            Slider(value: $social, in: 0...100, step: 1)
                        }
                    }

                    MPCard {
                        Text("精力与连接")
                            .font(.headline)
                        Picker("精力", selection: $energy) {
                            ForEach(EnergyLevel.allCases) { Text($0.title).tag($0) }
                        }
                        .pickerStyle(.segmented)
                        Picker("连接意愿", selection: $connection) {
                            ForEach(ConnectionNeed.allCases) { Text($0.title).tag($0) }
                        }
                        .pickerStyle(.segmented)
                    }

                    MPCard {
                        Text("顺手写一句")
                            .font(.headline)
                        TextEditor(text: $note)
                            .frame(minHeight: 110)
                            .padding(8)
                            .background(Color.white.opacity(0.74), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }

                    PrimaryButton(title: "保存今天", systemImage: "checkmark.circle.fill") {
                        store.saveCheckIn(
                            mood: mood,
                            sleepHours: sleepHours,
                            steps: Int(steps),
                            socialScore: Int(social),
                            energy: energy,
                            connection: connection,
                            note: note
                        )
                        saved = true
                    }
                }
                .padding()
            }
            .navigationTitle("记录")
            .mindPulseBackground()
            .alert("已经记下来了", isPresented: $saved) {
                Button("看首页判断") { store.selectedTab = .home }
                Button("继续记录", role: .cancel) {}
            } message: {
                Text("今天没有被你忽略，这就很重要。")
            }
        }
    }
}
