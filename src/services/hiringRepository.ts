import {
  applications,
  bulkUploadBatches,
  bulkUploadFiles,
  candidateConsents,
  candidateReports,
  candidates,
  evidenceItems,
  jobs
} from "../data/mockHiringData";
import type {
  BulkUploadFile,
  BulkUploadWorkspaceViewModel,
  CandidateReportViewModel,
  JobCandidateListViewModel,
  JobCandidateRow,
  StatusBadge
} from "../types/hiring";

const privacyConfirmationText =
  "I confirm that my organisation has permission or a valid basis to upload and process these candidate resumes for this hiring review.";

function requireRecord<T>(record: T | undefined, message: string): T {
  if (!record) {
    throw new Error(message);
  }

  return record;
}

function getToneForEvidence(label: string): StatusBadge["tone"] {
  if (label === "Strong evidence" || label === "Evidence report ready") return "success";
  if (label === "Good evidence, verification needed" || label === "Needs verification") return "warning";
  if (label === "Report failed" || label === "Missing key evidence") return "danger";
  return "info";
}

function getReportStatusLabel(status: string) {
  return status === "Failed" ? "Report failed" : status;
}

export function getCandidateReport(reportId = "report-amanda-lee"): CandidateReportViewModel {
  const report = requireRecord(candidateReports.find((item) => item.id === reportId), `Candidate report not found: ${reportId}`);
  const candidate = requireRecord(candidates.find((item) => item.id === report.candidateId), `Candidate not found: ${report.candidateId}`);
  const job = requireRecord(jobs.find((item) => item.id === report.jobId), `Job not found: ${report.jobId}`);
  const application = requireRecord(
    applications.find((item) => item.id === report.applicationId),
    `Application not found: ${report.applicationId}`
  );
  const consent = candidateConsents.find((item) => item.id === application.consentId);

  return {
    candidate: {
      name: candidate.name,
      role: job.title,
      company: job.title === "Frontend Developer" ? "Northstar Digital" : job.department,
      appliedDate: "21 May 2026",
      reportGenerated: report.generatedAt,
      reportId: report.reportId,
      currentStatus: report.reviewStatus.label,
      assignedRecruiter: "Sarah Tan",
      consentStatus: consent?.status === "recorded" ? "Consent recorded" : "Consent missing",
      questionnaireStatus: "Completed",
      resumeLabel: "Amanda Lee resume.pdf",
      statusBadges: [
        { label: "Evidence report ready", tone: "success" },
        report.reviewStatus,
        { label: "Verification needed", tone: "warning" }
      ]
    },
    job,
    application,
    report,
    summaryCards: report.summaryCards,
    evidenceRows: evidenceItems.filter((item) => item.reportId === report.id),
    missingEvidence: report.missingEvidence,
    interviewQuestions: report.interviewQuestions,
    fairness: report.fairness,
    recruiterNotes: report.recruiterNotes,
    decisionOptions: report.decisionOptions
  };
}

export function getJobCandidateList(jobId = "job-frontend-developer"): JobCandidateListViewModel {
  const job = requireRecord(jobs.find((item) => item.id === jobId), `Job not found: ${jobId}`);
  const batch = requireRecord(bulkUploadBatches.find((item) => item.jobId === jobId), `Bulk upload batch not found: ${jobId}`);

  const rows: JobCandidateRow[] = bulkUploadFiles
    .filter((file) => file.batchId === batch.id && file.applicationId)
    .map((file) => {
      const application = applications.find((item) => item.id === file.applicationId);
      const report = candidateReports.find((item) => item.applicationId === file.applicationId);
      const candidate = candidates.find((item) => item.id === file.candidateId);
      const evidenceLevel =
        report?.evidenceLevel ??
        (file.evidenceReportStatus === "Failed"
          ? "Report failed"
          : file.evidenceReportStatus === "Needs manual review"
            ? "Needs human review"
            : "Missing key evidence");

      return {
        id: file.id,
        candidateName: candidate?.name ?? file.candidateName ?? "Candidate name not detected",
        applicationId: application?.id ?? file.applicationId ?? "",
        evidenceLevel,
        reportStatus: {
          label: getReportStatusLabel(file.evidenceReportStatus),
          tone: getToneForEvidence(file.evidenceReportStatus)
        },
        reviewStatus: {
          label:
            evidenceLevel === "Report failed"
              ? "Report failed"
              : evidenceLevel === "Strong evidence"
                ? "Evidence report ready"
                : "Human review required",
          tone: getToneForEvidence(evidenceLevel)
        },
        uploadedFile: file.fileName,
        updatedAt: "Today",
        reportPath: report ? "/reports/candidate-evidence" : "/jobs/frontend-developer/candidates"
      };
    });

  return {
    job,
    batch,
    filters: [
      "Strong evidence",
      "Good evidence, verification needed",
      "Missing key evidence",
      "Needs human review",
      "Report failed"
    ],
    rows
  };
}

export function getBulkUploadWorkspace(jobId = "job-frontend-developer"): BulkUploadWorkspaceViewModel {
  const job = requireRecord(jobs.find((item) => item.id === jobId), `Job not found: ${jobId}`);
  const batch = requireRecord(bulkUploadBatches.find((item) => item.jobId === jobId), `Bulk upload batch not found: ${jobId}`);

  return {
    job,
    batch,
    files: bulkUploadFiles.filter((file) => file.batchId === batch.id),
    acceptedFileTypes: ["PDF", "DOCX"],
    maxFileSizeMb: 10,
    privacyConfirmationText
  };
}

export function isAcceptedResumeFile(fileName: string): boolean {
  return /\.(pdf|docx)$/i.test(fileName);
}

export function createMockBulkUploadFile(fileName: string, index: number): BulkUploadFile {
  const accepted = isAcceptedResumeFile(fileName);
  const baseId = fileName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `resume-${index + 1}`;

  return {
    id: `local-${baseId}`,
    batchId: "batch-frontend-20260521",
    fileName,
    fileUrl: accepted ? `/local-upload/${encodeURIComponent(fileName)}` : "",
    status: accepted ? "Uploaded" : "Failed",
    parsingStatus: accepted ? "Queued" : "Failed",
    evidenceReportStatus: accepted ? "Report generating" : "Failed",
    errorMessage: accepted ? undefined : "Unsupported file type. Upload PDF or DOCX resumes only.",
    createdAt: new Date().toISOString()
  };
}
