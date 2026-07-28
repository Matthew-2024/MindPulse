import Foundation

enum Mood: String, CaseIterable, Codable, Identifiable, Hashable {
    case happy
    case calm
    case anxious
    case sad
    case tired
    case angry

    var id: String { rawValue }

    var title: String {
        switch self {
        case .happy: return "开心"
        case .calm: return "平静"
        case .anxious: return "焦虑"
        case .sad: return "低落"
        case .tired: return "疲惫"
        case .angry: return "烦躁"
        }
    }

    var symbol: String {
        switch self {
        case .happy: return "face.smiling"
        case .calm: return "leaf"
        case .anxious: return "wind"
        case .sad: return "cloud.rain"
        case .tired: return "moon.zzz"
        case .angry: return "flame"
        }
    }

    var level: Int {
        switch self {
        case .happy: return 5
        case .calm: return 4
        case .anxious: return 3
        case .sad, .tired, .angry: return 2
        }
    }
}

enum EnergyLevel: String, CaseIterable, Codable, Identifiable, Hashable {
    case low
    case mid
    case high

    var id: String { rawValue }

    var title: String {
        switch self {
        case .low: return "低"
        case .mid: return "中"
        case .high: return "高"
        }
    }
}

enum ConnectionNeed: String, CaseIterable, Codable, Identifiable, Hashable {
    case avoid
    case ok
    case need

    var id: String { rawValue }

    var title: String {
        switch self {
        case .avoid: return "不想联系"
        case .ok: return "可以说说"
        case .need: return "很需要"
        }
    }
}

enum InterventionID: String, CaseIterable, Codable, Identifiable, Hashable {
    case breathe
    case walk
    case journal
    case friend
    case sleep
    case focus
    case help

    var id: String { rawValue }

    var title: String {
        switch self {
        case .breathe: return "先把身体降下来"
        case .walk: return "离开原地 10 分钟"
        case .journal: return "把脑子里的话倒出来"
        case .friend: return "让一个人知道你"
        case .sleep: return "今晚先收住"
        case .focus: return "只做一件小事"
        case .help: return "打开求助入口"
        }
    }

    var symbol: String {
        switch self {
        case .breathe: return "lungs"
        case .walk: return "figure.walk"
        case .journal: return "square.and.pencil"
        case .friend: return "message"
        case .sleep: return "moon.stars"
        case .focus: return "target"
        case .help: return "phone.fill"
        }
    }
}

struct AnonymousProfile: Codable, Identifiable, Equatable {
    var id: String
    var name: String
    var createdAt: Date

    static func demo() -> AnonymousProfile {
        AnonymousProfile(id: "local-demo", name: "匿名同学 A", createdAt: Date())
    }
}

struct MindPulseRecord: Codable, Identifiable, Equatable {
    var id: UUID = UUID()
    var date: Date
    var mood: Mood
    var sleepHours: Double
    var steps: Int
    var socialScore: Int
    var energyLevel: EnergyLevel
    var connectionNeed: ConnectionNeed
    var note: String
    var dataInputMode: String
    var completedInterventions: [InterventionID]

    var moodScore: Int { mood.level }
}

struct InterventionStat: Codable, Equatable {
    var count: Int
    var totalDelta: Int
    var lastDelta: Int
    var lastAt: Date?

    var averageDelta: Int {
        guard count > 0 else { return 0 }
        return Int((Double(totalDelta) / Double(count)).rounded())
    }
}

struct InterventionLearningRow: Identifiable, Equatable {
    var id: InterventionID
    var stat: InterventionStat
}

struct ScoreBreakdown: Codable, Equatable {
    var mood: Int
    var sleep: Int
    var steps: Int
    var social: Int
    var intervention: Int

    var total: Int {
        min(100, max(0, mood + sleep + steps + social + intervention))
    }
}

struct RISEScore: Codable, Equatable {
    var total: Int
    var breakdown: ScoreBreakdown
    var explanation: String
}

enum RiskLevel: String, Codable, Comparable, Hashable {
    case stable = "稳定观察"
    case normal = "普通波动"
    case moderate = "中度关注"
    case high = "高风险"

    static func < (lhs: RiskLevel, rhs: RiskLevel) -> Bool {
        order(lhs) < order(rhs)
    }

    private static func order(_ level: RiskLevel) -> Int {
        switch level {
        case .stable: return 0
        case .normal: return 1
        case .moderate: return 2
        case .high: return 3
        }
    }
}

struct RiskAssessment: Codable, Equatable {
    var level: RiskLevel
    var tag: String
    var reason: String
    var desc: String
    var evidence: [String]
    var shouldRecommendSelfHelp: Bool

    var safetyGateLabel: String {
        level == .high ? "已触发" : "未触发"
    }
}

struct RecommendationPlan: Codable, Equatable {
    var title: String
    var intro: String
    var path: [InterventionID]
    var reasons: [String]
}

struct BaselineResult: Codable, Equatable {
    var normalMood: Double
    var normalSleep: Double
    var normalSteps: Double
    var normalSocial: Double
    var moodDelta: Double
    var sleepPercentDelta: Int
    var stepsPercentDelta: Int
    var socialDelta: Int
    var flags: [String]

    var level: String {
        if flags.count >= 2 { return "明显偏离" }
        if flags.count == 1 { return "轻度偏离" }
        return "接近基线"
    }

    var title: String {
        if flags.isEmpty { return "今天接近自己的正常节奏" }
        if flags.count == 1 { return "今天有一个信号偏离基线" }
        return "今天多个信号偏离个人基线"
    }

    var desc: String {
        if flags.isEmpty {
            return "睡眠、活动和连接感没有明显低于你的近几天基线。"
        }
        return "\(flags.joined(separator: "；"))。这是按个人历史节奏判断，不是和别人比较。"
    }
}

struct ValidationReport: Codable, Equatable {
    var recordCount: Int
    var averageRecoveryScore: Int
    var interventionCoverage: Int
    var safetyGateTriggers: Int
    var moderateAttentionCount: Int
}

struct RuleCase: Identifiable {
    var id: String
    var name: String
    var records: [MindPulseRecord]
    var expectedRisk: RiskLevel
    var expectedPath: [InterventionID]
}
