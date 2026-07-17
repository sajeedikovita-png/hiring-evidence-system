import type {
  Application,
  AuditLog,
  BulkUploadBatch,
  BulkUploadFile,
  Candidate,
  CandidateConsent,
  CandidateDocument,
  CandidateReport,
  EvidenceItem,
  FairnessCheck,
  Job,
  JobCriterion,
  Organization,
  QuestionnaireAnswer,
  QuestionnaireQuestion,
  ReviewDecision,
  User
} from "../types/hiring";

const standardFairness: FairnessCheck = {
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
};

const standardDecisionOptions: ReviewDecision["decision"][] = [
  "Shortlist for interview",
  "Hold for review",
  "Not proceeding",
  "Request more information"
];

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
  },
  {
    id: "user-maya-chen",
    organizationId: "org-northstar",
    name: "Maya Chen",
    email: "maya@northstar.example",
    role: "recruiter",
    createdAt: "2026-05-02T09:30:00.000Z"
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

export const jobCriteria: JobCriterion[] = [
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
  },
  {
    id: "criteria-csm-enterprise",
    jobId: "job-customer-success-manager",
    label: "Enterprise account management",
    description: "Evidence of managing renewal risk, onboarding, or expansion work for B2B customers.",
    priority: "required",
    sortOrder: 1,
    createdAt: "2026-05-15T09:10:00.000Z"
  },
  {
    id: "criteria-csm-risk",
    jobId: "job-customer-success-manager",
    label: "Customer risk follow-up",
    description: "Evidence of structured follow-up when customer health signals need attention.",
    priority: "preferred",
    sortOrder: 2,
    createdAt: "2026-05-15T09:11:00.000Z"
  },
  {
    id: "criteria-data-sql",
    jobId: "job-data-analyst",
    label: "SQL analysis",
    description: "Evidence of using SQL to answer operational or product questions.",
    priority: "required",
    sortOrder: 1,
    createdAt: "2026-05-13T09:10:00.000Z"
  },
  {
    id: "criteria-data-storytelling",
    jobId: "job-data-analyst",
    label: "Insight communication",
    description: "Evidence of explaining analysis clearly to non-technical stakeholders.",
    priority: "required",
    sortOrder: 2,
    createdAt: "2026-05-13T09:11:00.000Z"
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
  },
  {
    id: "candidate-elena-garcia",
    organizationId: "org-northstar",
    name: "Elena Garcia",
    email: "elena@example.com",
    source: "application_link",
    createdAt: "2026-05-22T04:30:00.000Z"
  },
  {
    id: "candidate-david-lim",
    organizationId: "org-northstar",
    name: "David Lim",
    email: "david.lim@example.com",
    source: "bulk_upload",
    createdAt: "2026-05-22T05:00:00.000Z"
  },
  {
    id: "candidate-hannah-cole",
    organizationId: "org-northstar",
    name: "Hannah Cole",
    source: "bulk_upload",
    createdAt: "2026-05-22T05:03:00.000Z"
  },
  {
    id: "candidate-marcus-vance",
    organizationId: "org-northstar",
    name: "Marcus Vance",
    source: "bulk_upload",
    createdAt: "2026-05-22T05:06:00.000Z"
  },
  {
    id: "candidate-nadia-hassan",
    organizationId: "org-northstar",
    name: "Nadia Hassan",
    email: "nadia.hassan@example.com",
    source: "bulk_upload",
    createdAt: "2026-05-22T05:30:00.000Z"
  },
  {
    id: "candidate-ben-carter",
    organizationId: "org-northstar",
    name: "Ben Carter",
    source: "bulk_upload",
    createdAt: "2026-05-22T05:33:00.000Z"
  },
  {
    id: "candidate-sofia-ruiz",
    organizationId: "org-northstar",
    name: "Sofia Ruiz",
    source: "bulk_upload",
    createdAt: "2026-05-22T05:36:00.000Z"
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
  },
  {
    id: "application-elena-csm",
    organizationId: "org-northstar",
    jobId: "job-customer-success-manager",
    candidateId: "candidate-elena-garcia",
    status: "submitted",
    appliedAt: "2026-05-22T04:30:00.000Z",
    consentId: "consent-elena-csm"
  },
  {
    id: "application-david-csm",
    organizationId: "org-northstar",
    jobId: "job-customer-success-manager",
    candidateId: "candidate-david-lim",
    status: "report_ready",
    appliedAt: "2026-05-22T05:00:00.000Z"
  },
  {
    id: "application-hannah-csm",
    organizationId: "org-northstar",
    jobId: "job-customer-success-manager",
    candidateId: "candidate-hannah-cole",
    status: "needs_review",
    appliedAt: "2026-05-22T05:03:00.000Z"
  },
  {
    id: "application-marcus-csm",
    organizationId: "org-northstar",
    jobId: "job-customer-success-manager",
    candidateId: "candidate-marcus-vance",
    status: "failed",
    appliedAt: "2026-05-22T05:06:00.000Z"
  },
  {
    id: "application-nadia-data",
    organizationId: "org-northstar",
    jobId: "job-data-analyst",
    candidateId: "candidate-nadia-hassan",
    status: "report_ready",
    appliedAt: "2026-05-22T05:30:00.000Z"
  },
  {
    id: "application-ben-data",
    organizationId: "org-northstar",
    jobId: "job-data-analyst",
    candidateId: "candidate-ben-carter",
    status: "report_ready",
    appliedAt: "2026-05-22T05:33:00.000Z"
  },
  {
    id: "application-sofia-data",
    organizationId: "org-northstar",
    jobId: "job-data-analyst",
    candidateId: "candidate-sofia-ruiz",
    status: "needs_review",
    appliedAt: "2026-05-22T05:36:00.000Z"
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
  },
  {
    id: "consent-elena-csm",
    applicationId: "application-elena-csm",
    candidateId: "candidate-elena-garcia",
    consentText: "Candidate resume and questionnaire answers may be processed for this hiring review.",
    status: "recorded",
    recordedAt: "2026-05-22T04:30:00.000Z"
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
  },
  {
    id: "document-elena-resume",
    applicationId: "application-elena-csm",
    candidateId: "candidate-elena-garcia",
    fileName: "Elena Garcia resume.pdf",
    fileUrl: "/mock-files/elena-garcia-resume.pdf",
    fileType: "pdf",
    uploadStatus: "Uploaded",
    parsingStatus: "Queued",
    createdAt: "2026-05-22T04:30:00.000Z"
  },
  {
    id: "document-david-resume",
    applicationId: "application-david-csm",
    candidateId: "candidate-david-lim",
    fileName: "David Lim CV.pdf",
    fileUrl: "/mock-files/david-lim-cv.pdf",
    fileType: "pdf",
    uploadStatus: "Uploaded",
    parsingStatus: "Parsed",
    createdAt: "2026-05-22T05:00:00.000Z"
  },
  {
    id: "document-hannah-resume",
    applicationId: "application-hannah-csm",
    candidateId: "candidate-hannah-cole",
    fileName: "Hannah Cole resume.docx",
    fileUrl: "/mock-files/hannah-cole-resume.docx",
    fileType: "docx",
    uploadStatus: "Uploaded",
    parsingStatus: "Parsed",
    createdAt: "2026-05-22T05:03:00.000Z"
  },
  {
    id: "document-nadia-resume",
    applicationId: "application-nadia-data",
    candidateId: "candidate-nadia-hassan",
    fileName: "Nadia Hassan resume.pdf",
    fileUrl: "/mock-files/nadia-hassan-resume.pdf",
    fileType: "pdf",
    uploadStatus: "Uploaded",
    parsingStatus: "Parsed",
    createdAt: "2026-05-22T05:30:00.000Z"
  },
  {
    id: "document-ben-resume",
    applicationId: "application-ben-data",
    candidateId: "candidate-ben-carter",
    fileName: "Ben Carter CV.pdf",
    fileUrl: "/mock-files/ben-carter-cv.pdf",
    fileType: "pdf",
    uploadStatus: "Uploaded",
    parsingStatus: "Parsed",
    createdAt: "2026-05-22T05:33:00.000Z"
  },
  {
    id: "document-sofia-resume",
    applicationId: "application-sofia-data",
    candidateId: "candidate-sofia-ruiz",
    fileName: "Sofia Ruiz resume.docx",
    fileUrl: "/mock-files/sofia-ruiz-resume.docx",
    fileType: "docx",
    uploadStatus: "Uploaded",
    parsingStatus: "Parsed",
    createdAt: "2026-05-22T05:36:00.000Z"
  }
];

