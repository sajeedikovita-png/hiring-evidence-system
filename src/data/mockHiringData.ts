import type {
  Application,
  AuditLog,
  BulkUploadBatch,
  BulkUploadFile,
  Candidate,
  CandidateConsent,
  CandidateDocument,
  CandidateReport,
  DashboardMetric,
  EvidenceItem,
  Job,
  JobCriteria,
  JobRow,
  Organization,
  QuestionnaireAnswer,
  QuestionnaireQuestion,
  ReviewDecision,
  ReviewQueueItem,
  User
} from "../types/hiring";

export const organizations: Organization[] = [
  {
    id: "org-northstar",
    name: "Northstar Digital",
    status: "active",
    createdAt: "2026-05-01T08:00:00.000Z"
  }
];

export const users: User[] = [
  {
    id: "user-sarah-tan",
    organizationId: "org-northstar",
    name: "Sarah Tan",
    email: "sarah@northstar.example",
    role: "recruiter",
    createdAt: "2026-05-01T08:10:00.000Z"
  }
];

export const jobs: Job[] = [
  {
    id: "job-frontend-developer",
    organizationId: "org-northstar",
    title: "Frontend Developer",
    department: "Product Engineering",
    location: "Singapore / Remote",
    employmentType: "Full-time",
    status: "open",
    createdBy: "user-sarah-tan",
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-23T03:00:00.000Z"
  },
  {
    id: "job-customer-success-manager",
    organizationId: "org-northstar",
    title: "Customer Success Manager",
    department: "Revenue",
    location: "Singapore",
    employmentType: "Full-time",
    status: "open",
    createdBy: "user-sarah-tan",
    createdAt: "2026-05-15T09:00:00.000Z",
    updatedAt: "2026-05-20T03:00:00.000Z"
  },
  {
    id: "job-data-analyst",
    organizationId: "org-northstar",
    title: "Data Analyst",
    department: "Operations",
    location: "Hybrid",
    employmentType: "Full-time",
    status: "open",
    createdBy: "user-sarah-tan",
    createdAt: "2026-05-13T09:00:00.000Z",
    updatedAt: "2026-05-19T03:00:00.000Z"
  }
];

export const jobCriteria: JobCriteria[] = [
  {
    id: "criteria-react-production",
    jobId: "job-frontend-developer",
    label: "React production experience",
    description: "Evidence of shipping and maintaining production React interfaces.",
    priority: "required",
    sortOrder: 1,
    createdAt: "2026-05-18T09:10:00.000Z"
  },
  {
    id: "criteria-aws-deployment",
    jobId: "job-frontend-developer",
    label: "AWS deployment work",
    description: "Evidence that the candidate has owned or supported AWS deployment workflows.",
    priority: "preferred",
    sortOrder: 2,
    createdAt: "2026-05-18T09:11:00.000Z"
  },
  {
    id: "criteria-collaboration",
    jobId: "job-frontend-developer",
    label: "Role-related collaboration",
    description: "Evidence of working with product, design, or customer-facing teams.",
    priority: "required",
    sortOrder: 3,
    createdAt: "2026-05-18T09:12:00.000Z"
  }
];

export const candidates: Candidate[] = [
  {
    id: "candidate-amanda-lee",
    organizationId: "org-northstar",
    name: "Amanda Lee",
    email: "amanda@example.com",
    source: "bulk_upload",
    createdAt: "2026-05-21T06:00:00.000Z"
  },
  {
    id: "candidate-daniel-morris",
    organizationId: "org-northstar",
    name: "Daniel Morris",
    source: "bulk_upload",
    createdAt: "2026-05-21T06:03:00.000Z"
  },
  {
    id: "candidate-priya-shah",
    organizationId: "org-northstar",
    name: "Priya Shah",
    source: "bulk_upload",
    createdAt: "2026-05-21T06:06:00.000Z"
  },
  {
    id: "candidate-marcus-wong",
    organizationId: "org-northstar",
    name: "Marcus Wong",
    source: "bulk_upload",
    createdAt: "2026-05-21T06:09:00.000Z"
  }
];

