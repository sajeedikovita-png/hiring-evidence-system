import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export type StatusBadge = {
  label: string;
  tone: BadgeTone;
};

export type SummaryMetric = {
  label: string;
  value: string;
  detail: string;
  tone?: BadgeTone;
};

export type CandidateProfile = {
  name: string;
  role: string;
  company: string;
  appliedDate: string;
  reportGenerated: string;
  reportId: string;
  currentStatus: string;
  assignedRecruiter: string;
  consentStatus: string;
  questionnaireStatus: string;
  resumeLabel: string;
  statusBadges: StatusBadge[];
};

export type EvidenceRow = {
  requirement: string;
  evidence: string;
  source: string;
  confidence: "High" | "Medium" | "Low" | "None";
  verificationNeeded: string;
  status: StatusBadge;
};

export type FairnessCheck = {
  status: string;
  protectedCharacteristicsStatus: string;
  decisionWordingWarning: string;
  reminder: string;
  protectedCharacteristics: string[];
};

export type CandidateReport = {
  candidate: CandidateProfile;
  summaryCards: SummaryMetric[];
  evidenceRows: EvidenceRow[];
  missingEvidence: string[];
  interviewQuestions: string[];
  fairness: FairnessCheck;
  recruiterNotes: string[];
  decisionOptions: string[];
};

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
};

export type ReviewQueueItem = {
  candidate: string;
  role: string;
  status: StatusBadge;
  due: string;
  reportPath: string;
};

export type JobRow = {
  title: string;
  department: string;
  candidates: string;
  evidenceStatus: StatusBadge;
  lastUpdated: string;
};

export type TableColumn<Row> = {
  key: keyof Row;
  header: string;
  render?: (row: Row) => ReactNode;
};
