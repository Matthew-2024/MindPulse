import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var store: MindPulseStore
    @State private var newProfileName = ""
    @State private var showingDeleteConfirm = false
    @State private var showingRuleLab = false

    var body: some View {
        let report = store.validationReport

        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    SectionHeader(title: "设置", subtitle: "管理匿名档案、演示数据和模型验证。")

                    MPCard(tint: Color.mint.opacity(0.10)) {
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("当前匿名档案")
                                    .font(.subheadline.bold())
                                    .foregroundStyle(.mint)
                                Text(store.activeProfile.name)
                                    .font(.title2.bold())
                                Text("ID：\(store.activeProfile.id)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "person.crop.circle.fill")
                                .font(.system(size: 40))
                                .foregroundStyle(.mint)
                        }
                        Text("iOS 原型使用本机 UserDefaults 保存数据，不与 Web 文件共用，也不会上传云端。")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }

                    MPCard {
                        Text("匿名档案")
                            .font(.headline)
                        ForEach(store.profiles) { profile in
                            Button {
                                store.switchProfile(profile)
                            } label: {
                                HStack(spacing: 12) {
                                    Text(String(profile.name.prefix(1)))
                                        .font(.headline)
                                        .frame(width: 38, height: 38)
                                        .background(Color.mint.opacity(0.16), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(profile.name)
                                            .font(.subheadline.bold())
                                        Text(profile.id)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    if profile.id == store.activeProfile.id {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundStyle(.mint)
                                    }
                                }
                                .padding(10)
                                .background(Color.white.opacity(0.72), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                            }
                            .buttonStyle(.plain)
                        }

                        TextField("新档案名称，例如 P002 / 同学B", text: $newProfileName)
                            .textFieldStyle(.roundedBorder)
                        PrimaryButton(title: "创建匿名档案", systemImage: "person.crop.circle.badge.plus") {
                            store.createProfile(name: newProfileName)
                            newProfileName = ""
                        }
                    }

                    MPCard {
                        Text("个人化模型")
                            .font(.headline)
                        Text("系统会记录每类干预完成后的恢复指数变化，用于调整推荐顺序。")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        ForEach(store.learningRows()) { row in
                            InterventionRow(id: row.id, detail: "完成 \(row.stat.count) 次，平均提升 \(row.stat.averageDelta) 分，上次 \(row.stat.lastDelta >= 0 ? "+" : "")\(row.stat.lastDelta)")
                        }
                    }

                    MPCard(tint: Color.orange.opacity(0.10)) {
                        Text("验证证据板")
                            .font(.headline)
                        Text("从当前 iOS 匿名档案即时计算，用于演示规则链路；不伪装成真实用户研究。")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        HStack(spacing: 10) {
                            MetricTile(title: "本地记录", value: "\(report.recordCount)")
                            MetricTile(title: "平均 RISE", value: "\(report.averageRecoveryScore)")
                        }
                        HStack(spacing: 10) {
                            MetricTile(title: "干预覆盖", value: "\(report.interventionCoverage)%")
                            MetricTile(title: "Safety Gate", value: "\(report.safetyGateTriggers)")
                        }
                        HStack(spacing: 10) {
                            MetricTile(title: "中度关注", value: "\(report.moderateAttentionCount)")
                            MetricTile(title: "真实试用", value: "待补")
                        }
                    }

                    MPCard {
                        Text("规则实验室")
                            .font(.headline)
                        Text("展示 13 条规则样例和 2 条个性化校验，说明 Safety Gate 与推荐排序不是纯静态文案。")
                            .foregroundStyle(.secondary)
                        PrimaryButton(title: "打开规则实验室", systemImage: "checklist.checked") {
                            showingRuleLab = true
                        }
                    }

                    MPCard {
                        Text("数据操作")
                            .font(.headline)
                        HStack(spacing: 12) {
                            SecondaryButton(title: "重置演示数据", systemImage: "arrow.clockwise") {
                                store.resetDemoData()
                            }
                            SecondaryButton(title: "回到档案入口", systemImage: "person.2") {
                                store.showingProfileGate = true
                            }
                        }
                        Button(role: .destructive) {
                            showingDeleteConfirm = true
                        } label: {
                            Label("删除当前档案", systemImage: "trash")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                        }
                        .buttonStyle(.plain)
                        .foregroundStyle(.red)
                        .background(Color.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .disabled(store.profiles.count <= 1)
                        .opacity(store.profiles.count <= 1 ? 0.45 : 1)
                    }
                }
                .padding()
            }
            .navigationTitle("设置")
            .mindPulseBackground()
            .sheet(isPresented: $showingRuleLab) {
                RuleLabView()
            }
            .alert("删除当前匿名档案？", isPresented: $showingDeleteConfirm) {
                Button("删除", role: .destructive) {
                    store.deleteActiveProfile()
                }
                Button("取消", role: .cancel) {}
            } message: {
                Text("该档案的本地记录和干预反馈会一起删除。至少保留一个档案。")
            }
        }
    }
}
