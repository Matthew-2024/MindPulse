(function (global) {
  "use strict";

  function isHighRisk(risk) {
    return !!risk && (risk.level === "高风险" || risk.riskCode === "high" || risk.mode === "help");
  }

  function isOrdinaryAction(actionId) {
    return ["breathe", "walk", "journal", "sleep", "focus", "friend", "self_check", "ordinary_intervention"].indexOf(actionId) >= 0;
  }

  function blocksAction(actionId, risk) {
    if (!risk) return false;
    if (isHighRisk(risk)) return actionId !== "help";
    if (Array.isArray(risk.blockedActions) && risk.blockedActions.indexOf(actionId) >= 0) return true;
    if (risk.mode === "ask" && isOrdinaryAction(actionId)) return true;
    return false;
  }

  function routeTab(tabId, risk) {
    return isHighRisk(risk) && tabId === "companion" ? "help" : tabId;
  }

  function canShowSelfCheck(risk) {
    return !isHighRisk(risk) && !(risk && Array.isArray(risk.blockedActions) && risk.blockedActions.indexOf("self_check") >= 0);
  }

  function canStartAction(actionId, risk) {
    return !blocksAction(actionId, risk);
  }

  global.MindPulseRiskGate = {
    isHighRisk: isHighRisk,
    blocksAction: blocksAction,
    routeTab: routeTab,
    canShowSelfCheck: canShowSelfCheck,
    canStartAction: canStartAction,
    isOrdinaryAction: isOrdinaryAction
  };
})(window);
