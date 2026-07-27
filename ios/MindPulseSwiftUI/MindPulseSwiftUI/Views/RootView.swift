import SwiftUI

struct RootView: View {
    @EnvironmentObject private var store: MindPulseStore

    var body: some View {
        Group {
            if store.showingProfileGate {
                ProfileGateView()
            } else {
                TabView(selection: $store.selectedTab) {
                    HomeView()
                        .tabItem { Label(AppTab.home.title, systemImage: AppTab.home.symbol) }
                        .tag(AppTab.home)
                    TrendView()
                        .tabItem { Label(AppTab.trend.title, systemImage: AppTab.trend.symbol) }
                        .tag(AppTab.trend)
                    CheckInView()
                        .tabItem { Label(AppTab.checkIn.title, systemImage: AppTab.checkIn.symbol) }
                        .tag(AppTab.checkIn)
                    CompanionView()
                        .tabItem { Label(AppTab.companion.title, systemImage: AppTab.companion.symbol) }
                        .tag(AppTab.companion)
                    HelpView()
                        .tabItem { Label(AppTab.help.title, systemImage: AppTab.help.symbol) }
                        .tag(AppTab.help)
                    SettingsView()
                        .tabItem { Label(AppTab.settings.title, systemImage: AppTab.settings.symbol) }
                        .tag(AppTab.settings)
                }
                .tint(Color.mint)
            }
        }
    }
}

struct ProfileGateView: View {
    @EnvironmentObject private var store: MindPulseStore
    @State private var name = ""
    @State private var email = ""
    @State private var code = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("心晴 MindPulse")
                    .font(.subheadline.bold())
                    .foregroundStyle(Color.mint)
                Text("选择一个匿名档案，再开始看今天。")
                    .font(.largeTitle.bold())
                    .lineLimit(3)
                Text("这里不需要手机号、学号或实名信息。档案只用于区分个人基线、推荐反馈和本地记录。")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .lineSpacing(4)

                MPCard {
                    Text("邮箱注册 / 登录")
                        .font(.headline)
                    Text("当前为演示版，验证码固定为 \(MindPulseStore.demoEmailCode)，验证结果只保存到本机。")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    TextField("输入邮箱", text: $email)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                        .textFieldStyle(.roundedBorder)
                    HStack {
                        TextField("6 位验证码", text: $code)
                            .keyboardType(.numberPad)
                            .textFieldStyle(.roundedBorder)
                        SecondaryButton(title: "发送验证码", systemImage: "paperplane") {
                            if store.requestDemoEmailCode(email: email) {
                                code = MindPulseStore.demoEmailCode
                            }
                        }
                    }
                    PrimaryButton(title: "验证并进入", systemImage: "checkmark.seal") {
                        if store.verifyDemoEmail(email: email, code: code) {
                            store.enter(profile: store.activeProfile)
                        }
                    }
                    Text(store.accountState.lastSyncStatus)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                MPCard {
                    Text("已有匿名档案")
                        .font(.headline)
                    ForEach(store.profiles) { profile in
                        Button {
                            store.enter(profile: profile)
                        } label: {
                            HStack {
                                Text(String(profile.name.prefix(1)))
                                    .font(.headline)
                                    .frame(width: 40, height: 40)
                                    .background(Color.mint.opacity(0.18), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                                VStack(alignment: .leading) {
                                    Text(profile.name)
                                        .font(.headline)
                                    Text(profile.id == store.activeProfile.id ? "当前选择" : "切换后使用独立本地记录")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }

                MPCard {
                    Text("创建新档案")
                        .font(.headline)
                    TextField("例如 P002 / 同学A", text: $name)
                        .textFieldStyle(.roundedBorder)
                    PrimaryButton(title: "创建并进入", systemImage: "person.crop.circle.badge.plus") {
                        store.createProfile(name: name)
                    }
                }

                Text("比赛版采用端侧匿名档案机制：数据保存在当前设备本地，不上传云端；正式校园试点才考虑邀请码或统一身份认证。")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding()
                    .background(Color.mint.opacity(0.12), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
            .padding(22)
        }
        .mindPulseBackground()
    }
}
