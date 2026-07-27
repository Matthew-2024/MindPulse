import Foundation

enum RISEEngine {
    private static let negativeMoods: Set<Mood> = [.sad, .anxious, .tired, .angry]

    static func calculateScore(record: MindPulseRecord, completed: [InterventionID]) -> RISEScore {
        let breakdown = ScoreBreakdown(
            mood: clamp(record.mood.level * 12, min: 0, max: 60),
            sleep: clamp(Int(((record.sleepHours / 8.0) * 18.0).rounded()), min: 0, max: 18),
            steps: clamp(Int(((Double(record.steps) / 8000.0) * 14.0).rounded()), min: 0, max: 14),
            social: clamp(Int(((Double(record.socialScore) / 100.0) * 12.0).rounded()), min: 0, max: 12),
            intervention: completed.isEmpty ? 0 : 8
        )
        let explanation = "情绪 \(breakdown.mood) 分、睡眠 \(breakdown.sleep) 分、步数 \(breakdown.steps) 分、社交 \(breakdown.social) 分、干预 \(breakdown.intervention) 分，合成当前恢复指数。"
        return RISEScore(total: breakdown.total, breakdown: breakdown, explanation: explanation)
    }

    static func assessRisk(records: [MindPulseRecord], currentText: String = "") -> RiskAssessment {
        guard let latest = records.last else {
            return RiskAssessment(
                level: .stable,
                tag: "保持记录",
                reason: "暂无记录，先完成一次低负担记录。",
                desc: "暂无记录时，心晴会先引导用户完成一次低负担记录。",
                evidence: ["暂无历史记录"],
                shouldRecommendSelfHelp: true
            )
        }
        let mergedText = latest.note + " " + currentText
        let lowSleep = lowSleepDays(records)
        let negative = recentNegativeCount(records)

        if let danger = dangerSignal(in: mergedText) {
            return RiskAssessment(
                level: .high,
                tag: "优先求助",
                reason: "文本中出现危机信号（\(danger.level)级），停止普通自助建议，优先连接热线、老师、家人或专业资源。",
                desc: "文本中出现危机信号时，心晴会先停下普通自助建议，优先展示热线、老师、家人和专业机构入口。",
                evidence: ["Safety Gate: \(danger.level)", "pattern: \(danger.pattern)"],
                shouldRecommendSelfHelp: false
            )
        }
        if lowSleep >= 3 || negative >= 3 {
            var evidence: [String] = []
            if lowSleep >= 3 { evidence.append("近 4 次记录中 \(lowSleep) 次睡眠低于 6 小时") }
            if negative >= 3 { evidence.append("近 4 次记录中 \(negative) 次为负向状态") }
            return RiskAssessment(
                level: .moderate,
                tag: "建议连接他人",
                reason: "最近低睡眠或负面状态连续出现，建议联系可信任的人或校内支持资源。",
                desc: "本周低睡眠或负面状态连续出现，心晴会优先推荐低负担行动，并提示联系可信任的人。",
                evidence: evidence,
                shouldRecommendSelfHelp: true
            )
        }
        if negativeMoods.contains(latest.mood) {
            return RiskAssessment(
                level: .normal,
                tag: "先做轻干预",
                reason: "当前更像日常压力波动，可先完成一个低负担行动。",
                desc: "当前更像日常压力波动，建议先完成呼吸、散步、记录或睡前放松中的一步。",
                evidence: ["当前情绪: \(latest.mood.rawValue)"],
                shouldRecommendSelfHelp: true
            )
        }
        return RiskAssessment(
            level: .stable,
            tag: "保持记录",
            reason: "当前状态较平稳，继续保持记录和节奏观察。",
            desc: "当前状态较平稳，心晴会继续记录节奏变化，提醒你维持睡眠和连接感。",
            evidence: ["未触发危机词、连续低睡眠或连续负面状态规则"],
            shouldRecommendSelfHelp: true
        )
    }

