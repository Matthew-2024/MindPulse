(function (global) {
  var NEGATIVE_MOODS = ["sad", "anxious", "tired", "angry"];
  var MOOD_LEVELS = {
    happy: 5,
    calm: 4,
    anxious: 3,
    sad: 2,
    tired: 2,
    angry: 2
  };
  var SCORE_LIMITS = {
    mood: 60,
    sleep: 18,
    steps: 14,
    social: 12,
    intervention: 8
  };
  var PATHS = {
    anxious: ["breathe", "walk", "journal"],
    sad: ["breathe", "friend", "sleep"],
    tired: ["sleep", "breathe", "focus"],
    angry: ["breathe", "walk", "friend"],
    calm: ["focus", "journal", "walk"],
    happy: ["focus", "journal", "walk"]
  };
  var PATH_REASONS = {
    anxious: "先降低生理唤醒，再把注意力从压力源中移开。",
    sad: "先稳定状态，再建立连接，避免独自承受。",
    tired: "优先恢复身体电量，再恢复掌控感。",
    angry: "先把身体带离情绪中心，再表达。",
    calm: "顺势完成小目标，保留稳定节奏。",
    happy: "利用较好状态推进小目标，并留下正向记录。"
  };
  var DANGER_PATTERNS = [
    { re: /自[杀傷伤]|自杀/, level: "critical" },
    { re: /伤害\s*(自己|自身|我)/, level: "critical" },
    { re: /自残/, level: "critical" },
    { re: /不想活|不想[再在]?活|活不下去|活着.*累|活着.*痛苦/, level: "critical" },
    { re: /想[要去]?死|想消失|想[从]?[这這]个世界上?消失/, level: "critical" },
    { re: /没有意义|毫无意义|活着.*没有.*意义/, level: "high" },
    { re: /撑不住|撑不下去|受不了了|忍不了了/, level: "high" },
    { re: /绝望|看不到希望|没有任何希望/, level: "high" },
    { re: /不想存在|想要结束/, level: "high" },
    { re: /解脱|一了百了|不如[死消失]/, level: "high" },
    { re: /留[不没]?住|没有人在乎|没人.*在乎/, level: "medium" }
  ];
  var SAFE_PHRASES = [
    /不想活在.*里/,
    /不想活[着得].*但是/,
    /不想活[着得].*不过/,
    /活着.*[但虽].*还/,
    /撑不住.*[但虽].*还是/,
    /(?:没有|并无|无)\s*(?:自杀|自伤|自残|伤害\s*(?:自己|自身|我))(?:的)?\s*(?:想法|念头|计划|冲动)/,
    /(?:没有|并无|无)\s*想过\s*(?:自杀|自伤|自残|伤害\s*(?:自己|自身|我))/
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function textOf(record) {
    return String(record.note || record.text || record.checkinNote || "");
  }

  function moodOf(record) {
    return record.mood || record.et || "calm";
  }

  function sleepOf(record) {
    return toNumber(record.sleepHours != null ? record.sleepHours : record.sleep, 0);
  }

  function stepsOf(record) {
    return toNumber(record.steps != null ? record.steps : record.step, 0);
  }

  function socialOf(record) {
    return toNumber(record.socialScore != null ? record.socialScore : record.sc, 0);
  }

  function unique(list) {
    var out = [];
    list.forEach(function (item) {
      if (item && out.indexOf(item) < 0) out.push(item);
    });
    return out;
  }

  function completePath(chain, mood) {
    var base = PATHS[mood] || PATHS.calm;
    var fallback = ["breathe", "journal", "friend", "sleep", "walk", "focus"];
    return unique(chain.concat(base).concat(fallback)).slice(0, 3);
  }

  function calculateRecoveryScore(record, completedInterventions) {
    record = record || {};
    var mood = moodOf(record);
    var moodLevel = MOOD_LEVELS[mood] || 3;
    var sleepHours = sleepOf(record);
    var steps = stepsOf(record);
    var socialScore = socialOf(record);
    var completed = (completedInterventions && completedInterventions.length) ||
      (Array.isArray(record.completedInterventions) ? record.completedInterventions.length : 0);
    var breakdown = {
      mood: clamp(moodLevel * 12, 0, SCORE_LIMITS.mood),
      sleep: clamp(Math.round((sleepHours / 8) * SCORE_LIMITS.sleep), 0, SCORE_LIMITS.sleep),
      steps: clamp(Math.round((steps / 8000) * SCORE_LIMITS.steps), 0, SCORE_LIMITS.steps),
      social: clamp(Math.round((socialScore / 100) * SCORE_LIMITS.social), 0, SCORE_LIMITS.social),
      intervention: completed > 0 ? SCORE_LIMITS.intervention : 0
    };
    breakdown.total = clamp(
      breakdown.mood + breakdown.sleep + breakdown.steps + breakdown.social + breakdown.intervention,
      0,
      100
    );
    return {
      total: breakdown.total,
      breakdown: breakdown,
      explanation: "情绪 " + breakdown.mood + " 分、睡眠 " + breakdown.sleep + " 分、步数 " +
        breakdown.steps + " 分、社交 " + breakdown.social + " 分、干预 " + breakdown.intervention +
        " 分，合成当前恢复指数。"
    };
  }

  function detectDanger(text) {
    var normalized = String(text || "").toLowerCase().trim();
    for (var i = 0; i < SAFE_PHRASES.length; i++) {
      normalized = normalized.replace(SAFE_PHRASES[i], " ");
    }
    for (var j = 0; j < DANGER_PATTERNS.length; j++) {
      if (DANGER_PATTERNS[j].re.test(normalized)) {
        return {
          hasDanger: true,
          matchedPattern: DANGER_PATTERNS[j].re.source,
          level: DANGER_PATTERNS[j].level
        };
      }
    }
    return { hasDanger: false, matchedPattern: null, level: null };
  }

  function lowSleepDays(records) {
    return (Array.isArray(records) ? records : []).slice(-4).filter(function (record) {
      return sleepOf(record) < 6;
    }).length;
  }

  function recentNegativeCount(records) {
    return (Array.isArray(records) ? records : []).slice(-4).filter(function (record) {
      return NEGATIVE_MOODS.indexOf(moodOf(record)) >= 0;
    }).length;
  }

  function average(records, selector, fallback) {
    if (!records.length) return fallback;
    return records.reduce(function (sum, record) {
      return sum + selector(record);
    }, 0) / records.length;
  }

  function percentDelta(current, baseline) {
    if (!baseline) return 0;
    return Math.round((current - baseline) / baseline * 100);
  }

  function calculatePersonalBaseline(records) {
    var safeRecords = Array.isArray(records) ? records : [];
    var latest = safeRecords[safeRecords.length - 1] || {};
    var history = safeRecords.slice(0, -1).slice(-6);
    if (!history.length) history = safeRecords.slice(0, -1);
    var base = {
      days: history.length,
      mood: average(history, function (record) {
        return MOOD_LEVELS[moodOf(record)] || record.moodScore || record.ii || 3;
      }, MOOD_LEVELS[moodOf(latest)] || latest.moodScore || latest.ii || 3),
      sleep: average(history, sleepOf, sleepOf(latest)),
      steps: average(history, stepsOf, stepsOf(latest)),
      social: average(history, socialOf, socialOf(latest))
    };
    var delta = {
      mood: +((MOOD_LEVELS[moodOf(latest)] || latest.moodScore || latest.ii || 3) - base.mood).toFixed(1),
      sleepPct: percentDelta(sleepOf(latest), base.sleep),
      stepsPct: percentDelta(stepsOf(latest), base.steps),
      social: +(socialOf(latest) - base.social).toFixed(0)
    };
    var flags = [];
    if (delta.sleepPct <= -25) flags.push("睡眠低于个人基线 " + Math.abs(delta.sleepPct) + "%");
    if (delta.stepsPct <= -40) flags.push("活动低于个人基线 " + Math.abs(delta.stepsPct) + "%");
    if (delta.social <= -20) flags.push("连接感低于个人基线 " + Math.abs(delta.social) + " 点");
    if (delta.mood <= -1) flags.push("情绪低于个人基线 " + Math.abs(delta.mood).toFixed(1) + " 级");
    var level = flags.length >= 2 ? "明显偏离" : (flags.length === 1 ? "轻度偏离" : "接近基线");
    return {
      base: base,
      delta: delta,
      flags: flags,
      level: level,
      title: level === "接近基线" ? "今天接近自己的正常节奏" :
        (level === "轻度偏离" ? "今天有一个信号偏离基线" : "今天多个信号偏离个人基线"),
      desc: flags.length ? flags.join("；") + "。这是按个人历史节奏判断，不是和别人比较。" :
        "睡眠、活动和连接感没有明显低于你的近几天基线。"
    };
  }

  function assessRisk(records, currentText) {
    var safeRecords = Array.isArray(records) ? records : [];
    var latest = safeRecords[safeRecords.length - 1] || {};
    var danger = detectDanger(textOf(latest) + " " + (currentText || ""));
    if (danger.hasDanger) {
      return {
        level: "高风险",
        tag: "优先求助",
        reason: "文本中出现危机信号（" + danger.level + "级），停止普通自助建议，优先连接热线、老师、家人或专业资源。",
        desc: "文本中出现危机信号时，心晴会先停下普通自助建议，优先展示热线、老师、家人和专业机构入口。",
        evidence: ["Safety Gate: " + danger.level, "pattern: " + danger.matchedPattern],
        shouldRecommendSelfHelp: false
      };
    }
    if (lowSleepDays(safeRecords) >= 3 || recentNegativeCount(safeRecords) >= 3) {
      var evidence = [];
      var lowSleep = lowSleepDays(safeRecords);
      var negative = recentNegativeCount(safeRecords);
      if (lowSleep >= 3) evidence.push("近 4 次记录中 " + lowSleep + " 次睡眠低于 6 小时");
      if (negative >= 3) evidence.push("近 4 次记录中 " + negative + " 次为负向状态");
      return {
        level: "中度关注",
        tag: "建议连接他人",
        reason: "最近低睡眠或负面状态连续出现，建议联系可信任的人或校内支持资源。",
        desc: "本周低睡眠或负面状态连续出现，心晴会优先推荐低负担行动，并提示联系可信任的人。",
        evidence: evidence,
        shouldRecommendSelfHelp: true
      };
    }
    if (NEGATIVE_MOODS.indexOf(moodOf(latest)) >= 0) {
      return {
        level: "普通波动",
        tag: "先做轻干预",
        reason: "当前更像日常压力波动，可先完成一个低负担行动。",
        desc: "当前更像日常压力波动，建议先完成呼吸、散步、记录或睡前放松中的一步。",
        evidence: ["当前情绪: " + moodOf(latest)],
        shouldRecommendSelfHelp: true
      };
    }
    return {
      level: "稳定观察",
      tag: "保持记录",
      reason: "当前状态较平稳，继续保持记录和节奏观察。",
      desc: "当前状态较平稳，心晴会继续记录节奏变化，提醒你维持睡眠和连接感。",
      evidence: ["未触发危机词、连续低睡眠或连续负面状态规则"],
      shouldRecommendSelfHelp: true
    };
  }

  function recommendPath(record, risk) {
    record = record || {};
    if (risk && risk.level === "高风险") {
      return {
        path: ["help"],
        reason: "高风险场景停止普通自助干预，优先进入求助入口。",
        reasons: ["出现危机信号"]
      };
    }
    var mood = moodOf(record);
    var sleepHours = sleepOf(record);
    var socialScore = socialOf(record);
    var energyLevel = record.energyLevel || "mid";
    var connectionNeed = record.connectionNeed || "ok";
    var chain = (PATHS[mood] || PATHS.calm).slice();
    var reasons = [];
    if (connectionNeed === "need" || socialScore < 25) {
      chain = ["friend"].concat(chain);
      reasons.push(connectionNeed === "need" ? "你选择了很需要连接" : "社交连接偏低");
    } else if (connectionNeed === "avoid") {
      chain = chain.filter(function (id) { return id !== "friend"; }).concat(["friend"]);
      reasons.push("你暂时不想联系别人");
    }
    if (sleepHours > 0 && sleepHours < 5.2) {
      chain = ["sleep", "breathe", "journal"].concat(chain.filter(function (id) { return id !== "focus"; }));
      reasons.push("睡眠明显不足");
    } else if (sleepHours > 0 && sleepHours < 6) {
      chain = (mood === "tired" ? ["sleep", "breathe"] : ["breathe", "sleep"]).concat(chain);
      reasons.push("睡眠低于 6 小时");
    }
    if (energyLevel === "low") {
      chain = ["breathe", "journal", "sleep"].concat(chain.filter(function (id) { return id !== "focus"; }));
      reasons.push("精力偏低");
    } else if (energyLevel === "high" && ["happy", "calm"].indexOf(mood) >= 0) {
      chain = ["focus"].concat(chain);
      reasons.push("精力较高");
    }
    if (mood === "angry") {
      chain = ["walk", "breathe"].concat(chain);
      reasons.push("烦躁状态更适合先离开原地");
    }
    return {
      path: completePath(chain, mood),
      reason: reasons.length ? "根据" + reasons.join("、") + "调整推荐顺序。" : (PATH_REASONS[mood] || PATH_REASONS.calm),
      reasons: reasons.length ? unique(reasons) : ["当前状态较平稳"]
    };
  }

  function personalizeRecommendation(path, interventionStats) {
    var stats = interventionStats || {};
    if (!personalizationStatus(stats).formed) return unique(path);
    return unique(path).map(function (id, index) {
      var stat = stats[id];
      var avgDelta = stat && stat.count ? Math.round(stat.totalDelta / stat.count) : 0;
      var boost = stat ? Math.min(2.4, stat.count * 0.35) + Math.max(0, avgDelta) / 8 : 0;
      return { id: id, score: index - boost };
    }).sort(function (a, b) {
      return a.score - b.score;
    }).map(function (item) {
      return item.id;
    });
  }

  function personalizationStatus(stats) {
    stats = stats || {};
    var safeFeedbackCount = Object.keys(stats).reduce(function (sum, key) {
      var stat = stats[key];
      if (key === "__meta" || !stat || typeof stat !== "object") return sum;
      var value = stat.safeCount != null ? stat.safeCount : stat.count;
      return sum + Math.max(0, Number(value) || 0);
    }, 0);
    return {
      formed: safeFeedbackCount >= 3,
      safeFeedbackCount: safeFeedbackCount,
      required: 3,
      excludedHighRisk: Math.max(0, Number(stats.__meta && stats.__meta.excludedHighRisk) || 0)
    };
  }

  function recordSafeFeedback(stats, feedback) {
    stats = stats || {};
    feedback = feedback || {};
    var next = {};
    Object.keys(stats).forEach(function (key) {
      var value = stats[key];
      next[key] = value && typeof value === "object" ? Object.assign({}, value) : value;
    });
    next.__meta = Object.assign({}, next.__meta || {});
    if (feedback.riskMode === "HIGH_RISK" || feedback.riskLevel === "高风险") {
      next.__meta.excludedHighRisk = (Number(next.__meta.excludedHighRisk) || 0) + 1;
      return next;
    }
    var actionId = String(feedback.actionId || "").trim();
    if (!actionId) return next;
    var current = next[actionId] && typeof next[actionId] === "object" ? next[actionId] : {};
    var count = Math.max(0, Number(current.safeCount != null ? current.safeCount : current.count) || 0) + 1;
    next[actionId] = Object.assign({}, current, {
      count: count,
      safeCount: count,
      totalDelta: (Number(current.totalDelta) || 0) + (Number(feedback.delta) || 0),
      lastDelta: Number(feedback.delta) || 0,
      lastAt: feedback.completedAt || new Date().toISOString()
    });
    return next;
  }

  global.MindPulseRules = {
    calculateRecoveryScore: calculateRecoveryScore,
    assessRisk: assessRisk,
    recommendPath: recommendPath,
    calculatePersonalBaseline: calculatePersonalBaseline,
    personalizeRecommendation: personalizeRecommendation,
    personalizationStatus: personalizationStatus,
    recordSafeFeedback: recordSafeFeedback,
    lowSleepDays: lowSleepDays,
    recentNegativeCount: recentNegativeCount,
    detectDanger: detectDanger
  };
})(window);
