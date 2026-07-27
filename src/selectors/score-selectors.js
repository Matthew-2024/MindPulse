(function (global) {
  "use strict";

  function beforeAfter(events) {
    var list = Array.isArray(events) ? events : [];
    var latest = list.length ? list[list.length - 1] : null;
    if (!latest) return { before: null, after: null, delta: null, hasData: false };
    return {
      before: Number(latest.beforeScore),
      after: Number(latest.afterScore),
      delta: Number(latest.delta),
      hasData: true
    };
  }

  function averageDelta(events, id) {
    var list = (Array.isArray(events) ? events : []).filter(function (event) {
      return (event.interventionId === id || event.id === id) && isLearningEligible(event);
    });
    if (!list.length) return 0;
    return Math.round(list.reduce(function (sum, event) {
      return sum + Number(event.delta || 0);
    }, 0) / list.length);
  }

  function isLearningEligible(event) {
    if (!event || event.eligibleForLearning === false) return false;
    if (event.riskCode === "high" || event.mode === "help" || event.risk === "高风险" || event.level === "高风险") return false;
    var delta = Number(event.delta);
    return Number.isFinite(delta) && event.interventionId !== "help" && event.id !== "help";
  }

  function feedbackSummary(events, id, minSamples) {
    var threshold = Number(minSamples || 3);
    var list = (Array.isArray(events) ? events : []).filter(function (event) {
      return (!id || event.interventionId === id || event.id === id) && isLearningEligible(event);
    });
    var weighted = 0;
    var weightTotal = 0;
    list.forEach(function (event, index) {
      var weight = Math.pow(.75, list.length - index - 1);
      weighted += Number(event.delta) * weight;
      weightTotal += weight;
    });
    var avg = list.length ? Math.round(weighted / weightTotal * 10) / 10 : 0;
    return {
      count: list.length,
      eligible: list.length >= threshold,
      avgDelta: avg,
      status: list.length >= threshold ? "ready" : "insufficient",
      explanation: list.length >= threshold
        ? "基于同类反馈的个人倾向，不代表因果或治疗效果"
        : "样本不足，暂不形成个人倾向"
    };
  }

  function strategySnapshot(risk) {
    var value = risk || {};
    return {
      mode: value.mode || "action",
      risk: value.level || value.risk || "数据不足",
      allowedActions: Array.isArray(value.allowedActions) ? value.allowedActions.slice() : [],
      blockedActions: Array.isArray(value.blockedActions) ? value.blockedActions.slice() : [],
      evidence: Array.isArray(value.evidence) ? value.evidence.slice() : [],
      explanation: value.explanation || value.reason || ""
    };
  }

  function validationReport(records, events, scoreSelector, riskSelector) {
    var safeRecords = Array.isArray(records) ? records : [];
    var analyzed = safeRecords.map(function (record, index) {
      var history = safeRecords.slice(0, index + 1);
      var completed = record.completedInterventions || [];
      return {
        score: scoreSelector(record, completed),
        risk: riskSelector(history)
      };
    });
    var avgScore = analyzed.length
      ? Math.round(analyzed.reduce(function (sum, item) { return sum + item.score; }, 0) / analyzed.length)
      : 0;
    var completedCount = Array.isArray(events) ? events.length : 0;
    return {
      records: safeRecords.length,
      avgScore: avgScore,
      completedRate: safeRecords.length ? Math.min(100, Math.round(completedCount / safeRecords.length * 100)) : 0,
      highRisk: analyzed.filter(function (item) { return item.risk === "高风险"; }).length
    };
  }

  global.MindPulseScoreSelectors = {
    beforeAfter: beforeAfter,
    averageDelta: averageDelta,
    feedbackSummary: feedbackSummary,
    isLearningEligible: isLearningEligible,
    strategySnapshot: strategySnapshot,
    validationReport: validationReport
  };
})(window);
