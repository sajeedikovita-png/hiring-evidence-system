import React, { useEffect } from "react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import { getPublicSupabaseClient } from "./services/publicSupabaseClient";
import { AdminPage } from "./pages/AdminPage";
import { BulkUploadCandidatesPage } from "./pages/BulkUploadCandidatesPage";
import { CandidateEvidenceReportPage } from "./pages/CandidateEvidenceReportPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DemoPresentationPage } from "./pages/DemoPresentationPage";
import { DemoTestLabPage } from "./pages/DemoTestLabPage";
import { JobCandidateListPage } from "./pages/JobCandidateListPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RequestPilotPage } from "./pages/RequestPilotPage";
import { SetPasswordPage } from "./pages/SetPasswordPage";

type AppProps = {
  path?: string;
};

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/welcome" element={<SetPasswordPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/request-pilot" element={<RequestPilotPage />} />
      <Route path="/demo-presentation" element={<DemoPresentationPage />} />
      <Route path="/demo-test-lab" element={<DemoTestLabPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/jobs/:jobSlug/candidates" element={<JobCandidateListPage />} />
      <Route path="/jobs/:jobSlug/candidates/upload" element={<BulkUploadCandidatesPage />} />
      <Route path="/reports/candidate-evidence" element={<CandidateEvidenceReportPage />} />
      <Route path="/reports/:reportId" element={<CandidateEvidenceReportPage />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}

/**
 * Password-recovery / invite links redirect to the site's configured URL, which
 * may be the landing page rather than `/welcome`. The public client parses the
 * token from the URL (detectSessionInUrl); when that yields a recovery session
 * we route to `/welcome` so the set-password form is shown wherever the email lands.
 */
function useRecoveryRedirect() {
  useEffect(() => {
    if (typeof window === "undefined" || window.location.pathname === "/welcome") return;
    const client = getPublicSupabaseClient();
    if (!client) return;

    const { data } = client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/welcome") {
        window.location.assign("/welcome");
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);
}

function BrowserApp() {
  useRecoveryRedirect();
  return <AppRoutes />;
}

export function App({ path }: AppProps = {}) {
  if (path) {
    return (
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    );
  }

  return (
    <BrowserRouter>
      <BrowserApp />
    </BrowserRouter>
  );
}
