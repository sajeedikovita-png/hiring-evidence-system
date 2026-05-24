import { applications, candidates, jobs } from "../data/mockHiringData";
import type { Candidate, CandidateApplication, DashboardViewModel, EvidenceReport, JobRole } from "../types/hiring";
import { requireCompanyId } from "./companyContextService";
import { getActiveCompanyContext, type CompanyContext } from "./companyContextService";
import { getDashboardViewModel } from "./mockSelectors";
import { getCandidateEvidenceReport, saveHumanReviewDecision, type SaveHumanReviewDecisionInput, type SaveHumanReviewDecisionResult } from "./reportService";
import { createHiringSupabaseClient } from "./supabaseClient";
import { createSupabaseHiringRepository } from "./supabaseHiringRepository";
import { hasSupabaseConfig, type SupabaseRuntimeEnv } from "./supabaseConfig";

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
  getDashboardData: (companyId: string) => Promise<DashboardViewModel>;
  getJobById: (companyId: string, jobId: string) => Promise<JobRole | undefined>;
  getCandidateById: (companyId: string, candidateId: string) => Promise<Candidate | undefined>;
  getApplicationsForCandidate: (companyId: string, candidateId: string) => Promise<CandidateApplication[]>;
  getReportById: (companyId: string, reportId: string) => Promise<EvidenceReport | undefined>;
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

export const hiringRepository: HiringRepository = {
  getDashboardData,
  getJobById,
  getCandidateById,
  getApplicationsForCandidate,
  getReportById
};

const seedAsyncHiringRepository: AsyncHiringRepository = {
  source: "seed",
  async getActiveCompanyContext() {
    return getActiveCompanyContext();
  },
  async getDashboardData(companyId: string) {
    return getDashboardData(companyId);
  },
  async getJobById(companyId: string, jobId: string) {
    return getJobById(companyId, jobId);
  },
  async getCandidateById(companyId: string, candidateId: string) {
    return getCandidateById(companyId, candidateId);
  },
  async getApplicationsForCandidate(companyId: string, candidateId: string) {
    return getApplicationsForCandidate(companyId, candidateId);
  },
  async getReportById(companyId: string, reportId: string) {
    return getReportById(companyId, reportId);
  },
  async saveHumanReviewDecision(input: SaveHumanReviewDecisionInput) {
    return saveHumanReviewDecision(input);
  }
};

export function getHiringRepositoryMode(env?: SupabaseRuntimeEnv): RepositorySource {
  return hasSupabaseConfig(env) ? "supabase" : "seed";
}

export function getAsyncHiringRepository(env?: SupabaseRuntimeEnv): AsyncHiringRepository {
  if (getHiringRepositoryMode(env) === "supabase") {
    return createSupabaseHiringRepository(createHiringSupabaseClient(env));
  }

  return seedAsyncHiringRepository;
}
