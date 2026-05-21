import type { CandidateReport, DashboardMetric, JobRow, ReviewQueueItem } from "../types/hiring";

export const candidateReport: CandidateReport = {
  candidate: {
    name: "Amanda Lee",
    role: "Frontend Developer",
    company: "Northstar Digital",
    appliedDate: "21 May 2026",
    reportGenerated: "Today, 4:15 PM",
    reportId: "HER-2026-0521-AL",
    currentStatus: "Human review required",
    assignedRecruiter: "Sarah Tan",
    consentStatus: "Consent recorded",
    questionnaireStatus: "Completed",
    resumeLabel: "Amanda Lee resume.pdf",
    statusBadges: [
      { label: "Evidence report ready", tone: "success" },
      { label: "Human review required", tone: "info" },
      { label: "Verification needed", tone: "warning" }
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
  evidenceRows: [
    {
      requirement: "React production experience",
      evidence: "Resume shows two shipped dashboard projects using React",
      source: "Resume",
      confidence: "High",
      verificationNeeded: "Ask architecture question",
      status: { label: "Strong evidence", tone: "success" }
    },
    {
      requirement: "AWS deployment work",
      evidence: "No clear deployment ownership found",
      source: "Resume",
      confidence: "Low",
      verificationNeeded: "Ask candidate directly",
      status: { label: "Needs verification", tone: "warning" }
    },
    {
      requirement: "Role-related collaboration",
      evidence: "Questionnaire answer mentions cross-functional planning",
      source: "Questionnaire",
      confidence: "Medium",
      verificationNeeded: "Ask stakeholder communication follow-up",
      status: { label: "Human review required", tone: "info" }
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
  recruiterNotes: [
    "Evidence is promising for React delivery.",
    "Verify AWS ownership before moving past interview review."
  ],
  decisionOptions: ["Shortlist", "Invite to interview", "Hold", "Needs more evidence", "Reject"]
};

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
    role: "Product Manager",
    status: { label: "Needs verification", tone: "warning" },
    due: "Tomorrow",
    reportPath: "/reports/candidate-evidence"
  },
  {
    candidate: "Priya Shah",
    role: "Data Analyst",
    status: { label: "Evidence report ready", tone: "success" },
    due: "23 May 2026",
    reportPath: "/reports/candidate-evidence"
  }
];

export const recentJobs: JobRow[] = [
  {
    title: "Frontend Developer",
    department: "Product Engineering",
    candidates: "14 candidates",
    evidenceStatus: { label: "3 reports ready", tone: "success" },
    lastUpdated: "Today"
  },
  {
    title: "Customer Success Manager",
    department: "Revenue",
    candidates: "9 candidates",
    evidenceStatus: { label: "Needs verification", tone: "warning" },
    lastUpdated: "20 May 2026"
  },
  {
    title: "Data Analyst",
    department: "Operations",
    candidates: "11 candidates",
    evidenceStatus: { label: "Human review required", tone: "info" },
    lastUpdated: "19 May 2026"
  }
];

export const landingFeatures = [
  "Evidence matrix by job requirement",
  "Missing evidence and verification prompts",
  "Suggested interview questions",
  "Fairness wording checks",
  "Recruiter decision notes and audit trail"
];
