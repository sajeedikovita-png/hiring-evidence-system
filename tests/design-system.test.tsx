import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { AppShell } from "../components/layout/AppShell";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { NoteTextArea } from "../components/ui/NoteTextArea";
import { WarningCard } from "../components/ui/WarningCard";
import { App, AppRoutes } from "../src/App";
import { applications, candidateReports, candidates, jobs, users } from "../src/data/mockHiringData";
import { hiringSchemaTables } from "../src/data/schema";
import { containsForbiddenHiringLanguage, forbiddenHiringPhrases } from "../src/services/compliance";
import {
  getApplicationsForJob,
  getBulkUploadBatchByJobId,
  getBulkUploadWorkspace,
  getCandidateReport,
  getCandidateReportById,
  getDashboardMetrics,
  getEvidenceItemsForApplication,
  getJobCandidateList
} from "../src/services/mockSelectors";
import { getCandidateEvidenceReport, validateHumanReviewDecision } from "../src/services/reportService";
import { getDashboardData, getJobById, getReportById } from "../src/services/hiringRepository";
import {
  getUploadStateLabels,
  isAcceptedUploadFile,
  validateUploadFile,
  type UploadFileInput
} from "../src/services/uploadService";

const shellHtml = renderToStaticMarkup(
  <AppShell>
    <main>Evidence workspace</main>
  </AppShell>
);

assert.match(shellHtml, /Hiring Evidence System/);
assert.match(shellHtml, /aria-label="Main navigation"/);
assert.match(shellHtml, /AI assists\. Human decides\./);
assert.match(shellHtml, /Search evidence/);
assert.match(shellHtml, /Final decision/);
assert.match(shellHtml, /Evidence workspace/);

const componentHtml = renderToStaticMarkup(
  <>
    <Button>Create job</Button>
    <Card title="Candidate Evidence Report">Evidence match overview</Card>
    <Badge tone="warning">Needs verification</Badge>
    <DataTable
      caption="Evidence matrix"
      columns={[
        { key: "criterion", header: "Job criteria" },
        { key: "evidence", header: "Evidence match" }
      ]}
      rows={[{ criterion: "React experience", evidence: "Resume project evidence" }]}
    />
    <EmptyState title="No candidates yet" description="Share the application link when the job is ready." />
    <WarningCard title="Human review required">AI-assisted analysis requires recruiter review.</WarningCard>
    <NoteTextArea label="Recruiter notes" placeholder="Add job-related evidence notes." />
  </>
);

assert.match(componentHtml, /<button[^>]*>Create job<\/button>/);
assert.match(componentHtml, /Candidate Evidence Report/);
assert.match(componentHtml, /Needs verification/);
assert.match(componentHtml, /<caption>Evidence matrix<\/caption>/);
assert.match(componentHtml, /No candidates yet/);
assert.match(componentHtml, /Human review required/);
assert.match(componentHtml, /Recruiter notes/);

const landingHtml = renderToStaticMarkup(<App path="/" />);
const loginHtml = renderToStaticMarkup(<App path="/login" />);
const dashboardHtml = renderToStaticMarkup(<App path="/dashboard" />);
const reportHtml = renderToStaticMarkup(<App path="/reports/candidate-evidence" />);
const candidateListHtml = renderToStaticMarkup(<App path="/jobs/frontend-developer/candidates" />);
const bulkUploadHtml = renderToStaticMarkup(<App path="/jobs/frontend-developer/candidates/upload" />);
const combinedAppHtml = [landingHtml, loginHtml, dashboardHtml, reportHtml].join("\n");
const allAppHtml = [combinedAppHtml, candidateListHtml, bulkUploadHtml].join("\n");
const routedDashboardHtml = renderToStaticMarkup(
  <MemoryRouter initialEntries={["/dashboard"]}>
    <AppRoutes />
  </MemoryRouter>
);
const routedFallbackHtml = renderToStaticMarkup(
  <MemoryRouter initialEntries={["/not-a-real-route"]}>
    <AppRoutes />
  </MemoryRouter>
);

const expectedTables = [
  "organizations",
  "users",
  "jobs",
  "job_criteria",
  "candidates",
  "applications",
  "candidate_documents",
  "candidate_consents",
  "questionnaire_questions",
  "questionnaire_answers",
  "evidence_items",
  "candidate_reports",
  "review_decisions",
  "audit_logs",
  "bulk_upload_batches",
  "bulk_upload_files"
];

