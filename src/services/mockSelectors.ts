import {
  applications,
  bulkUploadBatches,
  bulkUploadFiles,
  candidateConsents,
  candidateDocuments,
  candidateReports,
  candidates,
  evidenceItems,
  jobs,
  organizations,
  reviewDecisions,
  users
} from "../data/mockHiringData";
import type {
  Application,
  BulkUploadFile,
  BulkUploadWorkspaceViewModel,
  CandidateReport,
  CandidateReportViewModel,
  DashboardMetric,
  DashboardViewModel,
  EvidenceItem,
  EvidenceLevel,
  JobCandidateListViewModel,
  JobCandidateRow,
  JobRow,
  ReviewQueueItem,
  StatusBadge
} from "../types/hiring";

const privacyConfirmationText =
  "I confirm that my organisation has permission or a valid basis to upload and process these candidate resumes for this hiring review.";

const reviewableStatuses = new Set<Application["status"]>(["submitted", "report_ready", "needs_review"]);

function requireRecord<T>(record: T | undefined, message: string): T {
  if (!record) {
    throw new Error(message);
  }

  return record;
}

function getToneForEvidence(label: string): StatusBadge["tone"] {
  if (label === "Strong evidence" || label === "Evidence report ready" || label === "Report ready") return "success";
  if (label === "Good evidence, verification needed" || label === "Needs verification" || label === "Needs manual review") {
    return "warning";
  }
  if (label === "Report failed" || label === "Failed" || label === "Missing key evidence") return "danger";
  return "info";
}

function getReportStatusLabel(status: string) {
  return status === "Failed" ? "Report failed" : status;
}

function formatDateLabel(dateIso: string) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return dateIso;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getCandidateName(candidateId: string) {
  return requireRecord(candidates.find((candidate) => candidate.id === candidateId), `Candidate not found: ${candidateId}`).name;
}

function getJobTitle(jobId: string) {
  return requireRecord(jobs.find((job) => job.id === jobId), `Job not found: ${jobId}`).title;
}

function getReportPath(report?: CandidateReport) {
  return report ? "/reports/candidate-evidence" : "/jobs/frontend-developer/candidates";
}

export function getDashboardMetrics(): DashboardMetric[] {
  const activeJobs = jobs.filter((job) => job.status === "open").length;
  const candidatesWaitingForReview = applications.filter((application) => reviewableStatuses.has(application.status)).length;
  const reportsCompleted = candidateReports.length;
  const decisionsNeedingSignOff = reviewDecisions.filter((decision) => decision.status === "draft").length;

  return [
    { label: "Active jobs", value: String(activeJobs), detail: `${activeJobs} open roles in this mock workspace` },
    {
      label: "Candidates waiting for review",
      value: String(candidatesWaitingForReview),
      detail: `${applications.filter((application) => application.status === "needs_review").length} need verification`
    },
    {
      label: "Reports completed",
      value: String(reportsCompleted),
      detail: "Evidence reports ready for recruiter review"
    },
    {
      label: "Decisions needing sign-off",
      value: String(decisionsNeedingSignOff),
      detail: "Decision reasons still required"
    }
  ];
}

export function getCandidateReportById(reportId: string): CandidateReport {
  return requireRecord(candidateReports.find((report) => report.id === reportId), `Candidate report not found: ${reportId}`);
}

export function getApplicationsForJob(jobId: string): Application[] {
  return applications.filter((application) => application.jobId === jobId);
}

export function getEvidenceItemsForApplication(applicationId: string): EvidenceItem[] {
  return evidenceItems.filter((item) => item.applicationId === applicationId);
}

export function getBulkUploadBatchByJobId(jobId: string) {
  return bulkUploadBatches.find((batch) => batch.jobId === jobId);
}

export function getReviewQueue(): ReviewQueueItem[] {
  return applications
    .filter((application) => reviewableStatuses.has(application.status))
    .map((application) => {
      const report = candidateReports.find((candidateReport) => candidateReport.applicationId === application.id);
      const status =
        report?.reviewStatus ??
        (application.status === "submitted"
          ? { label: "Needs verification", tone: "warning" as const }
          : { label: "Human review required", tone: "info" as const });

      return {
        candidate: getCandidateName(application.candidateId),
        role: getJobTitle(application.jobId),
        status,
        due: formatDateLabel(application.appliedAt),
        reportPath: getReportPath(report)
      };
    });
}

