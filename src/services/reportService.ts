import {
  applications,
  auditLogs,
  candidateDocuments,
  candidateReports,
  candidates,
  evidenceItems,
  jobs,
  organizations,
  reviewDecisions
} from "../data/mockHiringData";
import type { EvidenceReport, ReviewDecision } from "../types/hiring";
import { createAuditLogEntry } from "./auditLogService";
import { requireCompanyId } from "./companyContextService";

function requireRecord<T>(record: T | undefined, message: string): T {
  if (!record) {
    throw new Error(message);
  }

  return record;
}

export type SaveHumanReviewDecisionInput = {
  companyId: string;
  reportId: string;
  applicationId: string;
  userId: string;
  decision: ReviewDecision["decision"] | "";
  reason: string;
  timestamp: string;
};

export type SaveHumanReviewDecisionResult = {
  valid: boolean;
  message?: string;
  decision?: ReviewDecision;
  auditLogEntry?: ReturnType<typeof createAuditLogEntry>;
};

export function getCandidateEvidenceReport(companyId: string, reportId = "report-amanda-lee"): EvidenceReport {
  const scopedCompanyId = requireCompanyId(companyId);
  const sourceReport = requireRecord(
    candidateReports.find(
      (report) => report.organizationId === scopedCompanyId && (report.id === reportId || report.reportId === reportId)
    ),
    `Candidate report not found: ${reportId}`
  );
  const company = requireRecord(
    organizations.find((organization) => organization.id === scopedCompanyId),
    `Company not found: ${sourceReport.organizationId}`
  );
  const candidate = requireRecord(
    candidates.find(
      (candidateRecord) => candidateRecord.organizationId === scopedCompanyId && candidateRecord.id === sourceReport.candidateId
    ),
    `Candidate not found: ${sourceReport.candidateId}`
  );
  const application = requireRecord(
    applications.find(
      (applicationRecord) =>
        applicationRecord.organizationId === scopedCompanyId && applicationRecord.id === sourceReport.applicationId
    ),
    `Application not found: ${sourceReport.applicationId}`
  );
  const jobRole = requireRecord(
    jobs.find((job) => job.organizationId === scopedCompanyId && job.id === sourceReport.jobId),
    `Job role not found: ${sourceReport.jobId}`
  );
  const requirementEvidence = evidenceItems.filter((item) => item.applicationId === application.id);
  const documentSources = candidateDocuments.filter((document) => document.applicationId === application.id);
  const draftDecision = reviewDecisions.find((decision) => decision.reportId === sourceReport.id && decision.status === "draft");

  return {
    id: sourceReport.id,
    reportId: sourceReport.reportId,
    company,
    candidate,
    application,
    jobRole,
    status: sourceReport.reviewStatus.label === "Human review required" ? "Human review required" : "Evidence report ready",
    generatedAt: sourceReport.generatedAt,
    evidenceSummary: sourceReport.summaryCards,
    requirementEvidence,
    missingEvidence: sourceReport.missingEvidence,
    verificationNeeded: requirementEvidence
      .filter((item) => item.verificationNeeded && item.verificationNeeded !== "None")
      .map((item) => `${item.requirement}: ${item.verificationNeeded}`),
    suggestedInterviewQuestions: sourceReport.interviewQuestions,
    recruiterNotes: sourceReport.recruiterNotes,
    documentSources,
    fairnessCheck: sourceReport.fairness,
    humanDecision: {
      options: sourceReport.decisionOptions,
      draft: draftDecision,
      reasonRequired: true,
      reminder: "The system does not make the final hiring decision. A recruiter must enter a job-related decision reason."
    },
    auditTrailPreview: auditLogs.filter(
      (log) => log.organizationId === scopedCompanyId && (log.entityId === sourceReport.id || log.entityId === application.id)
    )
  };
}

export function validateHumanReviewDecision(
  decision: ReviewDecision["decision"] | "",
  reason: string
): { valid: boolean; message?: string } {
  if (!decision) {
    return { valid: false, message: "Select a human review decision." };
  }

  if (!reason.trim()) {
    return { valid: false, message: "Decision reason required" };
  }

  return { valid: true };
}

export function saveHumanReviewDecision(input: SaveHumanReviewDecisionInput): SaveHumanReviewDecisionResult {
  const companyId = requireCompanyId(input.companyId);
  const validation = validateHumanReviewDecision(input.decision, input.reason);

  if (!validation.valid || !input.decision) {
    return validation;
  }

  const report = candidateReports.find(
    (candidateReport) =>
      candidateReport.organizationId === companyId &&
      (candidateReport.id === input.reportId || candidateReport.reportId === input.reportId) &&
      candidateReport.applicationId === input.applicationId
  );

  if (!report) {
    return { valid: false, message: "Evidence report not found for this company workspace" };
  }

  const decision: ReviewDecision = {
    id: `decision-${input.reportId}-${input.timestamp}`,
    reportId: report.id,
    applicationId: input.applicationId,
    recruiterId: input.userId,
    decision: input.decision,
    reason: input.reason.trim(),
    status: "saved",
    createdAt: input.timestamp
  };

  return {
    valid: true,
    decision,
    auditLogEntry: createAuditLogEntry({
      companyId,
      userId: input.userId,
      entityType: "human_review_decision",
      entityId: decision.id,
      action: "human_review_decision_saved",
      timestamp: input.timestamp
    })
  };
}