    static func recommendPath(record: MindPulseRecord, risk: RiskAssessment, stats: [InterventionID: InterventionStat]) -> RecommendationPlan {
        if risk.level == .high {
            return RecommendationPlan(
                title: "先联系一个可信任的人",
                intro: "现在先不安排普通练习，优先把求助这一步发出去。",
                path: [.help],
                reasons: ["出现危机信号"]
            )
        }

        var chain = basePath(for: record.mood)
        var reasons: [String] = []
        var title = baseTitle(for: record.mood)
        var intro = "今天先不用解决所有事，只走第一步就够了。"

        if record.connectionNeed == .need || record.socialScore < 25 {
            chain.insert(.friend, at: 0)
            title = "先让一个人知道你"
            reasons.append(record.connectionNeed == .need ? "你选择了很需要连接" : "社交连接偏低")
        } else if record.connectionNeed == .avoid {
            chain.removeAll { $0 == .friend }
            chain.append(.friend)
            reasons.append("你暂时不想联系别人")
        }

        if record.sleepHours > 0 && record.sleepHours < 5.2 {
            chain = [.sleep, .breathe, .journal] + chain.filter { $0 != .focus }
            title = "先把身体和睡眠收住"
            reasons.append("睡眠明显不足")
        } else if record.sleepHours > 0 && record.sleepHours < 6 {
            chain = (record.mood == .tired ? [.sleep, .breathe] : [.breathe, .sleep]) + chain
            reasons.append("睡眠低于 6 小时")
        }

        if record.energyLevel == .low {
            chain = [.breathe, .journal, .sleep] + chain.filter { $0 != .focus }
            reasons.append("精力偏低")
        }

        if record.mood == .angry {
            chain = [.walk, .breathe] + chain
            reasons.append("烦躁状态更适合先离开原地")
        }

        let personalized = personalize(chain: unique(chain), stats: stats)
        if let best = bestLearning(stats: stats), best.averageDelta >= 4 {
            reasons.append("你过去完成「\(best.id.title)」后平均提升 \(best.averageDelta) 分")
        }

        if reasons.isEmpty { reasons.append("当前状态较平稳") }
        return RecommendationPlan(title: title, intro: intro, path: Array(personalized.prefix(3)), reasons: unique(reasons))
    }

    static func calculateBaseline(records: [MindPulseRecord]) -> BaselineResult {
        let latest = records.last ?? demoRecords().last!
        let history = Array(records.dropLast().suffix(6))
        let source = history.isEmpty ? Array(records.dropLast()) : history
        let normalMood = average(source.map { Double($0.mood.level) }, fallback: Double(latest.mood.level))
        let normalSleep = average(source.map(\.sleepHours), fallback: latest.sleepHours)
        let normalSteps = average(source.map { Double($0.steps) }, fallback: Double(latest.steps))
        let normalSocial = average(source.map { Double($0.socialScore) }, fallback: Double(latest.socialScore))
        let moodDelta = Double(latest.mood.level) - normalMood
        let sleepDelta = percentDelta(Double(latest.sleepHours), normalSleep)
        let stepsDelta = percentDelta(Double(latest.steps), normalSteps)
        let socialDelta = Int((Double(latest.socialScore) - normalSocial).rounded())
        var flags: [String] = []
        if sleepDelta <= -25 { flags.append("睡眠低于个人基线 \(abs(sleepDelta))%") }
        if stepsDelta <= -40 { flags.append("活动低于个人基线 \(abs(stepsDelta))%") }
        if socialDelta <= -20 { flags.append("连接感低于个人基线 \(abs(socialDelta)) 点") }
        if moodDelta <= -1 { flags.append("情绪低于个人基线 \(String(format: "%.1f", abs(moodDelta))) 级") }
        return BaselineResult(
            normalMood: normalMood,
            normalSleep: normalSleep,
            normalSteps: normalSteps,
            normalSocial: normalSocial,
            moodDelta: moodDelta,
            sleepPercentDelta: sleepDelta,
            stepsPercentDelta: stepsDelta,
            socialDelta: socialDelta,
            flags: flags
        )
    }

