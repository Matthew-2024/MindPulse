import Foundation
import SwiftUI

@MainActor
final class MindPulseStore: ObservableObject {
    @Published var profiles: [AnonymousProfile]
    @Published var activeProfile: AnonymousProfile
    @Published var records: [MindPulseRecord]
    @Published var completed: [InterventionID]
    @Published var interventionStats: [InterventionID: InterventionStat]
    @Published var selectedTab: AppTab = .home
    @Published var showingProfileGate = true

    private let defaults: UserDefaults
    private let profilesKey = "mindpulse.ios.profiles"
    private let activeProfileKey = "mindpulse.ios.activeProfile"

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        let savedProfiles: [AnonymousProfile] = Self.decode([AnonymousProfile].self, from: defaults.data(forKey: "mindpulse.ios.profiles")) ?? [.demo()]
        let activeID = defaults.string(forKey: "mindpulse.ios.activeProfile") ?? savedProfiles[0].id
        let active = savedProfiles.first { $0.id == activeID } ?? savedProfiles[0]
        self.profiles = savedProfiles
        self.activeProfile = active
        self.records = Self.decode([MindPulseRecord].self, from: defaults.data(forKey: Self.recordsKey(for: active.id))) ?? RISEEngine.demoRecords()
        self.completed = Self.decode([InterventionID].self, from: defaults.data(forKey: Self.completedKey(for: active.id))) ?? []
        self.interventionStats = Self.decode([InterventionID: InterventionStat].self, from: defaults.data(forKey: Self.statsKey(for: active.id))) ?? [:]
    }

    var latestRecord: MindPulseRecord {
        records.last ?? RISEEngine.demoRecords().last!
    }

    var risk: RiskAssessment {
        RISEEngine.assessRisk(records: records)
    }

    var score: RISEScore {
        RISEEngine.calculateScore(record: latestRecord, completed: completed)
    }

    var baseline: BaselineResult {
        RISEEngine.calculateBaseline(records: records)
    }

    var plan: RecommendationPlan {
        RISEEngine.recommendPath(record: latestRecord, risk: risk, stats: interventionStats)
    }

    var validationReport: ValidationReport {
        RISEEngine.validationReport(records: records, completed: completed)
    }

    func enter(profile: AnonymousProfile) {
        switchProfile(profile)
        showingProfileGate = false
    }

    func createProfile(name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let profile = AnonymousProfile(
            id: "mpu_\(UUID().uuidString.prefix(8).lowercased())",
            name: trimmed.isEmpty ? "匿名同学 \(profiles.count + 1)" : trimmed,
            createdAt: Date()
        )
        profiles.append(profile)
        activeProfile = profile
        records = RISEEngine.demoRecords()
        completed = []
        interventionStats = [:]
        persistAll()
        showingProfileGate = false
    }

    func switchProfile(_ profile: AnonymousProfile) {
        activeProfile = profile
        records = Self.decode([MindPulseRecord].self, from: defaults.data(forKey: Self.recordsKey(for: profile.id))) ?? RISEEngine.demoRecords()
        completed = Self.decode([InterventionID].self, from: defaults.data(forKey: Self.completedKey(for: profile.id))) ?? []
        interventionStats = Self.decode([InterventionID: InterventionStat].self, from: defaults.data(forKey: Self.statsKey(for: profile.id))) ?? [:]
        persistAll()
    }

    func deleteActiveProfile() {
        guard profiles.count > 1 else { return }
        defaults.removeObject(forKey: Self.recordsKey(for: activeProfile.id))
        defaults.removeObject(forKey: Self.completedKey(for: activeProfile.id))
        defaults.removeObject(forKey: Self.statsKey(for: activeProfile.id))
        profiles.removeAll { $0.id == activeProfile.id }
        activeProfile = profiles[0]
        switchProfile(activeProfile)
    }

    func saveCheckIn(mood: Mood, sleepHours: Double, steps: Int, socialScore: Int, energy: EnergyLevel, connection: ConnectionNeed, note: String) {
        var updated = latestRecord
        updated.date = Date()
        updated.mood = mood
        updated.sleepHours = min(12, max(0, sleepHours))
        updated.steps = min(40000, max(0, steps))
        updated.socialScore = min(100, max(0, socialScore))
        updated.energyLevel = energy
        updated.connectionNeed = connection
        updated.note = note
        updated.dataInputMode = "swiftui-manual"
        updated.completedInterventions = []

        if records.isEmpty {
            records = [updated]
        } else {
            records[records.count - 1] = updated
        }
        completed = []
        persistCurrentProfileData()
    }

    func complete(_ intervention: InterventionID) {
        let before = score.total
        if !completed.contains(intervention) {
            completed.append(intervention)
        }
        var latest = latestRecord
        if !latest.completedInterventions.contains(intervention) {
            latest.completedInterventions.append(intervention)
        }
        switch intervention {
        case .breathe:
            latest.note = "刚刚做完呼吸，身体先慢下来了一点。"
        case .walk:
            latest.steps += 800
            latest.note = "出去走了一小段，情绪没有那么卡住了。"
        case .journal:
            latest.note = "写下了此刻的感受。"
        case .friend:
            latest.socialScore = min(100, latest.socialScore + 10)
            latest.note = "给朋友发了消息，至少让一个人知道了自己。"
        case .sleep:
            latest.sleepHours = min(12, latest.sleepHours + 0.3)
            latest.note = "今晚先收住这一步做完了，神经可以慢慢安静下来。"
        case .focus:
            latest.note = "完成了一段专注，掌控感回来了些。"
        case .help:
            latest.note = "已打开求助入口。"
        }
        if records.isEmpty {
            records = [latest]
        } else {
            records[records.count - 1] = latest
        }
        let after = score.total
        var stat = interventionStats[intervention] ?? InterventionStat(count: 0, totalDelta: 0, lastDelta: 0, lastAt: nil)
        stat.count += 1
        stat.lastDelta = after - before
        stat.totalDelta += stat.lastDelta
        stat.lastAt = Date()
        interventionStats[intervention] = stat
        persistCurrentProfileData()
    }

    func resetDemoData() {
        records = RISEEngine.demoRecords()
        completed = []
        interventionStats = [:]
        persistCurrentProfileData()
    }

    func learningRows() -> [InterventionLearningRow] {
        if interventionStats.isEmpty {
            return [
                InterventionLearningRow(id: .breathe, stat: InterventionStat(count: 3, totalDelta: 15, lastDelta: 5, lastAt: nil)),
                InterventionLearningRow(id: .journal, stat: InterventionStat(count: 2, totalDelta: 16, lastDelta: 8, lastAt: nil)),
                InterventionLearningRow(id: .walk, stat: InterventionStat(count: 1, totalDelta: 2, lastDelta: 2, lastAt: nil))
            ]
        }
        return interventionStats
            .map { InterventionLearningRow(id: $0.key, stat: $0.value) }
            .sorted { $0.stat.averageDelta > $1.stat.averageDelta }
    }

    private func persistAll() {
        Self.encode(profiles, key: profilesKey, defaults: defaults)
        defaults.set(activeProfile.id, forKey: activeProfileKey)
        persistCurrentProfileData()
    }

    private func persistCurrentProfileData() {
        Self.encode(records, key: Self.recordsKey(for: activeProfile.id), defaults: defaults)
        Self.encode(completed, key: Self.completedKey(for: activeProfile.id), defaults: defaults)
        Self.encode(interventionStats, key: Self.statsKey(for: activeProfile.id), defaults: defaults)
    }

    private static func recordsKey(for id: String) -> String { "mindpulse.ios.\(id).records" }
    private static func completedKey(for id: String) -> String { "mindpulse.ios.\(id).completed" }
    private static func statsKey(for id: String) -> String { "mindpulse.ios.\(id).stats" }

    private static func encode<T: Encodable>(_ value: T, key: String, defaults: UserDefaults) {
        if let data = try? JSONEncoder.mindPulse.encode(value) {
            defaults.set(data, forKey: key)
        }
    }

    private static func decode<T: Decodable>(_ type: T.Type, from data: Data?) -> T? {
        guard let data else { return nil }
        return try? JSONDecoder.mindPulse.decode(type, from: data)
    }
}

enum AppTab: String, CaseIterable, Identifiable, Hashable {
    case home
    case trend
    case checkIn
    case companion
    case help
    case settings

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: return "首页"
        case .trend: return "趋势"
        case .checkIn: return "记录"
        case .companion: return "陪伴"
        case .help: return "求助"
        case .settings: return "设置"
        }
    }

    var symbol: String {
        switch self {
        case .home: return "house.fill"
        case .trend: return "chart.line.uptrend.xyaxis"
        case .checkIn: return "plus.circle.fill"
        case .companion: return "heart.fill"
        case .help: return "questionmark.circle.fill"
        case .settings: return "gearshape.fill"
        }
    }
}

extension JSONEncoder {
    static var mindPulse: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }
}

extension JSONDecoder {
    static var mindPulse: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}