export const applications: Application[] = [
  {
    id: "application-amanda-frontend",
    organizationId: "org-northstar",
    jobId: "job-frontend-developer",
    candidateId: "candidate-amanda-lee",
    status: "report_ready",
    appliedAt: "2026-05-21T06:00:00.000Z",
    consentId: "consent-amanda-frontend"
  },
  {
    id: "application-daniel-frontend",
    organizationId: "org-northstar",
    jobId: "job-frontend-developer",
    candidateId: "candidate-daniel-morris",
    status: "needs_review",
    appliedAt: "2026-05-21T06:03:00.000Z",
    consentId: "consent-daniel-frontend"
  },
  {
    id: "application-priya-frontend",
    organizationId: "org-northstar",
    jobId: "job-frontend-developer",
    candidateId: "candidate-priya-shah",
    status: "report_ready",
    appliedAt: "2026-05-21T06:06:00.000Z",
    consentId: "consent-priya-frontend"
  },
  {
    id: "application-marcus-frontend",
    organizationId: "org-northstar",
    jobId: "job-frontend-developer",
    candidateId: "candidate-marcus-wong",
    status: "failed",
    appliedAt: "2026-05-21T06:09:00.000Z"
  }
];

export const candidateConsents: CandidateConsent[] = [
  {
    id: "consent-amanda-frontend",
    applicationId: "application-amanda-frontend",
    candidateId: "candidate-amanda-lee",
    consentText: "Candidate resume may be processed for this hiring review.",
    status: "recorded",
    recordedAt: "2026-05-21T06:00:00.000Z"
  },
  {
    id: "consent-daniel-frontend",
    applicationId: "application-daniel-frontend",
    candidateId: "candidate-daniel-morris",
    consentText: "Candidate resume may be processed for this hiring review.",
    status: "recorded",
    recordedAt: "2026-05-21T06:03:00.000Z"
  },
  {
    id: "consent-priya-frontend",
    applicationId: "application-priya-frontend",
    candidateId: "candidate-priya-shah",
    consentText: "Candidate resume may be processed for this hiring review.",
    status: "recorded",
    recordedAt: "2026-05-21T06:06:00.000Z"
  }
];

export const candidateDocuments: CandidateDocument[] = [
  {
    id: "document-amanda-resume",
    applicationId: "application-amanda-frontend",
    candidateId: "candidate-amanda-lee",
    fileName: "Amanda Lee resume.pdf",
    fileUrl: "/mock-files/amanda-lee-resume.pdf",
    fileType: "pdf",
    uploadStatus: "Uploaded",
    parsingStatus: "Parsed",
    createdAt: "2026-05-21T06:00:00.000Z"
  },
  {
    id: "document-daniel-resume",
    applicationId: "application-daniel-frontend",
    candidateId: "candidate-daniel-morris",
    fileName: "Daniel Morris CV.docx",
    fileUrl: "/mock-files/daniel-morris-cv.docx",
    fileType: "docx",
    uploadStatus: "Needs manual review",
    parsingStatus: "Needs manual review",
    createdAt: "2026-05-21T06:03:00.000Z"
  },
  {
    id: "document-priya-resume",
    applicationId: "application-priya-frontend",
    candidateId: "candidate-priya-shah",
    fileName: "Priya Shah resume.pdf",
    fileUrl: "/mock-files/priya-shah-resume.pdf",
    fileType: "pdf",
    uploadStatus: "Uploaded",
    parsingStatus: "Parsed",
    createdAt: "2026-05-21T06:06:00.000Z"
  }
];

export const questionnaireQuestions: QuestionnaireQuestion[] = [
  {
    id: "question-frontend-architecture",
    jobId: "job-frontend-developer",
    prompt: "Describe one production interface you shipped and maintained.",
    sortOrder: 1,
    createdAt: "2026-05-18T09:20:00.000Z"
  }
];

export const questionnaireAnswers: QuestionnaireAnswer[] = [
  {
    id: "answer-amanda-architecture",
    questionId: "question-frontend-architecture",
    applicationId: "application-amanda-frontend",
    answer: "I led a React dashboard rebuild with product and design, then supported rollout and analytics instrumentation.",
    createdAt: "2026-05-21T06:12:00.000Z"
  }
];

