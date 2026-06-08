import type { EvidenceLevel, EvidenceReportStatus, SummaryMetric } from "../types/hiring";

export type DemoResumeCategory =
  | "Strong frontend evidence"
  | "Good evidence, verification needed"
  | "Missing key evidence"
  | "Needs human review"
  | "Failed or unreadable resume"
  | "Wrong role"
  | "Incomplete resume"
  | "Over-claiming, needs verification";

export type DemoResumeRecord = {
  id: string;
  candidateName: string;
  resumeCategory: DemoResumeCategory;
  fileName: string;
  expectedEvidenceLevel: EvidenceLevel;
  actualEvidenceLevel: EvidenceLevel;
  reportStatus: EvidenceReportStatus;
  evidenceFound: string[];
  evidenceMissing: string[];
  verificationNotes: string[];
  recommendedRecruiterAction: "Evidence report ready" | "Human review required" | "Needs verification" | "Request more information";
};

export type DemoCategorySummary = {
  category: DemoResumeCategory;
  count: number;
  expectedOutcomeMatches: number;
  humanReviewRequired: number;
};

export type DemoTestLabViewModel = {
  companyName: string;
  jobTitle: string;
  testSetName: string;
  testSetDescription: string;
  requiredCategories: DemoResumeCategory[];
  metrics: SummaryMetric[];
  categorySummaries: DemoCategorySummary[];
  resumes: DemoResumeRecord[];
};

type DemoScenario = {
  category: DemoResumeCategory;
  count: number;
  expectedEvidenceLevel: EvidenceLevel;
  mismatchEvery?: number;
  mismatchEvidenceLevel?: EvidenceLevel;
  evidenceFound: string[];
  evidenceMissing: string[];
  verificationNotes: string[];
  recommendedRecruiterAction: DemoResumeRecord["recommendedRecruiterAction"];
};

const requiredCategories: DemoResumeCategory[] = [
  "Strong frontend evidence",
  "Good evidence, verification needed",
  "Missing key evidence",
  "Needs human review",
  "Failed or unreadable resume",
  "Wrong role",
  "Incomplete resume",
  "Over-claiming, needs verification"
];

const firstNames = [
  "Aisha",
  "Ben",
  "Clara",
  "Dev",
  "Elena",
  "Farah",
  "Gabriel",
  "Hana",
  "Ivan",
  "Jia",
  "Kai",
  "Lina",
  "Maya",
  "Noah",
  "Olivia"
];

const lastNames = [
  "Tan",
  "Lee",
  "Patel",
  "Wong",
  "Chen",
  "Garcia",
  "Morris",
  "Shah",
  "Lim",
  "Ng",
  "Rao",
  "Khan"
];

const demoScenarios: DemoScenario[] = [
  {
    category: "Strong frontend evidence",
    count: 12,
    expectedEvidenceLevel: "Strong evidence",
    evidenceFound: ["Production React delivery", "Accessible UI work", "Cross-functional release notes"],
    evidenceMissing: [],
    verificationNotes: ["Confirm project ownership in interview"],
    recommendedRecruiterAction: "Evidence report ready"
  },
  {
    category: "Good evidence, verification needed",
    count: 12,
    expectedEvidenceLevel: "Good evidence, verification needed",
    evidenceFound: ["React project evidence", "Design collaboration", "Some deployment exposure"],
    evidenceMissing: ["Direct AWS ownership detail"],
    verificationNotes: ["Ask for one production deployment example"],
    recommendedRecruiterAction: "Needs verification"
  },
  {
    category: "Missing key evidence",
    count: 9,
    expectedEvidenceLevel: "Missing key evidence",
    evidenceFound: ["General JavaScript experience"],
    evidenceMissing: ["Production React ownership", "Role-related collaboration", "Deployment evidence"],
    verificationNotes: ["Check whether resume is missing project detail"],
    recommendedRecruiterAction: "Request more information"
  },
  {
    category: "Needs human review",
    count: 8,
    expectedEvidenceLevel: "Needs human review",
    evidenceFound: ["Mixed technical evidence", "Ambiguous seniority claims"],
    evidenceMissing: ["Clear scope of responsibility"],
    verificationNotes: ["Recruiter review required before using evidence in decision notes"],
    recommendedRecruiterAction: "Human review required"
  },
  {
    category: "Failed or unreadable resume",
    count: 5,
    expectedEvidenceLevel: "Report failed",
    evidenceFound: [],
    evidenceMissing: ["Readable resume text"],
    verificationNotes: ["Ask candidate or recruiter for a readable PDF or DOCX"],
    recommendedRecruiterAction: "Request more information"
  },
  {
    category: "Wrong role",
    count: 5,
    expectedEvidenceLevel: "Needs human review",
    evidenceFound: ["Customer support or operations background"],
    evidenceMissing: ["Frontend development evidence"],
    verificationNotes: ["Confirm whether this resume belongs to the frontend role"],
    recommendedRecruiterAction: "Human review required"
  },
  {
    category: "Incomplete resume",
    count: 5,
    expectedEvidenceLevel: "Missing key evidence",
    evidenceFound: ["Candidate name and recent title"],
    evidenceMissing: ["Project history", "Skills detail", "Employment dates"],
    verificationNotes: ["Request more information before evidence review"],
    recommendedRecruiterAction: "Request more information"
  },
  {
    category: "Over-claiming, needs verification",
    count: 4,
    expectedEvidenceLevel: "Needs human review",
    mismatchEvery: 4,
    mismatchEvidenceLevel: "Good evidence, verification needed",
    evidenceFound: ["Broad claims about ownership", "Several frontend keywords"],
    evidenceMissing: ["Specific shipped examples", "Named outcomes", "Clear team role"],
    verificationNotes: ["Separate claimed skills from job-related evidence"],
    recommendedRecruiterAction: "Human review required"
  }
];

