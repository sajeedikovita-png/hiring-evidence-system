import { applications, candidates, jobs } from "../data/mockHiringData";
import type { Candidate, CandidateApplication, DashboardViewModel, EvidenceReport, JobRole } from "../types/hiring";
import { requireCompanyId } from "./companyContextService";
import { getDashboardViewModel } from "./mockSelectors";
import { getCandidateEvidenceReport } from "./reportService";

export * from "./mockSelectors";

export type HiringRepository = {
  getDashboardData: (companyId: string) => DashboardViewModel;
  getJobById: (companyId: string, jobId: string) => JobRole | undefined;
  getCandidateById: (companyId: string, candidateId: string) => Candidate | undefined;
  getApplicationsForCandidate: (companyId: string, candidateId: string) => CandidateApplication[];
  getReportById: (companyId: string, reportId: string) => EvidenceReport | undefined;
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
