import React from "react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
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
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route path="/request-pilot" element={<RequestPilotPage />} />
      <Route path="/demo-presentation" element={<DemoPresentationPage />} />
      <Route path="/demo-test-lab" element={<DemoTestLabPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/jobs/frontend-developer/candidates" element={<JobCandidateListPage />} />
      <Route path="/jobs/frontend-developer/candidates/upload" element={<BulkUploadCandidatesPage />} />
      <Route path="/reports/candidate-evidence" element={<CandidateEvidenceReportPage />} />
      <Route path="/reports/:reportId" element={<CandidateEvidenceReportPage />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
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
      <AppRoutes />
    </BrowserRouter>
  );
}
