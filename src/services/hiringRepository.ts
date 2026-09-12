import { applications, candidates, jobs } from "../data/mockHiringData";
import type {
  BulkUploadWorkspaceViewModel,
  Candidate,
  CandidateApplication,
  CandidateReportViewModel,
  DashboardViewModel,
  EvidenceReport,
  JobCandidateListViewModel,
  JobRole
} from "../types/hiring";
import { requireCompanyId } from "./companyContextService";
import type { CompanyContext } from "./companyContextService";
import { getCandidateReport, getDashboardViewModel } from "./mockSelectors";
import { getCandidateEvidenceReport, type SaveHumanReviewDecisionInput, type SaveHumanReviewDecisionResult } from "./reportService";
import { createHiringSupabaseClient } from "./supabaseClient";
import { createSupabaseHiringRepository } from "./supabaseHiringRepository";
import { hasSupabaseConfig, type SupabaseRuntimeEnv } from "./supabaseConfig";
import { WorkspaceAccessError } from "./workspaceAccessService";

export * from "./mockSelectors";

export type RepositorySource = "seed" | "supabase";

export type HiringRepository = {
  getDashboardData: (companyId: string) => DashboardViewModel;
  getJobById: (companyId: string, jobId: string) => JobRole | undefined;
  getCandidateById: (companyId: string, candidateId: string) => Candidate | undefined;
  getApplicationsForCandidate: (companyId: string, candidateId: string) => CandidateApplication[];
  getReportById: (companyId: string, reportId: string) => EvidenceReport | undefined;
};

export type AsyncHiringRepository = {
  source: RepositorySource;
  getActiveCompanyContext: () => Promise<CompanyContext>;
  getDashboardData: (companyId: string, activeUserId?: string) => Promise<DashboardViewModel>;
  getJobById: (companyId: string, jobId: string) => Promise<JobRole | undefined>;
  getCandidateById: (companyId: string, candidateId: string) => Promise<Candidate | undefined>;
  getApplicationsForCandidate: (companyId: string, candidateId: string) => Promise<CandidateApplication[]>;
  getReportById: (companyId: string, reportId: string) => Promise<EvidenceReport | undefined>;
  getJobCandidateList: (companyId: string, jobId: string) => Promise<JobCandidateListViewModel | undefined>;
  getBulkUploadWorkspace: (companyId: string, jobId: string) => Promise<BulkUploadWorkspaceViewModel | undefined>;
  saveHumanReviewDecision: (input: SaveHumanReviewDecisionInput) => Promise<SaveHumanReviewDecisionResult>;
};

export function getDashboardData(companyId: string): DashboardViewModel {
  requireCompanyId(companyId);
  return getDashboardViewModel();
}

export function getJobById(companyId: string, jobId: string): JobRole | undefined {
  const scopedCompanyId = requireCompanyId(companyId);
  return jobs.find((job) => job.organizationId === scopedCompanyId && job.id === jobId);
}

export function getCandidateById(companyId: string, candidateId: string): Candidate | undefined {
  const scopedCompanyId = requireCompanyId(companyId);
  return candidates.find((candidate) => candidate.organizationId === scopedCompanyId && candidate.id === candidateId);
}

export function getApplicationsForCandidate(companyId: string, candidateId: string): CandidateApplication[] {
  const scopedCompanyId = requireCompanyId(companyId);
  return applications.filter((application) => application.organizationId === scopedCompanyId && application.candidateId === candidateId);
}

export function getReportById(companyId: string, reportId: string): EvidenceReport | undefined {
  try {
    return getCandidateEvidenceReport(companyId, reportId);
  } catch {
    return undefined;
  }
}

/** The only report intentionally available without a customer workspace. */
export function getPublicSyntheticSampleReport(): EvidenceReport | undefined {
  return getReportById("org-northstar", "report-amanda-lee");
}

/** Public, synthetic marketing sample kept behind the product service boundary. */
export function getPublicSyntheticSampleViewModel(): CandidateReportViewModel {
  return getCandidateReport("report-amanda-lee");
}

export const hiringRepository: HiringRepository = {
  getDashboardData,
  getJobById,
  getCandidateById,
  getApplicationsForCandidate,
  getReportById
};

const unavailableAsyncHiringRepository: AsyncHiringRepository = {
  source: "seed",
  async getActiveCompanyContext() {
    throw new WorkspaceAccessError("configuration_missing");
  },
  async getDashboardData() {
    throw new WorkspaceAccessError("configuration_missing");
  },
  async getJobById() {
    throw new WorkspaceAccessError("configuration_missing");
  },
  async getCandidateById() {
    throw new WorkspaceAccessError("configuration_missing");
  },
  async getApplicationsForCandidate() {
    throw new WorkspaceAccessError("configuration_missing");
  },
  async getReportById() {
    throw new WorkspaceAccessError("configuration_missing");
  },
  async getJobCandidateList() {
    throw new WorkspaceAccessError("configuration_missing");
  },
  async getBulkUploadWorkspace() {
    throw new WorkspaceAccessError("configuration_missing");
  },
  async saveHumanReviewDecision() {
    throw new WorkspaceAccessError("configuration_missing");
  }
};

export function getHiringRepositoryMode(env?: SupabaseRuntimeEnv): RepositorySource {
  return hasSupabaseConfig(env) ? "supabase" : "seed";
}

export function getAsyncHiringRepository(env?: SupabaseRuntimeEnv): AsyncHiringRepository {
  if (getHiringRepositoryMode(env) === "supabase") {
    return createSupabaseHiringRepository(createHiringSupabaseClient(env), env);
  }

  return unavailableAsyncHiringRepository;
}
