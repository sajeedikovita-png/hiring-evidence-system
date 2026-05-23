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

function requireRecord<T>(record: T | undefined, message: string): T {
  if (!record) {
    throw new Error(message);
  }

  return record;
}

export function getCandidateEvidenceReport(reportId = "report-amanda-lee"): EvidenceReport {
  const sourceReport = requireRecord(
    candidateReports.find((report) => report.id === reportId),
    `Candidate report not found: ${reportId}`
  );
  const company = requireRecord(
    organizations.find((organization) => organization.id === sourceReport.organizationId),
    `Company not found: ${sourceReport.organizationId}`
  );
  const candidate = requireRecord(
    candidates.find((candidateRecord) => candidateRecord.id === sourceReport.candidateId),
    `Candidate not found: ${sourceReport.candidateId}`
  );
  const application = requireRecord(
    applications.find((applicationRecord) => applicationRecord.id === sourceReport.applicationId),
    `Application not found: ${sourceReport.applicationId}`
  );
  const jobRole = requireRecord(
    jobs.find((job) => job.id === sourceReport.jobId),
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
    auditTrailPreview: auditLogs.filter((log) => log.entityId === sourceReport.id || log.entityId === application.id)
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
