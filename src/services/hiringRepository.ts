import { applications, candidates, jobs } from "../data/mockHiringData";
import type { Candidate, CandidateApplication, DashboardViewModel, EvidenceReport, JobRole } from "../types/hiring";
import { getDashboardViewModel } from "./mockSelectors";
import { getCandidateEvidenceReport } from "./reportService";

export * from "./mockSelectors";

export type HiringRepository = {
  getDashboardData: () => DashboardViewModel;
  getJobById: (jobId: string) => JobRole | undefined;
  getCandidateById: (candidateId: string) => Candidate | undefined;
  getApplicationsForCandidate: (candidateId: string) => CandidateApplication[];
  getReportById: (reportId: string) => EvidenceReport | undefined;
};

export function getDashboardData(): DashboardViewModel {
  return getDashboardViewModel();
}

export function getJobById(jobId: string): JobRole | undefined {
  return jobs.find((job) => job.id === jobId);
}

export function getCandidateById(candidateId: string): Candidate | undefined {
  return candidates.find((candidate) => candidate.id === candidateId);
}

export function getApplicationsForCandidate(candidateId: string): CandidateApplication[] {
  return applications.filter((application) => application.candidateId === candidateId);
}

export function getReportById(reportId: string): EvidenceReport | undefined {
  try {
    return getCandidateEvidenceReport(reportId);
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