    static func validationReport(records: [MindPulseRecord], completed: [InterventionID]) -> ValidationReport {
        let analyzed = records.enumerated().map { index, record in
            let history = Array(records.prefix(index + 1))
            let score = calculateScore(record: record, completed: record.completedInterventions).total
            let risk = assessRisk(records: history)
            return (score: score, risk: risk.level)
        }
        let totalScore = analyzed.reduce(0) { $0 + $1.score }
        let averageScore = analyzed.isEmpty ? 0 : Int((Double(totalScore) / Double(analyzed.count)).rounded())
        let completedCount = completed.isEmpty
            ? records.reduce(0) { $0 + $1.completedInterventions.count }
            : completed.count
        let coverage = records.isEmpty ? 0 : min(100, Int((Double(completedCount) / Double(records.count) * 100).rounded()))
        return ValidationReport(
            recordCount: records.count,
            averageRecoveryScore: averageScore,
            interventionCoverage: coverage,
            safetyGateTriggers: analyzed.filter { $0.risk == .high }.count,
            moderateAttentionCount: analyzed.filter { $0.risk == .moderate }.count
        )
    }

    static func dailyReport(records: [MindPulseRecord], for date: Date) -> DailyReport {
        let calendar = Calendar.current
        let dayRecords = records.filter { calendar.isDate($0.date, inSameDayAs: date) }
        guard !dayRecords.isEmpty else {
            return DailyReport(
                date: date,
                records: [],
                title: "今天还没有即时记录",
                summary: "先记录一次此刻状态，日报会自动汇总今天的情绪时间线、风险证据和下一步建议。",
                mainMood: "未记录",
                averageScore: 0,
                risk: .stable
            )
        }
        let sorted = dayRecords.sorted { $0.date < $1.date }
        let mood = dominantMood(in: sorted)
        let averageScore = Int((Double(sorted.reduce(0) { $0 + calculateScore(record: $1, completed: $1.completedInterventions).total }) / Double(sorted.count)).rounded())
        let risk = assessRisk(records: sorted).level
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.dateFormat = "HH:mm"
        let first = formatter.string(from: sorted.first?.date ?? date)
        let last = formatter.string(from: sorted.last?.date ?? date)
        return DailyReport(
            date: date,
            records: sorted,
            title: risk == .high ? "今天优先进入求助入口" : "今天的状态已经形成时间线",
            summary: "\(sorted.count) 条即时记录已汇总。从 \(first) 到 \(last)，主要情绪是\(mood.title)；\(risk == .high ? "日报不会继续把普通练习作为主路径。" : "当前建议仍保持低负担、可退出。")",
            mainMood: mood.title,
            averageScore: averageScore,
            risk: risk
        )
    }

    static func weeklyReport(records: [MindPulseRecord]) -> WeeklyReport {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.dateFormat = "E"
        let buckets: [WeekBucket] = (0..<7).reversed().map { offset in
            let date = calendar.date(byAdding: .day, value: -offset, to: today) ?? today
            let dayRecords = records.filter { calendar.isDate($0.date, inSameDayAs: date) }.sorted { $0.date < $1.date }
            let high = dayRecords.enumerated().contains { index, _ in
                assessRisk(records: Array(dayRecords.prefix(index + 1))).level == .high
            }
            return WeekBucket(
                key: dateKey(date),
                label: formatter.string(from: date),
                date: date,
                records: dayRecords,
                hasHighRisk: high
            )
        }
        let weeklyRecords = buckets.flatMap(\.records)
        let highRisk = weeklyRecords.enumerated().filter { index, _ in
            assessRisk(records: Array(weeklyRecords.prefix(index + 1))).level == .high
        }.count
        let lowSleep = buckets.filter { bucket in
            guard let last = bucket.records.last else { return false }
            return last.sleepHours < 6
        }.count
        let averageScore = weeklyRecords.isEmpty ? 0 : Int((Double(weeklyRecords.reduce(0) { $0 + calculateScore(record: $1, completed: $1.completedInterventions).total }) / Double(weeklyRecords.count)).rounded())
        let mood = dominantMood(in: weeklyRecords)
        return WeeklyReport(
            buckets: buckets,
            total: weeklyRecords.count,
            title: highRisk > 0 ? "本周出现过高风险求助信号" : (lowSleep >= 3 ? "本周最明显的是睡眠消耗" : "本周状态可继续观察"),
            summary: "\(weeklyRecords.count) 条记录形成周报。主要情绪为\(mood.title)；低睡眠日 \(lowSleep) 天；Safety Gate 触发 \(highRisk) 次。",
            averageScore: averageScore,
            lowSleepDays: lowSleep,
            highRiskCount: highRisk
        )
    }

