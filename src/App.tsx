import React from "react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import { SharedClientReportPage } from "./pages/SharedClientReportPage";
import { AdminAccessRequestsPage } from "./pages/AdminAccessRequestsPage";
import { BulkUploadCandidatesPage } from "./pages/BulkUploadCandidatesPage";
import { CandidateEvidenceReportPage } from "./pages/CandidateEvidenceReportPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DemoPresentationPage } from "./pages/DemoPresentationPage";
import { DemoTestLabPage } from "./pages/DemoTestLabPage";
import { JobsPage } from "./pages/JobsPage";
import { JobCandidateListPage } from "./pages/JobCandidateListPage";
import { AgencyClientsPage } from "./pages/AgencyClientsPage";
import { CandidateWorkflowPage } from "./pages/CandidateWorkflowPage";
import { WorkflowHubPage } from "./pages/WorkflowHubPage";
import { ManualEvidenceReviewPage } from "./pages/ManualEvidenceReviewPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { RequestPilotPage } from "./pages/RequestPilotPage";
import { SetPasswordPage } from "./pages/SetPasswordPage";
import { PilotAccessPage } from "./pages/PilotAccessPage";
import { AdminPaidAccessRequestsPage } from "./pages/AdminPaidAccessRequestsPage";
import { PilotTermsPage, PrivacyNoticePage, SingaporeReadinessPage } from "./pages/PublicInfoPages";
import { WorkspacePrivacyPage } from "./pages/WorkspacePrivacyPage";
import { WorkspaceSupportPage } from "./pages/WorkspaceSupportPage";
import { AdminOperationsPage } from "./pages/AdminOperationsPage";
import { WorkspaceAccessBoundary } from "./components/auth/WorkspaceAccessBoundary";
import { ProductGuidePage } from "./pages/ProductGuidePage";
import { CompanySettingsPage } from "./pages/CompanySettingsPage";
import { AdminCompanyControlsPage } from "./pages/AdminCompanyControlsPage";
import { PilotTestingPage } from "./pages/PilotTestingPage";

type AppProps = {
  path?: string;
};

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/product" element={<ProductGuidePage page="product" />} />
      <Route path="/product/evidence-review" element={<ProductGuidePage page="evidence-review" />} />
      <Route path="/solutions/recruitment-agencies" element={<ProductGuidePage page="agencies" />} />
      <Route path="/solutions/hiring-teams" element={<ProductGuidePage page="hiring-teams" />} />
      <Route path="/resources" element={<ProductGuidePage page="resources" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route path="/welcome" element={<SetPasswordPage />} />
      <Route element={<WorkspaceAccessBoundary requireAdmin />}>
        <Route path="/admin/access-requests" element={<AdminAccessRequestsPage />} />
        <Route path="/admin/paid-access-requests" element={<AdminPaidAccessRequestsPage />} />
        <Route path="/admin/support" element={<WorkspaceSupportPage adminOnly />} />
        <Route path="/admin/operations" element={<AdminOperationsPage />} />
        <Route path="/admin/company-controls" element={<AdminCompanyControlsPage />} />
      </Route>
      <Route path="/shared-report" element={<SharedClientReportPage />} />
      <Route path="/request-pilot" element={<RequestPilotPage />} />
      <Route path="/privacy" element={<PrivacyNoticePage />} />
      <Route path="/pilot-terms" element={<PilotTermsPage />} />
      <Route path="/singapore-readiness" element={<SingaporeReadinessPage />} />
      <Route path="/demo-presentation" element={<DemoPresentationPage />} />
      <Route path="/demo-test-lab" element={<DemoTestLabPage />} />
      <Route element={<WorkspaceAccessBoundary />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pilot-access" element={<PilotAccessPage />} />
        <Route path="/pilot-testing" element={<PilotTestingPage />} />
        <Route path="/workspace/privacy" element={<WorkspacePrivacyPage />} />
        <Route path="/workspace/support" element={<WorkspaceSupportPage />} />
        <Route path="/workspace/clients" element={<AgencyClientsPage />} />
        <Route path="/workspace/company" element={<CompanySettingsPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/workflow" element={<WorkflowHubPage />} />
        <Route path="/jobs/:jobId/candidates" element={<JobCandidateListPage />} />
        <Route path="/jobs/:jobId/workflow" element={<CandidateWorkflowPage />} />
        <Route path="/jobs/:jobId/candidates/upload" element={<BulkUploadCandidatesPage />} />
        <Route path="/jobs/:jobId/candidates/:documentId/manual-review" element={<ManualEvidenceReviewPage />} />
        <Route path="/reports/:reportId" element={<CandidateEvidenceReportPage />} />
      </Route>
      <Route path="/reports/candidate-evidence" element={<CandidateEvidenceReportPage syntheticSample />} />
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