export const candidateReports: CandidateReport[] = [
  {
    id: "report-amanda-lee",
    organizationId: "org-northstar",
    jobId: "job-frontend-developer",
    applicationId: "application-amanda-frontend",
    candidateId: "candidate-amanda-lee",
    reportId: "HER-2026-0521-AL",
    generatedAt: "Today, 4:15 PM",
    reviewStatus: { label: "Human review required", tone: "info" },
    evidenceLevel: "Good evidence, verification needed",
    fairness: {
      status: "Fairness check passed",
      protectedCharacteristicsStatus: "Protected characteristics not used",
      decisionWordingWarning: "None",
      reminder: "Human review reminder: verify the evidence and decision wording before saving a final outcome.",
      protectedCharacteristics: [
        "Age",
        "Gender",
        "Race",
        "Religion",
        "Marital status",
        "Pregnancy or caregiving status",
        "Disability or mental health status",
        "Photo",
        "Nationality unless job-relevant"
      ]
    },
    summaryCards: [
      {
        label: "Evidence match",
        value: "Good evidence, verification needed",
        detail: "Evidence is organized by job-related criteria.",
        tone: "success"
      },
      {
        label: "Verification needed",
        value: "2 criteria need verification",
        detail: "Interview follow-up is needed before a final decision.",
        tone: "warning"
      },
      {
        label: "Missing evidence",
        value: "2 evidence gaps",
        detail: "AWS deployment and stakeholder communication need more proof.",
        tone: "danger"
      },
      {
        label: "Human decision",
        value: "Decision reason required",
        detail: "Final decisions stay with the hiring team.",
        tone: "info"
      }
    ],
    missingEvidence: [
      "No clear evidence that Amanda owned AWS deployment decisions.",
      "Questionnaire mentions collaboration, but stakeholder communication examples need interview verification."
    ],
    interviewQuestions: [
      "Walk us through the architecture decisions behind one shipped React dashboard.",
      "What AWS deployment work did you personally own, and what parts were handled by others?",
      "Describe a time you coordinated planning with product, design, or customer-facing teams."
    ],
    recruiterNotes: [
      "Evidence is promising for React delivery.",
      "Verify AWS ownership before moving past interview review."
    ],
    decisionOptions: ["Shortlist", "Invite to interview", "Hold", "Needs more evidence", "Reject"]
  }
];

export const evidenceItems: EvidenceItem[] = [
  {
    id: "evidence-amanda-react",
    reportId: "report-amanda-lee",
    applicationId: "application-amanda-frontend",
    criteriaId: "criteria-react-production",
    requirement: "React production experience",
    evidence: "Resume shows two shipped dashboard projects using React",
    source: "Resume",
    confidence: "High",
    verificationNeeded: "Ask architecture question",
    status: { label: "Strong evidence", tone: "success" }
  },
  {
    id: "evidence-amanda-aws",
    reportId: "report-amanda-lee",
    applicationId: "application-amanda-frontend",
    criteriaId: "criteria-aws-deployment",
    requirement: "AWS deployment work",
    evidence: "No clear deployment ownership found",
    source: "Resume",
    confidence: "Low",
    verificationNeeded: "Ask candidate directly",
    status: { label: "Needs verification", tone: "warning" }
  },
  {
    id: "evidence-amanda-collaboration",
    reportId: "report-amanda-lee",
    applicationId: "application-amanda-frontend",
    criteriaId: "criteria-collaboration",
    requirement: "Role-related collaboration",
    evidence: "Questionnaire answer mentions cross-functional planning",
    source: "Questionnaire",
    confidence: "Medium",
    verificationNeeded: "Ask stakeholder communication follow-up",
    status: { label: "Human review required", tone: "info" }
  }
];

export const reviewDecisions: ReviewDecision[] = [
  {
    id: "decision-amanda-draft",
    reportId: "report-amanda-lee",
    applicationId: "application-amanda-frontend",
    recruiterId: "user-sarah-tan",
    decision: "Needs more evidence",
    reason: "AWS deployment ownership needs interview verification.",
    status: "draft",
    createdAt: "2026-05-21T08:20:00.000Z"
  }
];

export const auditLogs: AuditLog[] = [
  {
    id: "audit-amanda-report-generated",
    organizationId: "org-northstar",
    userId: "user-sarah-tan",
    entityType: "candidate_report",
    entityId: "report-amanda-lee",
    action: "evidence_report_generated",
    createdAt: "2026-05-21T08:15:00.000Z"
  }
];

export const bulkUploadBatches: BulkUploadBatch[] = [
  {
    id: "batch-frontend-20260521",
    jobId: "job-frontend-developer",
    organizationId: "org-northstar",
    uploadedBy: "user-sarah-tan",
    status: "Report generating",
    totalFiles: 5,
    processedFiles: 4,
    failedFiles: 1,
    createdAt: "2026-05-21T06:00:00.000Z"
  }
];

