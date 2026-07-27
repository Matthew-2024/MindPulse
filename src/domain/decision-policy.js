(function (global) {
  "use strict";

  var POLICY_VERSION = "mindpulse-policy-2.0";
  var REASON_CODES = Object.freeze({
    DATA_INSUFFICIENT: "DATA_INSUFFICIENT",
    BASELINE_DEVIATION: "BASELINE_DEVIATION",
    LOW_SLEEP_REPEATED: "LOW_SLEEP_REPEATED",
    LOW_CONNECTION_REPEATED: "LOW_CONNECTION_REPEATED",
    NEGATIVE_MOOD_REPEATED: "NEGATIVE_MOOD_REPEATED",
    TEXT_CRISIS_SIGNAL: "TEXT_CRISIS_SIGNAL",
    SINGLE_WAVE: "SINGLE_WAVE",
    STABLE_BASELINE: "STABLE_BASELINE"
  });
  var ACTIONS = ["checkin", "breathe", "walk", "focus", "journal", "sleep", "friend", "help"];
  var SAFE_SELF_HELP_ACTIONS = ["breathe", "walk", "focus", "journal", "sleep", "friend", "help"];
  var NEGATIVE_MOODS = ["sad", "anxious", "tired", "angry"];
  var DANGER_PATTERNS = [
    /自[杀殺伤傷残殘]/,
    /伤害\s*(自己|自身|我)/,
    /不想[再在]?活|活不下去/,
    /想[要去]?死|想消失|想从这个世界上消失/,
    /绝望|看不到希望|没有任何希望/,
    /撑不住|撑不下去|受不了了/,
    /一了百了|不想存在/
  ];
  var SAFE_PHRASES = [
    /不想活在.*里/,
    /(?:没有|并无|无)\s*(?:自杀|自伤|自残|伤害\s*(?:自己|自身|我))(?:的)?\s*(?:想法|念头|计划|冲动)/
  ];
  var MOOD_ACTIONS = {
    anxious: ["breathe", "walk", "journal"],
    sad: ["breathe", "friend", "sleep"],
    tired: ["sleep", "breathe", "focus"],
    angry: ["breathe", "walk", "friend"],
    calm: ["focus", "journal", "walk"],
    happy: ["focus", "journal", "walk"]
  };

  function numberOf(record, primary, fallback, defaultValue) {
    var value = record && record[primary] != null ? record[primary] : record && record[fallback];
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }

  function moodOf(record) {
    return record && (record.mood || record.et) || "calm";
  }

  function textOf(record) {
    return String(record && (record.note || record.text || record.checkinNote) || "");
  }

  function containsDanger(text) {
    var normalized = String(text || "").toLowerCase();
    SAFE_PHRASES.forEach(function (pattern) {
      normalized = normalized.replace(pattern, " ");
    });
    return DANGER_PATTERNS.some(function (pattern) { return pattern.test(normalized); });
  }

  function unique(items) {
    return items.filter(function (item, index) { return item && items.indexOf(item) === index; });
  }

  function blockedFrom(allowed) {
    return ACTIONS.filter(function (action) { return allowed.indexOf(action) < 0; });
  }

  function average(records, selector) {
    if (!records.length) return 0;
    return records.reduce(function (sum, record) { return sum + selector(record); }, 0) / records.length;
  }

  function baselineEvidence(records) {
    if (records.length < 3) return [];
    var latest = records[records.length - 1];
    var history = records.slice(0, -1).slice(-6);
    var evidence = [];
    var sleepBase = average(history, function (record) { return numberOf(record, "sleepHours", "sleep", 0); });
    var stepsBase = average(history, function (record) { return numberOf(record, "steps", "step", 0); });
    var socialBase = average(history, function (record) { return numberOf(record, "socialScore", "sc", 0); });
    var sleepNow = numberOf(latest, "sleepHours", "sleep", 0);
    var stepsNow = numberOf(latest, "steps", "step", 0);
    var socialNow = numberOf(latest, "socialScore", "sc", 0);
    if (sleepBase && sleepNow <= sleepBase * 0.75) evidence.push("睡眠低于个人基线 25% 以上");
    if (stepsBase && stepsNow <= stepsBase * 0.6) evidence.push("活动低于个人基线 40% 以上");
    if (socialBase && socialNow <= socialBase - 20) evidence.push("连接感低于个人基线 20 点以上");
    return evidence;
  }

  function decisionId(now, records, mode) {
    var seed = String(now) + "|" + mode + "|" + records.length + "|" + textOf(records[records.length - 1]);
    var hash = 2166136261;
    for (var index = 0; index < seed.length; index += 1) {
      hash ^= seed.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return "decision_" + (hash >>> 0).toString(36);
  }

  function makeTrace(records, options, mode, reasonCodes, allowedActions, evidence) {
    var now = options.now || new Date().toISOString();
    return {
      decisionId: decisionId(now, records, mode),
      evaluatedAt: String(now).trim(),
      reasonCodes: unique(reasonCodes),
      mode: mode,
      allowedActions: unique(allowedActions),
      blockedActions: blockedFrom(allowedActions),
      evidence: unique(evidence),
      policyVersion: POLICY_VERSION,
      dataSource: options.source || "自我记录",
      confidence: records.length >= 5 ? "高" : (records.length >= 2 ? "中" : "低")
    };
  }

  function evaluateState(rawRecords, rawOptions) {
    var records = Array.isArray(rawRecords) ? rawRecords.filter(Boolean) : [];
    var options = rawOptions || {};
    var latest = records[records.length - 1] || {};
    if (containsDanger(records.map(textOf).join(" "))) {
      return makeTrace(records, options, "HIGH_RISK", [REASON_CODES.TEXT_CRISIS_SIGNAL], ["help"], ["危机文本信号触发 Safety Gate"]);
    }
    if (records.length < 2) {
      return makeTrace(records, options, "DATA_INSUFFICIENT", [REASON_CODES.DATA_INSUFFICIENT], ["checkin"], ["有效记录少于 2 条，个人基线仍在建立"]);
    }

    var recent = records.slice(-4);
    var lowSleepCount = recent.filter(function (record) { return numberOf(record, "sleepHours", "sleep", 8) < 6; }).length;
    var lowConnectionCount = recent.filter(function (record) { return numberOf(record, "socialScore", "sc", 100) < 20; }).length;
    var negativeCount = recent.filter(function (record) { return NEGATIVE_MOODS.indexOf(moodOf(record)) >= 0; }).length;
    var deviationEvidence = baselineEvidence(records);
    var reasons = [];
    var evidence = deviationEvidence.slice();
    if (deviationEvidence.length) reasons.push(REASON_CODES.BASELINE_DEVIATION);
    if (lowSleepCount >= 3) {
      reasons.push(REASON_CODES.LOW_SLEEP_REPEATED);
      evidence.push("最近 4 条记录中至少 3 次睡眠低于 6 小时");
    }
    if (lowConnectionCount >= 3) {
      reasons.push(REASON_CODES.LOW_CONNECTION_REPEATED);
      evidence.push("最近 4 条记录中至少 3 次连接感低于 20%");
    }
    if (negativeCount >= 3) {
      reasons.push(REASON_CODES.NEGATIVE_MOOD_REPEATED);
      evidence.push("最近 4 条记录中至少 3 次为负面状态");
    }

    if (reasons.indexOf(REASON_CODES.LOW_SLEEP_REPEATED) >= 0 ||
        reasons.indexOf(REASON_CODES.LOW_CONNECTION_REPEATED) >= 0 ||
        reasons.indexOf(REASON_CODES.NEGATIVE_MOOD_REPEATED) >= 0) {
      return makeTrace(records, options, "MODERATE", reasons, SAFE_SELF_HELP_ACTIONS, evidence);
    }

    if (deviationEvidence.length || NEGATIVE_MOODS.indexOf(moodOf(latest)) >= 0) {
      reasons.push(REASON_CODES.SINGLE_WAVE);
      return makeTrace(records, options, "NORMAL", reasons, SAFE_SELF_HELP_ACTIONS, evidence.concat(["当前属于普通波动，可执行低负担行动"]));
    }

    return makeTrace(records, options, "STABLE", [REASON_CODES.STABLE_BASELINE], SAFE_SELF_HELP_ACTIONS, ["当前信号接近个人基线"]);
  }

  function assertActionAllowed(trace, action) {
    if (!trace || !Array.isArray(trace.allowedActions) || trace.allowedActions.indexOf(action) < 0) {
      throw new Error("SAFETY_GATE_BLOCKED: " + action);
    }
    return true;
  }

  function strategyLabel(trace) {
    if (!trace) return "补充一条记录";
    if (trace.mode === "HIGH_RISK") return "只允许求助";
    if (trace.mode === "DATA_INSUFFICIENT") return "补充一条记录";
    if (trace.mode === "MODERATE") return "连接一个可信任的人";
    return "允许低负担行动";
  }

  global.MindPulseDecisionPolicy = Object.freeze({
    POLICY_VERSION: POLICY_VERSION,
    REASON_CODES: REASON_CODES,
    ACTIONS: ACTIONS.slice(),
    evaluateState: evaluateState,
    assertActionAllowed: assertActionAllowed,
    strategyLabel: strategyLabel
  });
})(globalThis);