export const questionnaireQuestions: QuestionnaireQuestion[] = [
  {
    id: "question-frontend-architecture",
    jobId: "job-frontend-developer",
    prompt: "Describe one production interface you shipped and maintained.",
    sortOrder: 1,
    createdAt: "2026-05-18T09:20:00.000Z"
  },
  {
    id: "question-csm-risk",
    jobId: "job-customer-success-manager",
    prompt: "Describe one customer risk situation you handled and what evidence showed improvement.",
    sortOrder: 1,
    createdAt: "2026-05-15T09:20:00.000Z"
  }
];

export const questionnaireAnswers: QuestionnaireAnswer[] = [
  {
    id: "answer-amanda-architecture",
    questionId: "question-frontend-architecture",
    applicationId: "application-amanda-frontend",
    answer: "I led a React dashboard rebuild with product and design, then supported rollout and analytics instrumentation.",
    createdAt: "2026-05-21T06:12:00.000Z"
  },
  {
    id: "answer-elena-risk",
    questionId: "question-csm-risk",
    applicationId: "application-elena-csm",
    answer: "I rebuilt a renewal-risk workflow with support and sales, then tracked follow-up completion and customer health changes.",
    createdAt: "2026-05-22T04:42:00.000Z"
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
    decisionOptions: ["Shortlist for interview", "Hold for review", "Not proceeding", "Request more information"]
  },
  {
    id: "report-priya-shah",
    organizationId: "org-northstar",
    jobId: "job-frontend-developer",
    applicationId: "application-priya-frontend",
    candidateId: "candidate-priya-shah",
    reportId: "HER-2026-0521-PS",
    generatedAt: "Today, 4:18 PM",
    reviewStatus: { label: "Evidence report ready", tone: "success" },
    evidenceLevel: "Strong evidence",
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
        value: "Strong evidence",
        detail: "Every required criterion has job-related evidence.",
        tone: "success"
      },
      {
        label: "Verification needed",
        value: "1 area to confirm",
        detail: "Confirm AWS deployment depth during the interview.",
        tone: "warning"
      },
      {
        label: "Missing evidence",
        value: "No major gaps",
        detail: "All required criteria are supported by evidence.",
        tone: "success"
      },
      {
        label: "Human decision",
        value: "Decision reason required",
        detail: "Final decisions stay with the hiring team.",
        tone: "info"
      }
    ],
    missingEvidence: [
      "No major evidence gaps. Confirm the depth of AWS deployment ownership during the interview."
    ],
    interviewQuestions: [
      "Walk us through the shared React component library you led and how other teams adopted it.",
      "Which parts of the AWS deployment pipeline did you personally own end to end?",
      "Describe how you partnered with product and design on a recent release."
    ],
    recruiterNotes: [
      "Strong, well-evidenced React delivery across multiple products.",
      "Confirm AWS ownership depth, then this looks ready to shortlist for interview."
    ],
    decisionOptions: ["Shortlist for interview", "Hold for review", "Not proceeding", "Request more information"]
  },
  {
    id: "report-daniel-morris",
    organizationId: "org-northstar",
    jobId: "job-frontend-developer",
    applicationId: "application-daniel-frontend",
    candidateId: "candidate-daniel-morris",
    reportId: "HER-2026-0521-DM",
    generatedAt: "Today, 4:21 PM",
    reviewStatus: { label: "Human review required", tone: "info" },
    evidenceLevel: "Needs human review",
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
        value: "Needs human review",
        detail: "The resume file could not be fully read by the system.",
        tone: "info"
      },
      {
        label: "Verification needed",
        value: "3 criteria to verify",
        detail: "Re-request a readable PDF before reviewing the evidence.",
        tone: "warning"
      },
      {
        label: "Missing evidence",
        value: "Evidence not confirmed",
        detail: "Key resume sections were unreadable.",
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
      "The resume file could not be fully parsed; several sections were unreadable.",
      "No AWS deployment evidence was confirmed in the readable text."
    ],
    interviewQuestions: [
      "Request a PDF version of the resume so the evidence review can be completed.",
      "Which React projects did the candidate personally build and maintain?",
      "What deployment work, if any, did the candidate own?"
    ],
    recruiterNotes: [
      "Document needs manual review — formatting blocked text extraction.",
      "Do not record a decision until a readable resume has been reviewed."
    ],
    decisionOptions: ["Shortlist for interview", "Hold for review", "Not proceeding", "Request more information"]
  },
  {
    id: "report-elena-garcia",
    organizationId: "org-northstar",
    jobId: "job-customer-success-manager",
    applicationId: "application-elena-csm",
    candidateId: "candidate-elena-garcia",
    reportId: "HER-2026-0522-EG",
    generatedAt: "Today, 11:05 AM",
    reviewStatus: { label: "Evidence report ready", tone: "success" },
    evidenceLevel: "Strong evidence",
    fairness: standardFairness,
    summaryCards: [
      { label: "Evidence match", value: "Strong evidence", detail: "Enterprise account ownership is clearly evidenced.", tone: "success" },
      { label: "Verification needed", value: "No open items", detail: "All required criteria are evidenced.", tone: "success" },
      { label: "Missing evidence", value: "No major gaps", detail: "Required criteria are supported by evidence.", tone: "success" },
      { label: "Human decision", value: "Decision reason required", detail: "Final decisions stay with the hiring team.", tone: "info" }
    ],
    missingEvidence: ["No major evidence gaps. Confirm the scale and outcomes of the renewal-risk work during the interview."],
    interviewQuestions: [
      "Walk us through how you rebuilt the renewal-risk workflow and what changed afterward.",
      "How large were the enterprise accounts you owned, and what were the outcomes?",
      "How did you partner with support and sales on at-risk accounts?"
    ],
    recruiterNotes: [
      "Strong, well-evidenced enterprise customer success experience.",
      "Confirm outcomes, then consider shortlisting for interview."
    ],
    decisionOptions: standardDecisionOptions
  },
  {
    id: "report-david-lim",
    organizationId: "org-northstar",
    jobId: "job-customer-success-manager",
    applicationId: "application-david-csm",
    candidateId: "candidate-david-lim",
    reportId: "HER-2026-0522-DL",
    generatedAt: "Today, 11:08 AM",
    reviewStatus: { label: "Human review required", tone: "info" },
    evidenceLevel: "Good evidence, verification needed",
    fairness: standardFairness,
    summaryCards: [
      { label: "Evidence match", value: "Good evidence, verification needed", detail: "Core customer success experience is present.", tone: "success" },
      { label: "Verification needed", value: "Enterprise scope to confirm", detail: "Confirm enterprise account ownership in the interview.", tone: "warning" },
      { label: "Missing evidence", value: "Minor gaps", detail: "Renewal-risk ownership is only partly evidenced.", tone: "warning" },
      { label: "Human decision", value: "Decision reason required", detail: "Final decisions stay with the hiring team.", tone: "info" }
    ],
    missingEvidence: [
      "Enterprise account ownership is limited on the resume; confirm scope during the interview.",
      "The renewal-risk handoff process is not clearly documented."
    ],
    interviewQuestions: [
      "What is the largest account you have personally owned, and what was your role?",
      "Walk us through how you handle an account showing churn-risk signals.",
      "How did you work with a senior CSM on renewals — what did you own?"
    ],
    recruiterNotes: [
      "Promising customer success foundation.",
      "Verify enterprise scope before moving past interview review."
    ],
    decisionOptions: standardDecisionOptions
  },
  {
    id: "report-hannah-cole",
    organizationId: "org-northstar",
    jobId: "job-customer-success-manager",
    applicationId: "application-hannah-csm",
    candidateId: "candidate-hannah-cole",
    reportId: "HER-2026-0522-HC",
    generatedAt: "Today, 11:11 AM",
    reviewStatus: { label: "Human review required", tone: "info" },
    evidenceLevel: "Missing key evidence",
    fairness: standardFairness,
    summaryCards: [
      { label: "Evidence match", value: "Missing key evidence", detail: "Background is customer support, not account management.", tone: "danger" },
      { label: "Verification needed", value: "Multiple gaps", detail: "Ask directly about account ownership.", tone: "warning" },
      { label: "Missing evidence", value: "Key evidence missing", detail: "No renewal or enterprise account ownership found.", tone: "danger" },
      { label: "Human decision", value: "Decision reason required", detail: "Final decisions stay with the hiring team.", tone: "info" }
    ],
    missingEvidence: [
      "No account ownership or renewal experience found; background is customer support.",
      "Ask the candidate directly about any enterprise account-management experience."
    ],
    interviewQuestions: [
      "Do you have direct experience owning customer accounts and renewals?",
      "What account-management work is not captured on your resume?"
    ],
    recruiterNotes: [
      "Key account-management evidence appears to be missing.",
      "Confirm directly before deciding; do not assume from a support background."
    ],
    decisionOptions: standardDecisionOptions
  },
  {
    id: "report-nadia-hassan",
    organizationId: "org-northstar",
    jobId: "job-data-analyst",
    applicationId: "application-nadia-data",
    candidateId: "candidate-nadia-hassan",
    reportId: "HER-2026-0522-NH",
    generatedAt: "Today, 11:35 AM",
    reviewStatus: { label: "Evidence report ready", tone: "success" },
    evidenceLevel: "Strong evidence",
    fairness: standardFairness,
    summaryCards: [
      { label: "Evidence match", value: "Strong evidence", detail: "SQL analysis and stakeholder communication are both evidenced.", tone: "success" },
      { label: "Verification needed", value: "No open items", detail: "All required criteria are evidenced.", tone: "success" },
      { label: "Missing evidence", value: "No major gaps", detail: "Required criteria are supported by evidence.", tone: "success" },
      { label: "Human decision", value: "Decision reason required", detail: "Final decisions stay with the hiring team.", tone: "info" }
    ],
    missingEvidence: ["No major evidence gaps. Confirm the impact of the churn analysis during the interview."],
    interviewQuestions: [
      "Walk us through a complex SQL investigation you ran and what it changed.",
      "How do you present analysis to non-technical stakeholders?",
      "Tell us about a dashboard you built that others relied on."
    ],
    recruiterNotes: [
      "Strong, well-evidenced analysis and communication.",
      "Confirm impact, then consider shortlisting for interview."
    ],
    decisionOptions: standardDecisionOptions
  },
  {
    id: "report-ben-carter",
    organizationId: "org-northstar",
    jobId: "job-data-analyst",
    applicationId: "application-ben-data",
    candidateId: "candidate-ben-carter",
    reportId: "HER-2026-0522-BC",
    generatedAt: "Today, 11:38 AM",
    reviewStatus: { label: "Human review required", tone: "info" },
    evidenceLevel: "Good evidence, verification needed",
    fairness: standardFairness,
    summaryCards: [
      { label: "Evidence match", value: "Good evidence, verification needed", detail: "SQL is evidenced; communication is less clear.", tone: "success" },
      { label: "Verification needed", value: "Communication to confirm", detail: "Confirm how insights are communicated to stakeholders.", tone: "warning" },
      { label: "Missing evidence", value: "Minor gaps", detail: "Audience and impact of the charts is unclear.", tone: "warning" },
      { label: "Human decision", value: "Decision reason required", detail: "Final decisions stay with the hiring team.", tone: "info" }
    ],
    missingEvidence: ["Evidence of explaining insights to stakeholders is thin; confirm during the interview."],
    interviewQuestions: [
      "Give an example of a report you wrote in SQL and who used it.",
      "How do you make analysis understandable to a non-technical audience?",
      "What was the impact of a chart or report you built?"
    ],
    recruiterNotes: [
      "Solid SQL foundation.",
      "Verify stakeholder communication before moving past interview review."
    ],
    decisionOptions: standardDecisionOptions
  },
  {
    id: "report-sofia-ruiz",
    organizationId: "org-northstar",
    jobId: "job-data-analyst",
    applicationId: "application-sofia-data",
    candidateId: "candidate-sofia-ruiz",
    reportId: "HER-2026-0522-SR",
    generatedAt: "Today, 11:41 AM",
    reviewStatus: { label: "Human review required", tone: "info" },
    evidenceLevel: "Missing key evidence",
    fairness: standardFairness,
    summaryCards: [
      { label: "Evidence match", value: "Missing key evidence", detail: "No SQL experience listed; reporting is spreadsheet-based.", tone: "danger" },
      { label: "Verification needed", value: "Ask directly", detail: "Confirm any SQL or analysis experience.", tone: "warning" },
      { label: "Missing evidence", value: "Key evidence missing", detail: "SQL analysis is a required criterion and was not found.", tone: "danger" },
      { label: "Human decision", value: "Decision reason required", detail: "Final decisions stay with the hiring team.", tone: "info" }
    ],
    missingEvidence: [
      "No SQL experience listed; reporting appears to be done in Excel.",
      "Ask the candidate directly whether they have any SQL or analysis experience."
    ],
    interviewQuestions: [
      "Do you have any experience writing SQL? Please describe it.",
      "How do you communicate the insights from your reports?"
    ],
    recruiterNotes: [
      "A required criterion (SQL) appears to be missing.",
      "Confirm directly before deciding."
    ],
    decisionOptions: standardDecisionOptions
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
  },
  {
    id: "evidence-priya-react",
    reportId: "report-priya-shah",
    applicationId: "application-priya-frontend",
    criteriaId: "criteria-react-production",
    requirement: "React production experience",
    evidence: "Resume shows four years shipping production React apps and leading a shared component library used across three products.",
    source: "Resume",
    confidence: "High",
    verificationNeeded: "None",
    status: { label: "Strong evidence", tone: "success" }
  },
  {
    id: "evidence-priya-aws",
    reportId: "report-priya-shah",
    applicationId: "application-priya-frontend",
    criteriaId: "criteria-aws-deployment",
    requirement: "AWS deployment work",
    evidence: "Resume lists owning the CI/CD pipeline that deploys the web app to AWS (S3 and CloudFront).",
    source: "Resume",
    confidence: "Medium",
    verificationNeeded: "Confirm depth of deployment ownership in the interview",
    status: { label: "Needs verification", tone: "warning" }
  },
  {
    id: "evidence-priya-collaboration",
    reportId: "report-priya-shah",
    applicationId: "application-priya-frontend",
    criteriaId: "criteria-collaboration",
    requirement: "Role-related collaboration",
    evidence: "Resume describes working embedded with product and design and running weekly design-review syncs.",
    source: "Resume",
    confidence: "High",
    verificationNeeded: "None",
    status: { label: "Strong evidence", tone: "success" }
  },
  {
    id: "evidence-daniel-react",
    reportId: "report-daniel-morris",
    applicationId: "application-daniel-frontend",
    criteriaId: "criteria-react-production",
    requirement: "React production experience",
    evidence: "Resume mentions React, but file formatting prevented the system from extracting project details.",
    source: "Resume",
    confidence: "Low",
    verificationNeeded: "Re-request a PDF resume and confirm React project scope",
    status: { label: "Human review required", tone: "info" }
  },
  {
    id: "evidence-daniel-aws",
    reportId: "report-daniel-morris",
    applicationId: "application-daniel-frontend",
    criteriaId: "criteria-aws-deployment",
    requirement: "AWS deployment work",
    evidence: "No deployment evidence was detected in the readable sections of the file.",
    source: "Resume",
    confidence: "None",
    verificationNeeded: "Confirm deployment experience directly with the candidate",
    status: { label: "Missing evidence", tone: "danger" }
  },
  {
    id: "evidence-daniel-collaboration",
    reportId: "report-daniel-morris",
    applicationId: "application-daniel-frontend",
    criteriaId: "criteria-collaboration",
    requirement: "Role-related collaboration",
    evidence: "An unreadable section may contain teamwork detail; it could not be confirmed.",
    source: "Resume",
    confidence: "Low",
    verificationNeeded: "Review a readable resume to confirm collaboration evidence",
    status: { label: "Human review required", tone: "info" }
  },
  {
    id: "evidence-elena-enterprise",
    reportId: "report-elena-garcia",
    applicationId: "application-elena-csm",
    criteriaId: "criteria-csm-enterprise",
    requirement: "Enterprise account management",
    evidence: "Resume shows ownership of an enterprise portfolio worth several million in ARR.",
    source: "Resume",
    confidence: "High",
    verificationNeeded: "None",
    status: { label: "Strong evidence", tone: "success" }
  },
  {
    id: "evidence-elena-risk",
    reportId: "report-elena-garcia",
    applicationId: "application-elena-csm",
    criteriaId: "criteria-csm-risk",
    requirement: "Customer risk follow-up",
    evidence: "Questionnaire describes rebuilding a renewal-risk workflow and tracking follow-up completion.",
    source: "Questionnaire",
    confidence: "High",
    verificationNeeded: "None",
    status: { label: "Strong evidence", tone: "success" }
  },
  {
    id: "evidence-david-enterprise",
    reportId: "report-david-lim",
    applicationId: "application-david-csm",
    criteriaId: "criteria-csm-enterprise",
    requirement: "Enterprise account management",
    evidence: "Resume shows small-business account support; enterprise ownership is limited.",
    source: "Resume",
    confidence: "Medium",
    verificationNeeded: "Confirm enterprise account ownership in the interview",
    status: { label: "Needs verification", tone: "warning" }
  },
  {
    id: "evidence-david-risk",
    reportId: "report-david-lim",
    applicationId: "application-david-csm",
    criteriaId: "criteria-csm-risk",
    requirement: "Customer risk follow-up",
    evidence: "Assisted with renewals alongside a senior CSM; the handoff process is not documented.",
    source: "Resume",
    confidence: "Medium",
    verificationNeeded: "Confirm ownership of risk follow-up",
    status: { label: "Needs verification", tone: "warning" }
  },
  {
    id: "evidence-hannah-enterprise",
    reportId: "report-hannah-cole",
    applicationId: "application-hannah-csm",
    criteriaId: "criteria-csm-enterprise",
    requirement: "Enterprise account management",
    evidence: "No account ownership found; background is inbound customer support tickets.",
    source: "Resume",
    confidence: "Low",
    verificationNeeded: "Ask directly about account-management experience",
    status: { label: "Missing evidence", tone: "danger" }
  },
  {
    id: "evidence-hannah-risk",
    reportId: "report-hannah-cole",
    applicationId: "application-hannah-csm",
    criteriaId: "criteria-csm-risk",
    requirement: "Customer risk follow-up",
    evidence: "No structured customer-risk follow-up evidence found.",
    source: "Resume",
    confidence: "None",
    verificationNeeded: "Ask the candidate directly",
    status: { label: "Missing evidence", tone: "danger" }
  },
  {
    id: "evidence-nadia-sql",
    reportId: "report-nadia-hassan",
    applicationId: "application-nadia-data",
    criteriaId: "criteria-data-sql",
    requirement: "SQL analysis",
    evidence: "Resume shows complex SQL used to answer operational and product questions.",
    source: "Resume",
    confidence: "High",
    verificationNeeded: "None",
    status: { label: "Strong evidence", tone: "success" }
  },
  {
    id: "evidence-nadia-storytelling",
    reportId: "report-nadia-hassan",
    applicationId: "application-nadia-data",
    criteriaId: "criteria-data-storytelling",
    requirement: "Insight communication",
    evidence: "Resume describes presenting monthly insight reviews to non-technical department heads.",
    source: "Resume",
    confidence: "High",
    verificationNeeded: "None",
    status: { label: "Strong evidence", tone: "success" }
  },
  {
    id: "evidence-ben-sql",
    reportId: "report-ben-carter",
    applicationId: "application-ben-data",
    criteriaId: "criteria-data-sql",
    requirement: "SQL analysis",
    evidence: "Resume shows SQL used for weekly operational reports.",
    source: "Resume",
    confidence: "High",
    verificationNeeded: "None",
    status: { label: "Strong evidence", tone: "success" }
  },
  {
    id: "evidence-ben-storytelling",
    reportId: "report-ben-carter",
    applicationId: "application-ben-data",
    criteriaId: "criteria-data-storytelling",
    requirement: "Insight communication",
    evidence: "Charts were built for the team, but the audience and impact are unclear.",
    source: "Resume",
    confidence: "Medium",
    verificationNeeded: "Confirm stakeholder communication examples in the interview",
    status: { label: "Needs verification", tone: "warning" }
  },
  {
    id: "evidence-sofia-sql",
    reportId: "report-sofia-ruiz",
    applicationId: "application-sofia-data",
    criteriaId: "criteria-data-sql",
    requirement: "SQL analysis",
    evidence: "No SQL experience listed; reporting is done in Excel from exported files.",
    source: "Resume",
    confidence: "None",
    verificationNeeded: "Ask whether the candidate has any SQL experience",
    status: { label: "Missing evidence", tone: "danger" }
  },
  {
    id: "evidence-sofia-storytelling",
    reportId: "report-sofia-ruiz",
    applicationId: "application-sofia-data",
    criteriaId: "criteria-data-storytelling",
    requirement: "Insight communication",
    evidence: "Builds Excel reports and formats slides; stakeholder impact is unclear.",
    source: "Resume",
    confidence: "Low",
    verificationNeeded: "Confirm how insights are communicated",
    status: { label: "Needs verification", tone: "warning" }
  }
];