assert.deepEqual(
  expectedTables.filter((tableName) => !hiringSchemaTables.some((table) => table.name === tableName)),
  []
);

const bulkUploadFileSchema = hiringSchemaTables.find((table) => table.name === "bulk_upload_files");
assert.ok(bulkUploadFileSchema);
assert.deepEqual(
  ["candidate_name", "parsing_status", "evidence_report_status"].filter(
    (columnName) => !bulkUploadFileSchema.columns.some((column) => column.name === columnName)
  ),
  []
);

const candidateReportSchema = hiringSchemaTables.find((table) => table.name === "candidate_reports");
assert.ok(candidateReportSchema);
assert.deepEqual(
  ["decision_options"].filter((columnName) => !candidateReportSchema.columns.some((column) => column.name === columnName)),
  []
);

const reportRecord = getCandidateReport("report-amanda-lee");
assert.equal(reportRecord.candidate.name, "Amanda Lee");
assert.equal(reportRecord.application.jobId, "job-frontend-developer");
assert.equal(reportRecord.evidenceRows.length > 0, true);

assert.equal(users.filter((user) => user.role === "recruiter").length, 2);
assert.equal(jobs.length, 3);
assert.equal(candidates.length, 5);
assert.equal(applications.length >= 5, true);

const generatedMetrics = getDashboardMetrics();
assert.equal(generatedMetrics.find((metric) => metric.label === "Active jobs")?.value, "3");
assert.equal(generatedMetrics.find((metric) => metric.label === "Reports completed")?.value, String(candidateReports.length));
assert.equal(generatedMetrics.find((metric) => metric.label === "Decisions needing sign-off")?.value, "1");

const selectorReport = getCandidateReportById("report-amanda-lee");
assert.equal(selectorReport.fairness.protectedCharacteristics.includes("Age"), true);
assert.equal(selectorReport.fairness.protectedCharacteristics.includes("Photo"), true);
assert.equal(getEvidenceItemsForApplication("application-amanda-frontend").length > 0, true);
assert.equal(getApplicationsForJob("job-frontend-developer").length >= 4, true);
assert.equal(getBulkUploadBatchByJobId("job-frontend-developer")?.jobId, "job-frontend-developer");

const candidateList = getJobCandidateList("job-frontend-developer");
assert.equal(candidateList.job.title, "Frontend Developer");
assert.equal(candidateList.filters.includes("Good evidence, verification needed"), true);
assert.equal(candidateList.rows.some((row) => row.reportStatus.label === "Report failed"), true);

const uploadWorkspace = getBulkUploadWorkspace("job-frontend-developer");
assert.equal(uploadWorkspace.job.title, "Frontend Developer");
assert.equal(uploadWorkspace.batch.totalFiles, uploadWorkspace.files.length);
assert.equal(uploadWorkspace.files.some((file) => file.status === "Failed"), true);

const repositoryDashboard = getDashboardData();
assert.equal(repositoryDashboard.metrics.some((metric) => metric.label === "Active jobs"), true);
assert.equal(getJobById("job-frontend-developer")?.title, "Frontend Developer");
assert.equal(getReportById("report-amanda-lee")?.status, "Human review required");

const evidenceReportModel = getCandidateEvidenceReport("report-amanda-lee");
assert.equal(evidenceReportModel.candidate.name, "Amanda Lee");
assert.equal(evidenceReportModel.jobRole.title, "Frontend Developer");
assert.equal(evidenceReportModel.requirementEvidence.length > 0, true);
assert.equal(evidenceReportModel.auditTrailPreview.length > 0, true);
assert.equal(evidenceReportModel.humanDecision.options.includes("Shortlist for interview"), true);

const supportedUpload: UploadFileInput = { name: "candidate-resume.pdf", size: 1024 * 1024 };
const unsupportedUpload: UploadFileInput = { name: "candidate-photo.png", size: 1024 };
const oversizedUpload: UploadFileInput = { name: "candidate-resume.docx", size: 11 * 1024 * 1024 };
assert.equal(isAcceptedUploadFile(supportedUpload), true);
assert.equal(validateUploadFile(unsupportedUpload).state, "upload_failed");
assert.equal(validateUploadFile(unsupportedUpload).message, "Unsupported file type");
assert.equal(validateUploadFile(oversizedUpload).message, "File too large");
assert.deepEqual(getUploadStateLabels(), [
  "Waiting for upload",
  "Validating file",
  "Upload accepted",
  "Parsing queued",
  "Parsing in progress",
  "Evidence report generating",
  "Report ready",
  "Manual review required",
  "Upload failed"
]);

