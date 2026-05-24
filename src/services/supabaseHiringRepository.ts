import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanyContext } from "./companyContextService";
import type { AsyncHiringRepository } from "./hiringRepository";
import { validateHumanReviewDecision, type SaveHumanReviewDecisionInput, type SaveHumanReviewDecisionResult } from "./reportService";
import type {
  Application,
  AuditLogEntry,
  Candidate,
  DashboardMetric,
  DashboardViewModel,
  EvidenceItem,
  EvidenceReport,
  FairnessCheck,
  JobRole,
  ReviewDecision,
  StatusBadge,
  SummaryMetric,
  UploadedDocument
} from "../types/hiring";

type DbRecord = Record<string, unknown>;

function requireData<T>(data: T | null | undefined, message: string): T {
  if (!data) {
    throw new Error(message);
  }

  return data;
}

function assertNoSupabaseError(error: { message?: string } | null | undefined, message: string) {
  if (error) {
    throw new Error(`${message}: ${error.message ?? "Unknown Supabase error"}`);
  }
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function mapJobRole(row: DbRecord): JobRole {
  return {
    id: asString(row.id),
    organizationId: asString(row.company_id),
    title: asString(row.title),
    department: asString(row.department),
    location: asString(row.location),
    employmentType: asString(row.employment_type),
    status: asString(row.status, "draft") as JobRole["status"],
    createdBy: asString(row.created_by_profile_id),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at)
  };
}

function mapCandidate(row: DbRecord): Candidate {
  return {
    id: asString(row.id),
    organizationId: asString(row.company_id),
    name: asString(row.name),
    email: typeof row.email === "string" ? row.email : undefined,
    source: asString(row.source, "manual") as Candidate["source"],
    createdAt: asString(row.created_at)
  };
}

function mapApplication(row: DbRecord): Application {
  return {
    id: asString(row.id),
    organizationId: asString(row.company_id),
    jobId: asString(row.job_id),
    candidateId: asString(row.candidate_id),
    status: asString(row.status, "submitted") as Application["status"],
    appliedAt: asString(row.applied_at),
    consentId: asString(row.consent_status) === "recorded" ? "recorded" : undefined
  };
}

function mapUploadedDocument(row: DbRecord): UploadedDocument {
  const parsingStatus = asString(row.parsing_status, "queued");
  const uploadStatus = asString(row.upload_status, "accepted");

  return {
    id: asString(row.id),
    applicationId: asString(row.application_id),
    candidateId: asString(row.candidate_id),
    fileName: asString(row.file_name),
    fileUrl: asString(row.storage_path),
    fileType: asString(row.file_type, "pdf") as UploadedDocument["fileType"],
    uploadStatus: uploadStatus === "failed" ? "Failed" : uploadStatus === "manual_review_required" ? "Needs manual review" : "Uploaded",
    parsingStatus:
      parsingStatus === "parsed"
        ? "Parsed"
        : parsingStatus === "parsing"
          ? "Parsing"
          : parsingStatus === "failed"
            ? "Failed"
            : parsingStatus === "manual_review_required"
              ? "Needs manual review"
              : "Queued",
    createdAt: asString(row.created_at)
  };
}

function mapEvidenceItem(row: DbRecord): EvidenceItem {
  return {
    id: asString(row.id),
    reportId: asString(row.report_id),
    applicationId: asString(row.application_id),
    criteriaId: asString(row.requirement_id),
    requirement: asString(row.requirement),
    evidence: asString(row.candidate_evidence),
    source: asString(row.source, "System") as EvidenceItem["source"],
    confidence: asString(row.confidence, "None") as EvidenceItem["confidence"],
    verificationNeeded: asString(row.verification_needed),
    status: {
      label: asString(row.status_label, "Needs verification"),
      tone: asString(row.status_tone, "warning") as StatusBadge["tone"]
    }
  };
}

function mapAuditLog(row: DbRecord): AuditLogEntry {
  return {
    id: asString(row.id),
    organizationId: asString(row.company_id),
    userId: asString(row.actor_profile_id),
    entityType: asString(row.entity_type),
    entityId: asString(row.entity_id),
    action: asString(row.action),
    createdAt: asString(row.created_at)
  };
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function reportLookupColumn(reportId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reportId)
    ? "id"
    : "public_report_code";
}

