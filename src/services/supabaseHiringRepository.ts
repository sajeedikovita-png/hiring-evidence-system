import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanyContext } from "./companyContextService";
import type { AsyncHiringRepository } from "./hiringRepository";
import { requireWorkspaceAccess, resolveWorkspaceAccess } from "./workspaceAccessService";
import type { SupabaseRuntimeEnv } from "./supabaseConfig";
import { validateHumanReviewDecision, type SaveHumanReviewDecisionInput, type SaveHumanReviewDecisionResult } from "./reportService";
import type {
  Application,
  AuditLogEntry,
  BulkUploadBatch,
  BulkUploadFile,
  BulkUploadWorkspaceViewModel,
  Candidate,
  DashboardMetric,
  DashboardViewModel,
  EvidenceLevel,
  EvidenceReportStatus,
  EvidenceItem,
  EvidenceReport,
  FairnessCheck,
  JobCandidateListViewModel,
  JobCandidateRow,
  JobRole,
  ParsingStatus,
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
  const candidateName = asString(row.name).trim();
  return {
    id: asString(row.id),
    organizationId: asString(row.company_id),
    name: candidateName === "Candidate pending name detection" || !candidateName ? "Name not recorded" : candidateName,
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
    sourceReference: asString(row.source_reference) || undefined,
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

function getToneForEvidence(label: string): StatusBadge["tone"] {
  if (label === "Strong evidence" || label === "Evidence report ready" || label === "Report ready") return "success";
  if (label === "Good evidence, verification needed" || label === "Needs verification" || label === "Needs manual review") return "warning";
  if (label === "Report failed" || label === "Failed" || label === "Missing key evidence") return "danger";
  return "info";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mapRouteJobTitle(jobId: string) {
  return jobId === "job-frontend-developer" ? "Frontend Developer" : jobId;
}

function getCandidateListRoutePath(jobId = "") {
  return jobId ? `/jobs/${jobId}/candidates` : "/jobs";
}

function getCandidateUploadRoutePath(jobId = "") {
  return jobId ? `/jobs/${jobId}/candidates/upload` : "/jobs";
}

function mapUploadStatus(status: string): BulkUploadFile["status"] {
  if (status === "failed") return "Failed";
  if (status === "manual_review_required") return "Needs manual review";
  return "Uploaded";
}

function mapParsingStatusLabel(status: string): ParsingStatus {
  if (status === "parsed") return "Parsed";
  if (status === "parsing") return "Parsing";
  if (status === "failed") return "Failed";
  if (status === "manual_review_required") return "Needs manual review";
  return "Queued";
}

function getEvidenceReportStatus(application: DbRecord | undefined, document: DbRecord | undefined, report: DbRecord | undefined): EvidenceReportStatus {
  if (asString(application?.status) === "failed" || asString(document?.upload_status) === "failed") return "Failed";
  if (asString(application?.status) === "needs_review" || asString(document?.parsing_status) === "manual_review_required") {
    return "Needs manual review";
  }
  if (report) return "Report ready";
  return "Needs manual review";
}

function getEvidenceLevel(application: DbRecord, document: DbRecord | undefined, report: DbRecord | undefined): EvidenceLevel {
  const evidenceReportStatus = getEvidenceReportStatus(application, document, report);

  if (evidenceReportStatus === "Failed") return "Report failed";
  if (evidenceReportStatus === "Needs manual review") return "Needs human review";
  if (evidenceReportStatus === "Report ready") return "Good evidence, verification needed";
  return "Missing key evidence";
}

function formatEvidenceReportStatus(status: EvidenceReportStatus) {
  return status === "Failed" ? "Report failed" : status;
}

function getReviewStatus(evidenceLevel: EvidenceLevel): StatusBadge {
  if (evidenceLevel === "Report failed") return { label: "Report failed", tone: "danger" };
  if (evidenceLevel === "Missing key evidence") return { label: "Needs verification", tone: "warning" };
  return { label: "Human review required", tone: "info" };
}

function mapBulkUploadFile(row: DbRecord, application: DbRecord | undefined, report: DbRecord | undefined, batchId: string): BulkUploadFile {
  const evidenceReportStatus = getEvidenceReportStatus(application, row, report);

  return {
    id: asString(row.id),
    batchId,
    fileName: asString(row.file_name),
    fileUrl: asString(row.storage_path),
    status: mapUploadStatus(asString(row.upload_status)),
    errorMessage: typeof row.error_message === "string" ? row.error_message : undefined,
    candidateId: asString(row.candidate_id),
    applicationId: asString(row.application_id),
    parsingStatus: mapParsingStatusLabel(asString(row.parsing_status)),
    evidenceReportStatus,
    reportPath: report ? `/reports/${asString(report.public_report_code, asString(report.id))}` : undefined,
    createdAt: asString(row.created_at)
  };
}

function deriveBatchStatus(files: BulkUploadFile[]): BulkUploadBatch["status"] {
  if (files.some((file) => file.status === "Failed" || file.evidenceReportStatus === "Failed")) return "Failed";
  if (files.some((file) => file.status === "Needs manual review" || file.evidenceReportStatus === "Needs manual review")) {
    return "Needs manual review";
  }
  if (files.every((file) => file.evidenceReportStatus === "Report ready")) return "Report ready";
  return "Uploaded";
}

function reportLookupColumn(reportId: string) {
  return isUuid(reportId) ? "id" : "public_report_code";
}

export function pickActiveReviewerName(profileRows: DbRecord[], activeUserId: string | undefined, fallback: string) {
  const activeProfile = activeUserId ? profileRows.find((profile) => asString(profile.user_id) === activeUserId) : undefined;
  return asString(activeProfile?.display_name, asString(profileRows[0]?.display_name, fallback));
}

export function createSupabaseHiringRepository(client: SupabaseClient, env?: SupabaseRuntimeEnv): AsyncHiringRepository {
  async function requireCompanyWorkspace(companyId: string): Promise<CompanyContext> {
    return requireWorkspaceAccess(client, companyId, env);
  }

  async function getJobRowForRoute(companyId: string, jobId: string): Promise<DbRecord | undefined> {
    const query = client.from("job_roles").select("*").eq("company_id", companyId).limit(1);
    const { data, error } = await (isUuid(jobId) ? query.eq("id", jobId) : query.eq("title", mapRouteJobTitle(jobId))).maybeSingle();
    assertNoSupabaseError(error, "Unable to read job role");
    return data ? (data as DbRecord) : undefined;
  }

  async function readJobWorkspaceRows(companyId: string, jobId: string) {
    const job = await getJobRowForRoute(companyId, jobId);
    if (!job) return undefined;

    const mappedJob = mapJobRole(job);
    const { data: applicationData, error: applicationError } = await client
      .from("candidate_applications")
      .select("*")
      .eq("company_id", companyId)
      .eq("job_id", mappedJob.id);
    assertNoSupabaseError(applicationError, "Unable to read candidate applications");

    const applicationRows = asArray<DbRecord>(applicationData);
    const candidateIds = Array.from(new Set(applicationRows.map((application) => asString(application.candidate_id)).filter(Boolean)));
    const applicationIds = Array.from(new Set(applicationRows.map((application) => asString(application.id)).filter(Boolean)));

    const [candidateResult, documentResult, reportResult] = await Promise.all([
      candidateIds.length > 0
        ? client.from("candidates").select("*").eq("company_id", companyId).in("id", candidateIds)
        : Promise.resolve({ data: [], error: null }),
      applicationIds.length > 0
        ? client.from("uploaded_documents").select("*").eq("company_id", companyId).in("application_id", applicationIds)
        : Promise.resolve({ data: [], error: null }),
      client.from("evidence_reports").select("*").eq("company_id", companyId).eq("job_id", mappedJob.id)
    ]);

    for (const result of [candidateResult, documentResult, reportResult]) {
      assertNoSupabaseError(result.error, "Unable to assemble job candidate workspace");
    }

    return {
      job: mappedJob,
      applicationRows,
      candidateRows: asArray<DbRecord>(candidateResult.data),
      documentRows: asArray<DbRecord>(documentResult.data),
      reportRows: asArray<DbRecord>(reportResult.data)
    };
  }

  return {
    source: "supabase",

    async getActiveCompanyContext(): Promise<CompanyContext> {
      return resolveWorkspaceAccess(client, env);
    },

    async getDashboardData(companyId: string, activeUserId?: string): Promise<DashboardViewModel> {
      const access = await requireCompanyWorkspace(companyId);
      if (activeUserId && access.userId !== activeUserId) throw new Error("Workspace access is unavailable.");
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
        activeReviewerName: pickActiveReviewerName(profileRows, activeUserId, "Recruiter"),
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
            candidateListPath: getCandidateListRoutePath(mappedJob.id),
            uploadPath: getCandidateUploadRoutePath(mappedJob.id)
          };
        })
      };
    },

    async getJobById(companyId: string, jobId: string): Promise<JobRole | undefined> {
      await requireCompanyWorkspace(companyId);
      const { data, error } = await client.from("job_roles").select("*").eq("company_id", companyId).eq("id", jobId).maybeSingle();
      assertNoSupabaseError(error, "Unable to read job role");
      return data ? mapJobRole(data as DbRecord) : undefined;
    },

    async getCandidateById(companyId: string, candidateId: string): Promise<Candidate | undefined> {
      await requireCompanyWorkspace(companyId);
      const { data, error } = await client.from("candidates").select("*").eq("company_id", companyId).eq("id", candidateId).maybeSingle();
      assertNoSupabaseError(error, "Unable to read candidate");
      return data ? mapCandidate(data as DbRecord) : undefined;
    },

    async getApplicationsForCandidate(companyId: string, candidateId: string): Promise<Application[]> {
      await requireCompanyWorkspace(companyId);
      const { data, error } = await client
        .from("candidate_applications")
        .select("*")
        .eq("company_id", companyId)
        .eq("candidate_id", candidateId);
      assertNoSupabaseError(error, "Unable to read candidate applications");
      return asArray<DbRecord>(data).map(mapApplication);
    },

    async getJobCandidateList(companyId: string, jobId: string): Promise<JobCandidateListViewModel | undefined> {
      await requireCompanyWorkspace(companyId);
      const workspace = await readJobWorkspaceRows(companyId, jobId);
      if (!workspace) return undefined;

      const candidateById = new Map(workspace.candidateRows.map((candidate) => [asString(candidate.id), mapCandidate(candidate)]));
      const applicationById = new Map(workspace.applicationRows.map((application) => [asString(application.id), application]));
      const documentByApplicationId = new Map(workspace.documentRows.map((document) => [asString(document.application_id), document]));
      const reportByApplicationId = new Map(workspace.reportRows.map((report) => [asString(report.application_id), report]));
      const batchId = `job-${workspace.job.id}-read-state`;
      const batchFiles = workspace.documentRows.map((document) =>
        mapBulkUploadFile(document, applicationById.get(asString(document.application_id)), reportByApplicationId.get(asString(document.application_id)), batchId)
      );

      const rows: JobCandidateRow[] = workspace.applicationRows.map((application) => {
        const mappedApplication = mapApplication(application);
        const candidate = candidateById.get(mappedApplication.candidateId);
        const document = documentByApplicationId.get(mappedApplication.id);
        const report = reportByApplicationId.get(mappedApplication.id);
        const evidenceLevel = getEvidenceLevel(application, document, report);
        const evidenceReportStatus = getEvidenceReportStatus(application, document, report);

        return {
          id: mappedApplication.id,
          documentId: document ? asString(document.id) : undefined,
          hasReport: Boolean(report),
          candidateName: candidate?.name || "Name not recorded",
          applicationId: mappedApplication.id,
          evidenceLevel,
          reportStatus: {
            label: formatEvidenceReportStatus(evidenceReportStatus),
            tone: getToneForEvidence(evidenceReportStatus)
          },
          reviewStatus: getReviewStatus(evidenceLevel),
          uploadedFile: document ? asString(document.file_name, "Uploaded file") : "No document attached",
          updatedAt: formatDateLabel(asString(application.updated_at, mappedApplication.appliedAt)),
          reportPath: report ? `/reports/${asString(report.public_report_code, asString(report.id))}` : getCandidateListRoutePath(workspace.job.id)
        };
      });

      return {
        job: workspace.job,
        batch: {
          id: batchId,
          jobId: workspace.job.id,
          organizationId: companyId,
          uploadedBy: "",
          status: batchFiles.length > 0 ? deriveBatchStatus(batchFiles) : "Uploaded",
          totalFiles: workspace.documentRows.length,
          processedFiles: workspace.documentRows.filter((document) =>
            ["parsed", "failed", "manual_review_required"].includes(asString(document.parsing_status))
          ).length,
          failedFiles: workspace.documentRows.filter((document) => asString(document.upload_status) === "failed").length,
          createdAt: asString(workspace.documentRows[0]?.created_at, workspace.job.createdAt)
        },
        filters: [
          "Strong evidence",
          "Good evidence, verification needed",
          "Missing key evidence",
          "Needs human review",
          "Report failed"
        ],
        rows
      };
    },

    async getBulkUploadWorkspace(companyId: string, jobId: string): Promise<BulkUploadWorkspaceViewModel | undefined> {
      await requireCompanyWorkspace(companyId);
      const workspace = await readJobWorkspaceRows(companyId, jobId);
      if (!workspace) return undefined;

      const applicationById = new Map(workspace.applicationRows.map((application) => [asString(application.id), application]));
      const candidateById = new Map(workspace.candidateRows.map((candidate) => [asString(candidate.id), mapCandidate(candidate)]));
      const reportByApplicationId = new Map(workspace.reportRows.map((report) => [asString(report.application_id), report]));
      const batchId = `job-${workspace.job.id}-read-state`;
      const files = workspace.documentRows.map((document) => {
        const file = mapBulkUploadFile(
          document,
          applicationById.get(asString(document.application_id)),
          reportByApplicationId.get(asString(document.application_id)),
          batchId
        );
        const candidate = candidateById.get(asString(document.candidate_id));
        return {
          ...file,
          candidateName: candidate?.name || "Name not recorded"
        };
      });

      return {
        job: workspace.job,
        batch: {
          id: batchId,
          jobId: workspace.job.id,
          organizationId: companyId,
          uploadedBy: "",
          status: files.length > 0 ? deriveBatchStatus(files) : "Uploaded",
          totalFiles: files.length,
          processedFiles: files.filter((file) =>
            ["Parsed", "Failed", "Needs manual review"].includes(file.parsingStatus)
          ).length,
          failedFiles: files.filter((file) => file.status === "Failed" || file.evidenceReportStatus === "Failed").length,
          createdAt: files[0]?.createdAt ?? workspace.job.createdAt
        },
        files,
        acceptedFileTypes: ["PDF", "DOCX"],
        maxFileSizeMb: 10,
        privacyConfirmationText:
          "I confirm that my organisation has permission or a valid basis to upload and process these candidate resumes for this hiring review."
      };
    },

    async getReportById(companyId: string, reportId: string): Promise<EvidenceReport | undefined> {
      await requireCompanyWorkspace(companyId);
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
      const access = await requireCompanyWorkspace(input.companyId);
      if (access.userId !== input.userId) throw new Error("Workspace access is unavailable.");
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

      const { error: decisionError } = await client.rpc("save_manual_review_decision", {
        p_report_id: asString(report.id), p_decision: input.decision, p_reason: input.reason.trim()
      });
      assertNoSupabaseError(decisionError, "Unable to save human review decision");
      return { valid: true };
    }
  };
}