export const reviewDecisions: ReviewDecision[] = [
  {
    id: "decision-amanda-draft",
    reportId: "report-amanda-lee",
    applicationId: "application-amanda-frontend",
    recruiterId: "user-sarah-tan",
    decision: "Request more information",
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
  },
  {
    id: "audit-priya-report-generated",
    organizationId: "org-northstar",
    userId: "user-maya-chen",
    entityType: "candidate_report",
    entityId: "report-priya-shah",
    action: "evidence_report_generated",
    createdAt: "2026-05-21T08:18:00.000Z"
  },
  {
    id: "audit-daniel-report-generated",
    organizationId: "org-northstar",
    userId: "user-sarah-tan",
    entityType: "candidate_report",
    entityId: "report-daniel-morris",
    action: "evidence_report_generated",
    createdAt: "2026-05-21T08:21:00.000Z"
  },
  {
    id: "audit-elena-report-generated",
    organizationId: "org-northstar",
    userId: "user-maya-chen",
    entityType: "candidate_report",
    entityId: "report-elena-garcia",
    action: "evidence_report_generated",
    createdAt: "2026-05-22T11:05:00.000Z"
  },
  {
    id: "audit-david-report-generated",
    organizationId: "org-northstar",
    userId: "user-maya-chen",
    entityType: "candidate_report",
    entityId: "report-david-lim",
    action: "evidence_report_generated",
    createdAt: "2026-05-22T11:08:00.000Z"
  },
  {
    id: "audit-hannah-report-generated",
    organizationId: "org-northstar",
    userId: "user-maya-chen",
    entityType: "candidate_report",
    entityId: "report-hannah-cole",
    action: "evidence_report_generated",
    createdAt: "2026-05-22T11:11:00.000Z"
  },
  {
    id: "audit-nadia-report-generated",
    organizationId: "org-northstar",
    userId: "user-sarah-tan",
    entityType: "candidate_report",
    entityId: "report-nadia-hassan",
    action: "evidence_report_generated",
    createdAt: "2026-05-22T11:35:00.000Z"
  },
  {
    id: "audit-ben-report-generated",
    organizationId: "org-northstar",
    userId: "user-sarah-tan",
    entityType: "candidate_report",
    entityId: "report-ben-carter",
    action: "evidence_report_generated",
    createdAt: "2026-05-22T11:38:00.000Z"
  },
  {
    id: "audit-sofia-report-generated",
    organizationId: "org-northstar",
    userId: "user-sarah-tan",
    entityType: "candidate_report",
    entityId: "report-sofia-ruiz",
    action: "evidence_report_generated",
    createdAt: "2026-05-22T11:41:00.000Z"
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
  },
  {
    id: "batch-csm-20260522",
    jobId: "job-customer-success-manager",
    organizationId: "org-northstar",
    uploadedBy: "user-sarah-tan",
    status: "Report ready",
    totalFiles: 4,
    processedFiles: 3,
    failedFiles: 1,
    createdAt: "2026-05-22T05:00:00.000Z"
  },
  {
    id: "batch-data-20260522",
    jobId: "job-data-analyst",
    organizationId: "org-northstar",
    uploadedBy: "user-sarah-tan",
    status: "Report ready",
    totalFiles: 3,
    processedFiles: 3,
    failedFiles: 0,
    createdAt: "2026-05-22T05:30:00.000Z"
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
  },
  {
    id: "bulk-file-elena",
    batchId: "batch-csm-20260522",
    fileName: "Elena Garcia resume.pdf",
    fileUrl: "/mock-files/elena-garcia-resume.pdf",
    status: "Uploaded",
    candidateId: "candidate-elena-garcia",
    applicationId: "application-elena-csm",
    candidateName: "Elena Garcia",
    parsingStatus: "Parsed",
    evidenceReportStatus: "Report ready",
    createdAt: "2026-05-22T05:00:00.000Z"
  },
  {
    id: "bulk-file-david",
    batchId: "batch-csm-20260522",
    fileName: "David Lim CV.pdf",
    fileUrl: "/mock-files/david-lim-cv.pdf",
    status: "Uploaded",
    candidateId: "candidate-david-lim",
    applicationId: "application-david-csm",
    candidateName: "David Lim",
    parsingStatus: "Parsed",
    evidenceReportStatus: "Report ready",
    createdAt: "2026-05-22T05:00:00.000Z"
  },
  {
    id: "bulk-file-hannah",
    batchId: "batch-csm-20260522",
    fileName: "Hannah Cole resume.docx",
    fileUrl: "/mock-files/hannah-cole-resume.docx",
    status: "Uploaded",
    candidateId: "candidate-hannah-cole",
    applicationId: "application-hannah-csm",
    candidateName: "Hannah Cole",
    parsingStatus: "Parsed",
    evidenceReportStatus: "Report ready",
    createdAt: "2026-05-22T05:03:00.000Z"
  },
  {
    id: "bulk-file-marcus-vance",
    batchId: "batch-csm-20260522",
    fileName: "Marcus Vance resume.pdf",
    fileUrl: "/mock-files/marcus-vance-resume.pdf",
    status: "Uploaded",
    candidateId: "candidate-marcus-vance",
    applicationId: "application-marcus-csm",
    candidateName: "Marcus Vance",
    parsingStatus: "Parsed",
    evidenceReportStatus: "Failed",
    errorMessage: "Evidence report failed. Needs manual review before any decision.",
    createdAt: "2026-05-22T05:06:00.000Z"
  },
  {
    id: "bulk-file-nadia",
    batchId: "batch-data-20260522",
    fileName: "Nadia Hassan resume.pdf",
    fileUrl: "/mock-files/nadia-hassan-resume.pdf",
    status: "Uploaded",
    candidateId: "candidate-nadia-hassan",
    applicationId: "application-nadia-data",
    candidateName: "Nadia Hassan",
    parsingStatus: "Parsed",
    evidenceReportStatus: "Report ready",
    createdAt: "2026-05-22T05:30:00.000Z"
  },
  {
    id: "bulk-file-ben",
    batchId: "batch-data-20260522",
    fileName: "Ben Carter CV.pdf",
    fileUrl: "/mock-files/ben-carter-cv.pdf",
    status: "Uploaded",
    candidateId: "candidate-ben-carter",
    applicationId: "application-ben-data",
    candidateName: "Ben Carter",
    parsingStatus: "Parsed",
    evidenceReportStatus: "Report ready",
    createdAt: "2026-05-22T05:33:00.000Z"
  },
  {
    id: "bulk-file-sofia",
    batchId: "batch-data-20260522",
    fileName: "Sofia Ruiz resume.docx",
    fileUrl: "/mock-files/sofia-ruiz-resume.docx",
    status: "Uploaded",
    candidateId: "candidate-sofia-ruiz",
    applicationId: "application-sofia-data",
    candidateName: "Sofia Ruiz",
    parsingStatus: "Parsed",
    evidenceReportStatus: "Report ready",
    createdAt: "2026-05-22T05:36:00.000Z"
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