    static func helpText(target: HelpTarget, style: HelpStyle, record: MindPulseRecord, risk: RiskAssessment, extra: String) -> String {
        let intro: String
        switch target {
        case .counselor: intro = "老师您好，想先跟您说一下我最近的状态。"
        case .friend: intro = "我想先和你说说我最近的情况。"
        case .family: intro = "我最近状态不太稳，想先和你说一声。"
        }

        let situation = risk.level == .high
            ? "我现在状态比较危险，已经不适合一个人硬撑，想尽快让一个可信任的人知道。"
            : "我这几天情绪上偏\(record.mood.title)，睡眠大概只有 \(String(format: "%.1f", record.sleepHours)) 小时，自己有点扛不动。"

        let request = risk.level == .high
            ? "如果方便，请现在联系我，或帮我连接老师、家人/专业资源。"
            : "如果方便的话，我想找个时间和你聊聊。"

        if style == .short {
            return [intro, risk.level == .high ? "我现在不太安全，想马上让你知道。" : "我最近状态不太稳，睡眠也不太好，想先让你知道。", request].joined(separator: "\n\n")
        }
        return [intro, situation, extra.isEmpty ? "最近有几件事压在一起，我一个人消化得有点吃力。" : extra, request].joined(separator: "\n\n")
    }

    static func ruleCases() -> [RuleCase] {
        [
            RuleCase(id: "R01", name: "焦虑普通波动", records: [record(.anxious, 6.2, 4200, 45, "想到考试有点紧张")], expectedRisk: .normal, expectedPath: [.breathe, .walk, .journal]),
            RuleCase(id: "R02", name: "低落普通波动", records: [record(.sad, 6.0, 3000, 30, "今天有点低落")], expectedRisk: .normal, expectedPath: [.breathe, .friend, .sleep]),
            RuleCase(id: "R03", name: "疲惫普通波动", records: [record(.tired, 5.5, 2600, 40, "很累")], expectedRisk: .normal, expectedPath: [.sleep, .breathe, .focus]),
            RuleCase(id: "R04", name: "危机词求助", records: [record(.sad, 3.8, 900, 10, "我很绝望")], expectedRisk: .high, expectedPath: [.help]),
            RuleCase(id: "R05", name: "自伤表达求助", records: [record(.sad, 4.5, 1200, 20, "有伤害自己的想法")], expectedRisk: .high, expectedPath: [.help]),
            RuleCase(id: "R06", name: "稳定观察", records: [record(.happy, 7.5, 8500, 70, "今天状态不错")], expectedRisk: .stable, expectedPath: [.focus, .journal, .walk]),
            RuleCase(id: "R07", name: "安全短语误判控制", records: [record(.anxious, 6.0, 4000, 50, "我不想活在焦虑里，但是还能撑住")], expectedRisk: .normal, expectedPath: [.breathe, .walk, .journal]),
            RuleCase(id: "R08", name: "变体表达求助", records: [record(.sad, 4.0, 1000, 15, "想从这个世界上消失")], expectedRisk: .high, expectedPath: [.help]),
            RuleCase(id: "R09", name: "连续低睡眠", records: [record(.sad, 4.5, 1500, 20, "昨天"), record(.anxious, 5.0, 2000, 25, "前天"), record(.tired, 5.0, 2000, 30, "今天")], expectedRisk: .moderate, expectedPath: [.sleep, .breathe, .journal]),
            RuleCase(id: "R10", name: "空文本安全", records: [record(.calm, 7.0, 6000, 60, "")], expectedRisk: .stable, expectedPath: [.focus, .journal, .walk]),
            RuleCase(id: "R11", name: "睡眠边界 6 小时", records: [record(.tired, 6.0, 3000, 40, "刚好6小时")], expectedRisk: .normal, expectedPath: [.sleep, .breathe, .focus]),
            RuleCase(id: "R12", name: "低社交连接优先联系", records: [record(.anxious, 6.5, 4200, 12, "最近不太想说话")], expectedRisk: .normal, expectedPath: [.friend, .breathe, .walk]),
            RuleCase(id: "R13", name: "极低睡眠三步路径", records: [record(.tired, 4.8, 2200, 40, "昨晚几乎没睡")], expectedRisk: .normal, expectedPath: [.sleep, .breathe, .journal])
        ]
    }