export function getRecentJobs(): JobRow[] {
  return jobs.map((job) => {
    const jobApplications = getApplicationsForJob(job.id);
    const jobReports = candidateReports.filter((report) => report.jobId === job.id);
    const hasManualReview = jobApplications.some((application) => application.status === "needs_review" || application.status === "failed");
    const evidenceStatus: StatusBadge =
      jobReports.length > 0
        ? { label: `${jobReports.length} reports ready`, tone: "success" }
        : hasManualReview
          ? { label: "Human review required", tone: "info" }
          : { label: "Needs verification", tone: "warning" };

    return {
      id: job.id,
      title: job.title,
      department: job.department,
      candidates: `${jobApplications.length} candidates`,
      evidenceStatus,
      lastUpdated: formatDateLabel(job.updatedAt),
      candidateListPath: job.id === "job-frontend-developer" ? "/jobs/frontend-developer/candidates" : "/dashboard",
      uploadPath: job.id === "job-frontend-developer" ? "/jobs/frontend-developer/candidates/upload" : "/dashboard"
    };
  });
}

export function getDashboardViewModel(): DashboardViewModel {
  const activeReviewer = requireRecord(users.find((user) => user.role === "recruiter"), "Recruiter not found");
  const reviewQueue = getReviewQueue();

  return {
    metrics: getDashboardMetrics(),
    reviewQueue,
    recentJobs: getRecentJobs(),
    introCount: reviewQueue.length,
    activeReviewerName: activeReviewer.name
  };
}

export function getCandidateReport(reportId = "report-amanda-lee"): CandidateReportViewModel {
  const report = getCandidateReportById(reportId);
  const candidate = requireRecord(candidates.find((item) => item.id === report.candidateId), `Candidate not found: ${report.candidateId}`);
  const job = requireRecord(jobs.find((item) => item.id === report.jobId), `Job not found: ${report.jobId}`);
  const organization = requireRecord(
    organizations.find((item) => item.id === report.organizationId),
    `Organization not found: ${report.organizationId}`
  );
  const application = requireRecord(
    applications.find((item) => item.id === report.applicationId),
    `Application not found: ${report.applicationId}`
  );
  const consent = candidateConsents.find((item) => item.id === application.consentId);
  const document = candidateDocuments.find((item) => item.applicationId === application.id);
  const decisionDraft = reviewDecisions.find((item) => item.reportId === report.id && item.status === "draft");

  return {
    candidate: {
      name: candidate.name,
      role: job.title,
      company: organization.name,
      appliedDate: formatDateLabel(application.appliedAt),
      reportGenerated: report.generatedAt,
      reportId: report.reportId,
      currentStatus: report.reviewStatus.label,
      assignedRecruiter: users.find((user) => user.id === decisionDraft?.recruiterId)?.name ?? "Sarah Tan",
      consentStatus: consent?.status === "recorded" ? "Consent recorded" : "Consent missing",
      questionnaireStatus: "Completed",
      resumeLabel: document?.fileName ?? "Resume not attached",
      statusBadges: [{ label: "Evidence report ready", tone: "success" }, report.reviewStatus]
    },
    job,
    application,
    report,
    summaryCards: report.summaryCards,
    evidenceRows: getEvidenceItemsForApplication(application.id),
    missingEvidence: report.missingEvidence,
    interviewQuestions: report.interviewQuestions,
    fairness: report.fairness,
    recruiterNotes: report.recruiterNotes,
    decisionOptions: report.decisionOptions,
    decisionDraft
  };
}

export function getJobCandidateList(jobId = "job-frontend-developer"): JobCandidateListViewModel {
  const job = requireRecord(jobs.find((item) => item.id === jobId), `Job not found: ${jobId}`);
  const batch = requireRecord(getBulkUploadBatchByJobId(jobId), `Bulk upload batch not found: ${jobId}`);

  const rows: JobCandidateRow[] = bulkUploadFiles
    .filter((file) => file.batchId === batch.id && file.applicationId)
    .map((file) => {
      const application = applications.find((item) => item.id === file.applicationId);
      const report = candidateReports.find((item) => item.applicationId === file.applicationId);
      const candidate = candidates.find((item) => item.id === file.candidateId);
      const evidenceLevel: EvidenceLevel =
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
        updatedAt: formatDateLabel(file.createdAt),
        reportPath: getReportPath(report)
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
  const batch = requireRecord(getBulkUploadBatchByJobId(jobId), `Bulk upload batch not found: ${jobId}`);

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