function getCandidateName(index: number) {
  return `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]} ${String(index + 1).padStart(2, "0")}`;
}

function getReportStatus(evidenceLevel: EvidenceLevel): EvidenceReportStatus {
  if (evidenceLevel === "Report failed") return "Failed";
  if (evidenceLevel === "Needs human review") return "Needs manual review";
  return "Report ready";
}

function buildDemoResumes(): DemoResumeRecord[] {
  const records: DemoResumeRecord[] = [];

  for (const scenario of demoScenarios) {
    for (let index = 0; index < scenario.count; index += 1) {
      const globalIndex = records.length;
      const hasExpectedMismatch = Boolean(
        scenario.mismatchEvery && scenario.mismatchEvidenceLevel && (index + 1) % scenario.mismatchEvery === 0
      );
      const actualEvidenceLevel = hasExpectedMismatch ? scenario.mismatchEvidenceLevel! : scenario.expectedEvidenceLevel;
      const candidateName = getCandidateName(globalIndex);

      records.push({
        id: `demo-resume-${String(globalIndex + 1).padStart(2, "0")}`,
        candidateName,
        resumeCategory: scenario.category,
        fileName: `${candidateName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-resume.pdf`,
        expectedEvidenceLevel: scenario.expectedEvidenceLevel,
        actualEvidenceLevel,
        reportStatus: getReportStatus(actualEvidenceLevel),
        evidenceFound: scenario.evidenceFound,
        evidenceMissing: scenario.evidenceMissing,
        verificationNotes: scenario.verificationNotes,
        recommendedRecruiterAction: scenario.recommendedRecruiterAction
      });
    }
  }

  return records;
}

function getCategorySummaries(resumes: DemoResumeRecord[]): DemoCategorySummary[] {
  return requiredCategories.map((category) => {
    const categoryResumes = resumes.filter((resume) => resume.resumeCategory === category);

    return {
      category,
      count: categoryResumes.length,
      expectedOutcomeMatches: categoryResumes.filter((resume) => resume.actualEvidenceLevel === resume.expectedEvidenceLevel).length,
      humanReviewRequired: categoryResumes.filter((resume) => resume.recommendedRecruiterAction === "Human review required").length
    };
  });
}

function getDemoMetrics(resumes: DemoResumeRecord[]): SummaryMetric[] {
  const expectedOutcomeMatches = resumes.filter((resume) => resume.actualEvidenceLevel === resume.expectedEvidenceLevel).length;
  const reportReadyRecords = resumes.filter((resume) => resume.reportStatus === "Report ready").length;
  const humanReviewRecords = resumes.filter((resume) => resume.recommendedRecruiterAction === "Human review required").length;
  const missingEvidenceRecords = resumes.filter((resume) => resume.evidenceMissing.length > 0).length;

  return [
    { label: "Synthetic resumes", value: String(resumes.length), detail: "Controlled records across eight evidence scenarios" },
    { label: "Report-ready records", value: String(reportReadyRecords), detail: "Evidence report ready for recruiter review" },
    { label: "Human review records", value: String(humanReviewRecords), detail: "Human review required before decision notes" },
    { label: "Missing-evidence records", value: String(missingEvidenceRecords), detail: "Records with evidence missing or verification needed" },
    {
      label: "Expected outcome match",
      value: String(expectedOutcomeMatches),
      detail: `${resumes.length - expectedOutcomeMatches} records flagged for demo review`
    }
  ];
}

export function getDemoTestLabViewModel(): DemoTestLabViewModel {
  const resumes = buildDemoResumes();

  return {
    companyName: "Northstar Digital",
    jobTitle: "Frontend Developer",
    testSetName: "Frontend evidence pilot set",
    testSetDescription:
      "60 synthetic resumes are grouped into known evidence scenarios so recruiters can compare expected evidence outcomes with observed grouping.",
    requiredCategories,
    metrics: getDemoMetrics(resumes),
    categorySummaries: getCategorySummaries(resumes),
    resumes
  };
}