    static func demoRecords() -> [MindPulseRecord] {
        let moods: [(Mood, Double, Int, Int, String)] = [
            (.happy, 7.4, 8520, 82, "今天出门晒了太阳，心情比前几天轻了一点。"),
            (.calm, 6.9, 6450, 58, "图书馆里效率不错，整个人比较安定。"),
            (.anxious, 5.3, 3180, 34, "想到这周要交的东西，心里一直有点绷。"),
            (.sad, 5.1, 2410, 18, "今天有点想躲起来，不太想说话。"),
            (.tired, 4.9, 3910, 26, "昨天熬得太晚，今天整个人像没充上电。"),
            (.calm, 6.2, 6120, 44, "晚上把几件事理顺了一点，心里没那么堵。"),
            (.anxious, 5.4, 4200, 38, "昨晚没睡踏实，今天还是有点紧，但至少愿意开始做第一步。")
        ]
        var records = moods.enumerated().map { index, item in
            MindPulseRecord(
                date: Calendar.current.date(byAdding: .day, value: index - moods.count + 1, to: Date()) ?? Date(),
                entryType: "daily",
                mood: item.0,
                sleepHours: item.1,
                steps: item.2,
                socialScore: item.3,
                energyLevel: .mid,
                connectionNeed: .ok,
                note: item.4,
                dataInputMode: "demo",
                completedInterventions: []
            )
        }
        if let today = Calendar.current.date(bySettingHour: 13, minute: 20, second: 0, of: Date()) {
            records.append(MindPulseRecord(
                date: today,
                entryType: "instant",
                mood: .angry,
                sleepHours: 5.4,
                steps: 3900,
                socialScore: 32,
                energyLevel: .mid,
                connectionNeed: .avoid,
                note: "中午和同学沟通不顺，有一阵很烦。",
                dataInputMode: "demo-instant",
                completedInterventions: []
            ))
        }
        if let today = Calendar.current.date(bySettingHour: 14, minute: 35, second: 0, of: Date()) {
            records.append(MindPulseRecord(
                date: today,
                entryType: "instant",
                mood: .happy,
                sleepHours: 5.4,
                steps: 4600,
                socialScore: 52,
                energyLevel: .mid,
                connectionNeed: .ok,
                note: "后来出去走了一圈，和朋友聊了几句，心情轻了一点。",
                dataInputMode: "demo-instant",
                completedInterventions: []
            ))
        }
        return records.sorted { $0.date < $1.date }
    }

    private static func dangerSignal(in text: String) -> (level: String, pattern: String)? {
        let safePatterns = ["不想活在.*里", "不想活[着得].*但是", "不想活[着得].*不过", "活着.*[但虽].*还", "撑不住.*[但虽].*还是"]
        if safePatterns.contains(where: { text.range(of: $0, options: .regularExpression) != nil }) {
            return nil
        }
        let patterns: [(String, String)] = [
            ("自[杀傷伤]|自杀", "critical"),
            ("伤害\\s*(自己|自身|我)", "critical"),
            ("自残", "critical"),
            ("不想活|不想[再在]?活|活不下去|活着.*累|活着.*痛苦", "critical"),
            ("想[要去]?死|想消失|想[从]?[这這]个世界上?消失", "critical"),
            ("没有意义|毫无意义|活着.*没有.*意义", "high"),
            ("撑不住|撑不下去|受不了了|忍不了了", "high"),
            ("绝望|看不到希望|没有任何希望", "high"),
            ("不想[存在存]在|想要结束", "high"),
            ("解脱|一了百了|不如[死消失]", "high"),
            ("留[不没]?住|没有人在乎|没人.*在乎", "medium")
        ]
        guard let matched = patterns.first(where: { text.range(of: $0.0, options: .regularExpression) != nil }) else {
            return nil
        }
        return (level: matched.1, pattern: matched.0)
    }