export function createSupabaseHiringRepository(client: SupabaseClient): AsyncHiringRepository {
  return {
    source: "supabase",

    async getActiveCompanyContext(): Promise<CompanyContext> {
      const {
        data: { user },
        error: userError
      } = await client.auth.getUser();
      assertNoSupabaseError(userError, "Unable to read authenticated user");

      const authUser = requireData(user, "Authenticated user is required");
      const { data, error } = await client
        .from("recruiter_profiles")
        .select("id, company_id, user_id, display_name, companies(name)")
        .eq("user_id", authUser.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      assertNoSupabaseError(error, "Unable to read company context");

      const profile = requireData(data as DbRecord | null, "Active company context not found");
      const company = profile.companies as DbRecord | null | undefined;

      return {
        companyId: asString(profile.company_id),
        companyName: asString(company?.name, "Company workspace"),
        userId: asString(profile.user_id),
        userName: asString(profile.display_name, authUser.email ?? "Recruiter")
      };
    },

    async getDashboardData(companyId: string): Promise<DashboardViewModel> {
      const [jobsResult, applicationsResult, reportsResult, decisionsResult, candidatesResult, profilesResult] = await Promise.all([
        client.from("job_roles").select("*").eq("company_id", companyId),
        client.from("candidate_applications").select("*").eq("company_id", companyId),
        client.from("evidence_reports").select("*").eq("company_id", companyId),
        client.from("human_review_decisions").select("*").eq("company_id", companyId).eq("status", "draft"),
        client.from("candidates").select("*").eq("company_id", companyId),
        client.from("recruiter_profiles").select("*").eq("company_id", companyId).eq("status", "active")
      ]);

      for (const result of [jobsResult, applicationsResult, reportsResult, decisionsResult, candidatesResult, profilesResult]) {
        assertNoSupabaseError(result.error, "Unable to read dashboard data");
      }

      const jobRows = asArray<DbRecord>(jobsResult.data);
      const applicationRows = asArray<DbRecord>(applicationsResult.data);
      const reportRows = asArray<DbRecord>(reportsResult.data);
      const decisionRows = asArray<DbRecord>(decisionsResult.data);
      const candidateRows = asArray<DbRecord>(candidatesResult.data);
      const profileRows = asArray<DbRecord>(profilesResult.data);
      const candidateById = new Map(candidateRows.map((candidate) => [asString(candidate.id), mapCandidate(candidate)]));
      const jobById = new Map(jobRows.map((job) => [asString(job.id), mapJobRole(job)]));
      const reportByApplicationId = new Map(reportRows.map((report) => [asString(report.application_id), report]));

      const activeJobs = jobRows.filter((job) => asString(job.status) === "open").length;
      const reviewableApplications = applicationRows.filter((application) =>
        ["submitted", "report_ready", "needs_review"].includes(asString(application.status))
      );
      const metrics: DashboardMetric[] = [
        { label: "Active jobs", value: String(activeJobs), detail: `${activeJobs} open roles in this company workspace` },
        {
          label: "Candidates waiting for review",
          value: String(reviewableApplications.length),
          detail: `${applicationRows.filter((application) => asString(application.status) === "needs_review").length} need verification`
        },
        {
          label: "Reports completed",
          value: String(reportRows.length),
          detail: "Evidence reports ready for recruiter review"
        },
        {
          label: "Decisions needing sign-off",
          value: String(decisionRows.length),
          detail: "Decision reasons still required"
        }
      ];

      return {
        metrics,
        introCount: reviewableApplications.length,
        activeReviewerName: asString(profileRows[0]?.display_name, "Recruiter"),
        reviewQueue: reviewableApplications.map((application) => {
          const mappedApplication = mapApplication(application);
          const report = reportByApplicationId.get(mappedApplication.id);
          return {
            candidate: candidateById.get(mappedApplication.candidateId)?.name ?? "Candidate",
            role: jobById.get(mappedApplication.jobId)?.title ?? "Job role",
            due: formatDateLabel(mappedApplication.appliedAt),
            reportPath: report ? `/reports/${asString(report.public_report_code, asString(report.id))}` : "/dashboard",
            status:
              asString(application.status) === "needs_review"
                ? { label: "Human review required", tone: "info" }
                : { label: "Needs verification", tone: "warning" }
          };
        }),
        recentJobs: jobRows.map((job) => {
          const mappedJob = mapJobRole(job);
          const jobApplications = applicationRows.filter((application) => asString(application.job_id) === mappedJob.id);
          const jobReports = reportRows.filter((report) => asString(report.job_id) === mappedJob.id);

          return {
            id: mappedJob.id,
            title: mappedJob.title,
            department: mappedJob.department,
            candidates: `${jobApplications.length} candidates`,
            evidenceStatus:
              jobReports.length > 0
                ? { label: `${jobReports.length} reports ready`, tone: "success" }
                : { label: "Needs verification", tone: "warning" },
            lastUpdated: formatDateLabel(mappedJob.updatedAt),
            candidateListPath: "/dashboard",
            uploadPath: "/dashboard"
          };
        })
      };
    },

    async getJobById(companyId: string, jobId: string): Promise<JobRole | undefined> {
      const { data, error } = await client.from("job_roles").select("*").eq("company_id", companyId).eq("id", jobId).maybeSingle();
      assertNoSupabaseError(error, "Unable to read job role");
      return data ? mapJobRole(data as DbRecord) : undefined;
    },

    async getCandidateById(companyId: string, candidateId: string): Promise<Candidate | undefined> {
      const { data, error } = await client.from("candidates").select("*").eq("company_id", companyId).eq("id", candidateId).maybeSingle();
      assertNoSupabaseError(error, "Unable to read candidate");
      return data ? mapCandidate(data as DbRecord) : undefined;
    },

    async getApplicationsForCandidate(companyId: string, candidateId: string): Promise<Application[]> {
      const { data, error } = await client
        .from("candidate_applications")
        .select("*")
        .eq("company_id", companyId)
        .eq("candidate_id", candidateId);
      assertNoSupabaseError(error, "Unable to read candidate applications");
      return asArray<DbRecord>(data).map(mapApplication);
    },

    async getReportById(companyId: string, reportId: string): Promise<EvidenceReport | undefined> {
      const lookupColumn = reportLookupColumn(reportId);
      const { data: reportData, error: reportError } = await client
        .from("evidence_reports")
        .select("*")
        .eq("company_id", companyId)
        .eq(lookupColumn, reportId)
        .maybeSingle();
      assertNoSupabaseError(reportError, "Unable to read evidence report");

      if (!reportData) return undefined;

      const report = reportData as DbRecord;
      const [companyResult, candidateResult, applicationResult, jobResult, evidenceResult, documentResult, decisionResult, auditResult] =
        await Promise.all([
          client.from("companies").select("*").eq("id", companyId).maybeSingle(),
          client.from("candidates").select("*").eq("company_id", companyId).eq("id", asString(report.candidate_id)).maybeSingle(),
          client
            .from("candidate_applications")
            .select("*")
            .eq("company_id", companyId)
            .eq("id", asString(report.application_id))
            .maybeSingle(),
          client.from("job_roles").select("*").eq("company_id", companyId).eq("id", asString(report.job_id)).maybeSingle(),
          client.from("evidence_items").select("*").eq("company_id", companyId).eq("report_id", asString(report.id)),
          client.from("uploaded_documents").select("*").eq("company_id", companyId).eq("application_id", asString(report.application_id)),
          client
            .from("human_review_decisions")
            .select("*")
            .eq("company_id", companyId)
            .eq("report_id", asString(report.id))
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          client
            .from("audit_log_entries")
            .select("*")
            .eq("company_id", companyId)
            .in("entity_id", [asString(report.id), asString(report.application_id)])
            .order("created_at", { ascending: false })
            .limit(5)
        ]);

      for (const result of [
        companyResult,
        candidateResult,
        applicationResult,
        jobResult,
        evidenceResult,
        documentResult,
        decisionResult,
        auditResult
      ]) {
        assertNoSupabaseError(result.error, "Unable to assemble evidence report");
      }

      const decision = decisionResult.data as DbRecord | null;

      return {
        id: asString(report.id),
        reportId: asString(report.public_report_code, asString(report.id)),
        company: {
          id: companyId,
          name: asString((companyResult.data as DbRecord | null)?.name, "Company workspace"),
          status: asString((companyResult.data as DbRecord | null)?.status, "active") as "active",
          createdAt: asString((companyResult.data as DbRecord | null)?.created_at)
        },
        candidate: mapCandidate(requireData(candidateResult.data as DbRecord | null, "Candidate not found")),
        application: mapApplication(requireData(applicationResult.data as DbRecord | null, "Application not found")),
        jobRole: mapJobRole(requireData(jobResult.data as DbRecord | null, "Job role not found")),
        status: asString(report.status, "Human review required") as EvidenceReport["status"],
        generatedAt: asString(report.generated_at),
        evidenceSummary: asArray<SummaryMetric>(report.evidence_summary),
        requirementEvidence: asArray<DbRecord>(evidenceResult.data).map(mapEvidenceItem),
        missingEvidence: asArray<string>(report.missing_evidence),
        verificationNeeded: asArray<string>(report.verification_needed),
        suggestedInterviewQuestions: asArray<string>(report.suggested_interview_questions),
        recruiterNotes: asArray<string>(report.recruiter_notes),
        documentSources: asArray<DbRecord>(documentResult.data).map(mapUploadedDocument),
        fairnessCheck: (report.fairness_check as FairnessCheck | undefined) ?? {
          status: "Human review required",
          protectedCharacteristicsStatus: "Protected characteristics not used",
          decisionWordingWarning: "None",
          reminder: "Human review reminder",
          protectedCharacteristics: []
        },
        humanDecision: {
          options: ["Shortlist for interview", "Hold for review", "Not proceeding", "Request more information"],
          draft: decision
            ? {
                id: asString(decision.id),
                reportId: asString(decision.report_id),
                applicationId: asString(decision.application_id),
                recruiterId: asString(decision.recruiter_profile_id),
                decision: asString(decision.decision) as ReviewDecision["decision"],
                reason: asString(decision.reason),
                status: asString(decision.status, "saved") as ReviewDecision["status"],
                createdAt: asString(decision.created_at)
              }
            : undefined,
          reasonRequired: true,
          reminder: "The system does not make the final hiring decision. A recruiter must enter a job-related decision reason."
        },
        auditTrailPreview: asArray<DbRecord>(auditResult.data).map(mapAuditLog)
      };
    },

    async saveHumanReviewDecision(input: SaveHumanReviewDecisionInput): Promise<SaveHumanReviewDecisionResult> {
      const validation = validateHumanReviewDecision(input.decision, input.reason);
      if (!validation.valid || !input.decision) {
        return validation;
      }

      const lookupColumn = reportLookupColumn(input.reportId);
      const { data: reportData, error: reportError } = await client
        .from("evidence_reports")
        .select("id, application_id")
        .eq("company_id", input.companyId)
        .eq(lookupColumn, input.reportId)
        .eq("application_id", input.applicationId)
        .maybeSingle();
      assertNoSupabaseError(reportError, "Unable to read evidence report before saving decision");
      const report = requireData(reportData as DbRecord | null, "Evidence report not found for this company workspace");

      const { data: profileData, error: profileError } = await client
        .from("recruiter_profiles")
        .select("id")
        .eq("company_id", input.companyId)
        .eq("user_id", input.userId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      assertNoSupabaseError(profileError, "Unable to read recruiter profile");
      const profile = requireData(profileData as DbRecord | null, "Recruiter profile not found for this company workspace");

      const { data: decisionData, error: decisionError } = await client
        .from("human_review_decisions")
        .insert({
          company_id: input.companyId,
          report_id: asString(report.id),
          application_id: input.applicationId,
          recruiter_profile_id: asString(profile.id),
          decision: input.decision,
          reason: input.reason.trim(),
          status: "saved",
          created_at: input.timestamp
        })
        .select("*")
        .single();
      assertNoSupabaseError(decisionError, "Unable to save human review decision");
      const decision = requireData(decisionData as DbRecord | null, "Saved decision not returned");

      const { data: auditData, error: auditError } = await client
        .from("audit_log_entries")
        .insert({
          company_id: input.companyId,
          actor_profile_id: asString(profile.id),
          entity_type: "human_review_decision",
          entity_id: asString(decision.id),
          action: "human_review_decision_saved",
          metadata: { report_id: asString(report.id), application_id: input.applicationId },
          created_at: input.timestamp
        })
        .select("*")
        .single();
      assertNoSupabaseError(auditError, "Unable to write audit log entry");

      return {
        valid: true,
        decision: {
          id: asString(decision.id),
          reportId: asString(decision.report_id),
          applicationId: asString(decision.application_id),
          recruiterId: asString(decision.recruiter_profile_id),
          decision: asString(decision.decision) as ReviewDecision["decision"],
          reason: asString(decision.reason),
          status: asString(decision.status, "saved") as ReviewDecision["status"],
          createdAt: asString(decision.created_at)
        },
        auditLogEntry: auditData ? mapAuditLog(auditData as DbRecord) : undefined
      };
    }
  };
}