export const bulkUploadFiles: BulkUploadFile[] = [
  {
    id: "bulk-file-amanda",
    batchId: "batch-frontend-20260521",
    fileName: "Amanda Lee resume.pdf",
    fileUrl: "/mock-files/amanda-lee-resume.pdf",
    status: "Uploaded",
    candidateId: "candidate-amanda-lee",
    applicationId: "application-amanda-frontend",
    candidateName: "Amanda Lee",
    parsingStatus: "Parsed",
    evidenceReportStatus: "Report ready",
    createdAt: "2026-05-21T06:00:00.000Z"
  },
  {
    id: "bulk-file-daniel",
    batchId: "batch-frontend-20260521",
    fileName: "Daniel Morris CV.docx",
    fileUrl: "/mock-files/daniel-morris-cv.docx",
    status: "Needs manual review",
    candidateId: "candidate-daniel-morris",
    applicationId: "application-daniel-frontend",
    candidateName: "Daniel Morris",
    parsingStatus: "Needs manual review",
    evidenceReportStatus: "Needs manual review",
    createdAt: "2026-05-21T06:03:00.000Z"
  },
  {
    id: "bulk-file-priya",
    batchId: "batch-frontend-20260521",
    fileName: "Priya Shah resume.pdf",
    fileUrl: "/mock-files/priya-shah-resume.pdf",
    status: "Uploaded",
    candidateId: "candidate-priya-shah",
    applicationId: "application-priya-frontend",
    candidateName: "Priya Shah",
    parsingStatus: "Parsed",
    evidenceReportStatus: "Report ready",
    createdAt: "2026-05-21T06:06:00.000Z"
  },
  {
    id: "bulk-file-marcus",
    batchId: "batch-frontend-20260521",
    fileName: "Marcus Wong resume.pdf",
    fileUrl: "/mock-files/marcus-wong-resume.pdf",
    status: "Uploaded",
    candidateId: "candidate-marcus-wong",
    applicationId: "application-marcus-frontend",
    candidateName: "Marcus Wong",
    parsingStatus: "Parsed",
    evidenceReportStatus: "Failed",
    errorMessage: "Evidence report failed. Needs manual review before any decision.",
    createdAt: "2026-05-21T06:09:00.000Z"
  },
  {
    id: "bulk-file-unsupported",
    batchId: "batch-frontend-20260521",
    fileName: "portfolio-images.zip",
    fileUrl: "",
    status: "Failed",
    parsingStatus: "Failed",
    evidenceReportStatus: "Failed",
    errorMessage: "Unsupported file type. Upload PDF or DOCX resumes only.",
    createdAt: "2026-05-21T06:12:00.000Z"
  }
];

export const dashboardMetrics: DashboardMetric[] = [
  { label: "Active jobs", value: "12", detail: "4 roles updated this week" },
  { label: "Candidates waiting for review", value: "28", detail: "6 need verification today" },
  { label: "Reports completed", value: "84", detail: "Evidence reports ready for recruiter review" },
  { label: "Decisions needing sign-off", value: "9", detail: "Decision reasons still required" }
];

export const reviewQueue: ReviewQueueItem[] = [
  {
    candidate: "Amanda Lee",
    role: "Frontend Developer",
    status: { label: "Human review required", tone: "info" },
    due: "Today",
    reportPath: "/reports/candidate-evidence"
  },
  {
    candidate: "Daniel Morris",
    role: "Frontend Developer",
    status: { label: "Needs verification", tone: "warning" },
    due: "Tomorrow",
    reportPath: "/jobs/frontend-developer/candidates"
  },
  {
    candidate: "Priya Shah",
    role: "Frontend Developer",
    status: { label: "Evidence report ready", tone: "success" },
    due: "23 May 2026",
    reportPath: "/jobs/frontend-developer/candidates"
  }
];

export const recentJobs: JobRow[] = [
  {
    id: "job-frontend-developer",
    title: "Frontend Developer",
    department: "Product Engineering",
    candidates: "14 candidates",
    evidenceStatus: { label: "3 reports ready", tone: "success" },
    lastUpdated: "Today",
    candidateListPath: "/jobs/frontend-developer/candidates",
    uploadPath: "/jobs/frontend-developer/candidates/upload"
  },
  {
    id: "job-customer-success-manager",
    title: "Customer Success Manager",
    department: "Revenue",
    candidates: "9 candidates",
    evidenceStatus: { label: "Needs verification", tone: "warning" },
    lastUpdated: "20 May 2026",
    candidateListPath: "/dashboard",
    uploadPath: "/dashboard"
  },
  {
    id: "job-data-analyst",
    title: "Data Analyst",
    department: "Operations",
    candidates: "11 candidates",
    evidenceStatus: { label: "Human review required", tone: "info" },
    lastUpdated: "19 May 2026",
    candidateListPath: "/dashboard",
    uploadPath: "/dashboard"
  }
];

export const landingFeatures = [
  "Evidence matrix by job requirement",
  "Bulk CV upload for one role at a time",
  "Missing evidence and verification prompts",
  "Suggested interview questions",
  "Fairness wording checks",
  "Recruiter decision notes and audit trail"
];