    private static func lowSleepDays(_ records: [MindPulseRecord]) -> Int {
        records.suffix(4).filter { $0.sleepHours < 6 }.count
    }

    private static func recentNegativeCount(_ records: [MindPulseRecord]) -> Int {
        records.suffix(4).filter { negativeMoods.contains($0.mood) }.count
    }

    private static func basePath(for mood: Mood) -> [InterventionID] {
        switch mood {
        case .anxious: return [.breathe, .walk, .journal]
        case .sad: return [.breathe, .friend, .sleep]
        case .tired: return [.sleep, .breathe, .focus]
        case .angry: return [.breathe, .walk, .friend]
        case .calm, .happy: return [.focus, .journal, .walk]
        }
    }

    private static func baseTitle(for mood: Mood) -> String {
        switch mood {
        case .anxious: return "先缓下来，再把自己接住"
        case .sad: return "先别一个人闷着"
        case .tired: return "先停一下，不要硬撑"
        case .angry: return "先把火气散掉一点"
        case .calm: return "今天适合稳稳地往前走"
        case .happy: return "状态不错，可以这样安排"
        }
    }

    private static func personalize(chain: [InterventionID], stats: [InterventionID: InterventionStat]) -> [InterventionID] {
        chain.enumerated().map { index, id in
            let stat = stats[id]
            let boost = stat.map { min(2.4, Double($0.count) * 0.35) + max(0, Double($0.averageDelta)) / 8.0 } ?? 0
            return (id, Double(index) - boost)
        }
        .sorted { $0.1 < $1.1 }
        .map(\.0)
    }

    private static func bestLearning(stats: [InterventionID: InterventionStat]) -> (id: InterventionID, averageDelta: Int)? {
        stats
            .map { (id: $0.key, averageDelta: $0.value.averageDelta) }
            .sorted { $0.averageDelta > $1.averageDelta }
            .first
    }

    private static func unique<T: Hashable>(_ items: [T]) -> [T] {
        var seen = Set<T>()
        return items.filter { seen.insert($0).inserted }
    }

    private static func average(_ values: [Double], fallback: Double) -> Double {
        guard !values.isEmpty else { return fallback }
        return values.reduce(0, +) / Double(values.count)
    }

    private static func dominantMood(in records: [MindPulseRecord]) -> Mood {
        guard !records.isEmpty else { return .calm }
        let counts = Dictionary(grouping: records, by: \.mood).mapValues(\.count)
        return Mood.allCases.max { (counts[$0] ?? 0) < (counts[$1] ?? 0) } ?? records.last?.mood ?? .calm
    }

    private static func dateKey(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    private static func percentDelta(_ current: Double, _ baseline: Double) -> Int {
        guard baseline != 0 else { return 0 }
        return Int(((current - baseline) / baseline * 100).rounded())
    }

    private static func clamp(_ value: Int, min: Int, max: Int) -> Int {
        Swift.min(max, Swift.max(min, value))
    }

    private static func record(_ mood: Mood, _ sleep: Double, _ steps: Int, _ social: Int, _ note: String) -> MindPulseRecord {
        MindPulseRecord(
            date: Date(),
            mood: mood,
            sleepHours: sleep,
            steps: steps,
            socialScore: social,
            energyLevel: .mid,
            connectionNeed: .ok,
            note: note,
            dataInputMode: "rule-case",
            completedInterventions: []
        )
    }
}

enum HelpTarget: String, CaseIterable, Identifiable, Hashable {
    case counselor
    case friend
    case family

    var id: String { rawValue }

    var title: String {
        switch self {
        case .counselor: return "老师 / 辅导员"
        case .friend: return "朋友"
        case .family: return "家人"
        }
    }
}

enum HelpStyle: String, CaseIterable, Identifiable, Hashable {
    case balanced
    case soft
    case short
    case direct

    var id: String { rawValue }

    var title: String {
        switch self {
        case .balanced: return "稳妥清楚"
        case .soft: return "温和一点"
        case .short: return "短一点"
        case .direct: return "直接一点"
        }
    }
}