assert.equal(validateHumanReviewDecision("Shortlist for interview", "").valid, false);
assert.equal(validateHumanReviewDecision("Hold for review", "Need to verify AWS deployment ownership.").valid, true);
assert.equal(forbiddenHiringPhrases.includes("best candidate"), true);

assert.match(landingHtml, /Hire with evidence, not guesswork\./);
assert.match(landingHtml, /View sample report/);
assert.match(landingHtml, /Request pilot access/);
assert.match(landingHtml, /Human-led hiring/);

assert.match(loginHtml, /Sign in/);
assert.match(loginHtml, /Access candidate evidence reports/);

assert.match(dashboardHtml, /Evidence Ledger/);
assert.match(routedDashboardHtml, /Evidence Ledger/);
assert.match(routedFallbackHtml, /Hire with evidence, not guesswork\./);
assert.match(dashboardHtml, /Active jobs/);
assert.match(dashboardHtml, /Candidates waiting for review/);
assert.match(dashboardHtml, /Reports completed/);
assert.match(dashboardHtml, /Decisions needing sign-off/);
assert.match(dashboardHtml, /Open report/);
assert.match(dashboardHtml, /Upload candidates/);

assert.doesNotMatch(reportHtml, /Design system preview/i);
assert.match(reportHtml, /Candidate Evidence Report/);
assert.match(reportHtml, /Amanda Lee/);
assert.match(reportHtml, /Frontend Developer/);
assert.match(reportHtml, /Northstar Digital/);
assert.match(reportHtml, /Today, 4:15 PM/);
assert.match(reportHtml, /HER-2026-0521-AL/);
assert.match(reportHtml, /Evidence report ready/);
assert.match(reportHtml, /Verification needed/);
assert.match(reportHtml, /Human review required/);
assert.match(reportHtml, /Good evidence, verification needed/);
assert.match(reportHtml, /2 evidence gaps/);
assert.match(reportHtml, /Requirement/);
assert.match(reportHtml, /Candidate evidence/);
assert.match(reportHtml, /Missing evidence/);
assert.match(reportHtml, /Suggested interview questions/);
assert.match(reportHtml, /View resume/);
assert.match(reportHtml, /Protected characteristics not used/);
assert.match(reportHtml, /Shortlist for interview/);
assert.match(reportHtml, /Export PDF/);
assert.match(reportHtml, /Final decision must be based on job-related evidence and reviewed by a human/);
assert.match(reportHtml, /AI-assisted analysis\. Human review is required before making any hiring decision\./);

assert.match(candidateListHtml, /Grouped by evidence level/);
assert.match(candidateListHtml, /Strong evidence/);
assert.match(candidateListHtml, /Good evidence, verification needed/);
assert.match(candidateListHtml, /Missing key evidence/);
assert.match(candidateListHtml, /Needs human review/);
assert.match(candidateListHtml, /Report failed/);
assert.match(candidateListHtml, /Upload candidates/);

assert.match(bulkUploadHtml, /Bulk Upload Candidates/);
assert.match(bulkUploadHtml, /Frontend Developer/);
assert.match(bulkUploadHtml, /PDF, DOCX/);
assert.match(
  bulkUploadHtml,
  /I confirm that my organisation has permission or a valid basis to upload and process these candidate resumes for this hiring review\./
);
assert.match(bulkUploadHtml, /Processing progress/);
assert.match(bulkUploadHtml, /Uploaded files/);
assert.match(bulkUploadHtml, /Candidate name if detected/);
assert.match(bulkUploadHtml, /Evidence report status/);
assert.match(bulkUploadHtml, /Unsupported file type/);
assert.doesNotMatch(
  allAppHtml,
  /Consolidated Auditor Suggestion|Verified Match|Best candidate|Perfect match|AI selected|AI rejected|AI recommendation|Accept Path|Auto decision|Auto reject|Culture fit score|Personality score|Bias-free/i
);
assert.equal(containsForbiddenHiringLanguage(allAppHtml), false);

console.log("Front-end MVP route smoke test passed.");
