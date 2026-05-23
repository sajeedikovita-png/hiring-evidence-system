import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export type StatusBadge = {
  label: string;
  tone: BadgeTone;
};

export type RecordStatus = "active" | "archived" | "draft";

export type Organization = {
  id: string;
  name: string;
  status: RecordStatus;
  createdAt: string;
};

export type User = {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: "admin" | "recruiter" | "hiring_manager";
  createdAt: string;
};

export type Job = {
  id: string;
  organizationId: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  status: "draft" | "open" | "paused" | "closed";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type JobCriterion = {
  id: string;
  jobId: string;
  label: string;
  description: string;
  priority: "required" | "preferred";
  sortOrder: number;
  createdAt: string;
};

export type JobCriteria = JobCriterion;

export type Candidate = {
  id: string;
  organizationId: string;
  name: string;
  email?: string;
  source: "bulk_upload" | "application_link" | "manual";
  createdAt: string;
};

export type Application = {
  id: string;
  organizationId: string;
  jobId: string;
  candidateId: string;
  status: "submitted" | "processing" | "report_ready" | "needs_review" | "failed";
  appliedAt: string;
  consentId?: string;
};

export type CandidateDocument = {
  id: string;
  applicationId: string;
  candidateId: string;
  fileName: string;
  fileUrl: string;
  fileType: "pdf" | "docx";
  uploadStatus: BulkUploadStatus;
  parsingStatus: ParsingStatus;
  createdAt: string;
};

export type CandidateConsent = {
  id: string;
  applicationId: string;
  candidateId: string;
  consentText: string;
  status: "recorded" | "missing";
  recordedAt?: string;
};

export type QuestionnaireQuestion = {
  id: string;
  jobId: string;
  prompt: string;
  sortOrder: number;
  createdAt: string;
};

export type QuestionnaireAnswer = {
  id: string;
  questionId: string;
  applicationId: string;
  answer: string;
  createdAt: string;
};

export type EvidenceLevel =
  | "Strong evidence"
  | "Good evidence, verification needed"
  | "Missing key evidence"
  | "Needs human review"
  | "Report failed";

export type EvidenceItem = {
  id: string;
  reportId: string;
  applicationId: string;
  criteriaId: string;
  requirement: string;
  evidence: string;
  source: "Resume" | "Questionnaire" | "Recruiter note" | "System";
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
  id: string;
  organizationId: string;
  jobId: string;
  applicationId: string;
  candidateId: string;
  reportId: string;
  generatedAt: string;
  reviewStatus: StatusBadge;
  evidenceLevel: EvidenceLevel;
  fairness: FairnessCheck;
  summaryCards: SummaryMetric[];
  missingEvidence: string[];
  interviewQuestions: string[];
  recruiterNotes: string[];
  decisionOptions: ReviewDecision["decision"][];
};

export type ReviewDecision = {
  id: string;
  reportId: string;
  applicationId: string;
  recruiterId: string;
  decision: "Shortlist" | "Invite to interview" | "Hold" | "Needs more evidence" | "Reject";
  reason: string;
  status: "draft" | "saved";
  createdAt: string;
};

export type AuditLog = {
  id: string;
  organizationId: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  createdAt: string;
};

export type BulkUploadStatus = "Uploaded" | "Failed" | "Needs manual review";

export type ParsingStatus = "Queued" | "Parsing" | "Parsed" | "Failed" | "Needs manual review";

export type EvidenceReportStatus = "Report generating" | "Report ready" | "Failed" | "Needs manual review";

export type BulkUploadBatch = {
  id: string;
  jobId: string;
  organizationId: string;
  uploadedBy: string;
  status: "Uploaded" | "Parsing" | "Parsed" | "Report generating" | "Report ready" | "Failed" | "Needs manual review";
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  createdAt: string;
};

export type BulkUploadFile = {
  id: string;
  batchId: string;
  fileName: string;
  fileUrl: string;
  status: BulkUploadStatus;
  errorMessage?: string;
  candidateId?: string;
  applicationId?: string;
  candidateName?: string;
  parsingStatus: ParsingStatus;
  evidenceReportStatus: EvidenceReportStatus;
  createdAt: string;
};

export type JobCandidateRow = {
  id: string;
  candidateName: string;
  applicationId: string;
  evidenceLevel: EvidenceLevel;
  reportStatus: StatusBadge;
  reviewStatus: StatusBadge;
  uploadedFile: string;
  updatedAt: string;
  reportPath: string;
};

export type CandidateReportViewModel = {
  candidate: CandidateProfile;
  job: Job;
  application: Application;
  report: CandidateReport;
  summaryCards: SummaryMetric[];
  evidenceRows: EvidenceItem[];
  missingEvidence: string[];
  interviewQuestions: string[];
  fairness: FairnessCheck;
  recruiterNotes: string[];
  decisionOptions: ReviewDecision["decision"][];
  decisionDraft?: ReviewDecision;
};

export type DashboardViewModel = {
  metrics: DashboardMetric[];
  reviewQueue: ReviewQueueItem[];
  recentJobs: JobRow[];
  introCount: number;
  activeReviewerName: string;
};

export type JobCandidateListViewModel = {
  job: Job;
  batch: BulkUploadBatch;
  filters: EvidenceLevel[];
  rows: JobCandidateRow[];
};

export type BulkUploadWorkspaceViewModel = {
  job: Job;
  batch: BulkUploadBatch;
  files: BulkUploadFile[];
  acceptedFileTypes: string[];
  maxFileSizeMb: number;
  privacyConfirmationText: string;
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
  id: string;
  title: string;
  department: string;
  candidates: string;
  evidenceStatus: StatusBadge;
  lastUpdated: string;
  candidateListPath: string;
  uploadPath: string;
};

export type TableColumn<Row> = {
  key: keyof Row;
  header: string;
  render?: (row: Row) => ReactNode;
};
