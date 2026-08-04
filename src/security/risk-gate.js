(function (global) {
  "use strict";

  function isHighRisk(risk) {
    return !!risk && (risk.level === "高风险" || risk.riskCode === "high" || risk.mode === "help");
  }

  function isOrdinaryAction(actionId) {
    return ["breathe", "walk", "journal", "sleep", "focus", "friend", "self_check", "ordinary_intervention", "companion", "bottle"].indexOf(actionId) >= 0;
  }

  function isInsufficient(risk) {
    return !!risk && (risk.level === "数据不足" || risk.riskCode === "insufficient" || risk.mode === "ask");
  }

  function blocksAction(actionId, risk) {
    if (!risk) return false;
    if (isHighRisk(risk)) return actionId !== "help";
    if (Array.isArray(risk.blockedActions) && risk.blockedActions.indexOf(actionId) >= 0) return true;
    if (risk.mode === "ask" && isOrdinaryAction(actionId)) return true;
    return false;
  }

  function routeTab(tabId, risk) {
    if (isHighRisk(risk) && tabId === "companion") return "help";
    if (isInsufficient(risk) && (tabId === "companion" || tabId === "bottle")) return "checkin";
    return tabId;
  }

  function blocksRoute(pathname, risk) {
    if (isHighRisk(risk)) return pathname !== "/help" && pathname !== "/checkin";
    if (isInsufficient(risk)) return pathname === "/companion" || pathname === "/bottle";
    return false;
  }

  function canShowSelfCheck(risk) {
    return !isHighRisk(risk) && !(risk && Array.isArray(risk.blockedActions) && risk.blockedActions.indexOf("self_check") >= 0);
  }

  function canStartAction(actionId, risk) {
    return !blocksAction(actionId, risk);
  }

  global.MindPulseRiskGate = {
    isHighRisk: isHighRisk,
    isInsufficient: isInsufficient,
    blocksAction: blocksAction,
    blocksRoute: blocksRoute,
    routeTab: routeTab,
    canShowSelfCheck: canShowSelfCheck,
    canStartAction: canStartAction,
    isOrdinaryAction: isOrdinaryAction
  };
})(window);
