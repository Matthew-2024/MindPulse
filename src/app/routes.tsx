import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { isHighRisk, isInsufficient } from "../domain/evaluate-state";
import { useMindPulse } from "./store";
import { HomePage } from "../features/home/HomePage";
import { CheckinPage } from "../features/checkin/CheckinPage";
import { InsightPage } from "../features/insight/InsightPage";
import { CompanionPage } from "../features/companion/CompanionPage";
import { HelpPage } from "../features/help/HelpPage";
import { ReportsPage } from "../features/reports/ReportsPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { RuleLabPage } from "../features/rule-lab/RuleLabPage";
import { BottlePage } from "../features/bottle/BottlePage";
import { TrustedCirclePage } from "../features/trusted-circle/TrustedCirclePage";

function SafetyRedirect() {
  const { decision, state } = useMindPulse();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const isSafetyReassessment = location.pathname === "/checkin" && state.safetyReassessmentOpen;
    if (isHighRisk(decision.risk) && location.pathname !== "/help" && !isSafetyReassessment) {
      navigate("/help", { replace: true });
      return;
    }
    if (isInsufficient(decision.risk) && (location.pathname === "/companion" || location.pathname === "/bottle")) {
      navigate("/checkin", { replace: true });
    }
  }, [decision.risk, location.pathname, navigate, state.safetyReassessmentOpen]);

  return null;
}

export function AppRoutes() {
  return (
    <>
      <SafetyRedirect />
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/checkin" element={<CheckinPage />} />
          <Route path="/insight" element={<InsightPage />} />
          <Route path="/companion" element={<CompanionPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/rules" element={<RuleLabPage />} />
          <Route path="/bottle" element={<BottlePage />} />
          <Route path="/circle" element={<TrustedCirclePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </>
  );
}
