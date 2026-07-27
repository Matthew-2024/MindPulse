(function (global) {
  "use strict";

  function snapshot(state) {
    return {
      records: state.recs,
      completed: state.completed,
      interventionStats: state.interventionStats,
      interventionEvents: state.interventionEvents,
      surveyHistory: state.surveyHistory,
      tasks: state.tasks,
      feedbackLearningEnabled: state.feedbackLearningEnabled !== false,
      dataLedger: state.dataLedger || null,
      helpResources: state.helpResources || null
    };
  }

  function apply(state, saved, normalizeRecords) {
    if (!state || !saved || typeof saved !== "object") return;
    if (Array.isArray(saved.records)) state.recs = normalizeRecords(saved.records);
    if (Array.isArray(saved.completed)) state.completed = saved.completed;
    if (saved.interventionStats && typeof saved.interventionStats === "object" && !Array.isArray(saved.interventionStats)) {
      state.interventionStats = saved.interventionStats;
    }
    if (Array.isArray(saved.surveyHistory)) state.surveyHistory = saved.surveyHistory;
    if (Array.isArray(saved.tasks)) state.tasks = saved.tasks;
    if (Array.isArray(saved.interventionEvents)) state.interventionEvents = saved.interventionEvents;
    if (typeof saved.feedbackLearningEnabled === "boolean") state.feedbackLearningEnabled = saved.feedbackLearningEnabled;
    if (saved.dataLedger && typeof saved.dataLedger === "object" && !Array.isArray(saved.dataLedger)) {
      state.dataLedger = saved.dataLedger;
    }
    if (saved.helpResources && typeof saved.helpResources === "object" && !Array.isArray(saved.helpResources)) {
      state.helpResources = saved.helpResources;
    }
  }

  global.MindPulseStateStore = {
    snapshot: snapshot,
    apply: apply
  };
})(window);
