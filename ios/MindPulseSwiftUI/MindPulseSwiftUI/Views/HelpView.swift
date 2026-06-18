import SwiftUI

struct HelpView: View {
    @EnvironmentObject private var store: MindPulseStore
    @State private var target: HelpTarget = .friend
    @State private var style: HelpStyle = .balanced
    @State private var extra = ""

    var body: some View {
        let risk = store.risk
        let draft = RISEEngine.helpText(target: target, style: style, record: store.latestRecord, risk: risk, extra: extra)

        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    SectionHeader(title: "求助", subtitle: "先让一个人知道。")

                    MPCard(tint: Color.red.opacity(0.12)) {
                        Text("撑不住时，先联系一个人。")
                            .font(.title2.bold())
                        Text("当前判断：\(risk.level.rawValue)。如果有即时危险，请优先联系热线、老师、家人或当地紧急救助。")
                            .foregroundStyle(.secondary)
                        HStack {
                            Text("暂停普通练习")
                            Text("告诉可信任的人")
                            Text("必要时拨打热线")
                        }
                        .font(.caption.bold())
                    }

                    MPCard {
                        Text("Safety Gate 流程")
                            .font(.headline)
                        InterventionRow(id: .help, detail: "文本风险信号 -> Safety Gate 触发 -> 停止普通干预 -> 求助入口")
                    }

                    MPCard {
                        Text("求助话术")
                            .font(.headline)
                        Picker("对象", selection: $target) {
                            ForEach(HelpTarget.allCases) { Text($0.title).tag($0) }
                        }
                        .pickerStyle(.segmented)
                        Picker("语气", selection: $style) {
                            ForEach(HelpStyle.allCases) { Text($0.title).tag($0) }
                        }
                        .pickerStyle(.segmented)
                        TextField("补一句最近发生了什么", text: $extra, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                        Text(draft)
                            .font(.body)
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.white.opacity(0.72), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                }
                .padding()
            }
            .navigationTitle("求助")
            .mindPulseBackground()
        }
    }
}
