/**
 * Demo upload engine.
 *
 * Real CV parsing / AI analysis is NOT built yet. To let the bulk upload feel
 * end-to-end for manual testing, this engine generates a *scripted* evidence
 * report for each uploaded sample file: it derives the file's category (from the
 * bundled bulk manifest, the curated filename suffix, or a deterministic fallback)
 * and builds a report against the real job criteria. Reports are clearly labelled
 * as demo previews in the UI and stored in sessionStorage so the /reports route can
 * open them. This is demo scaffolding, not production analysis.
 */
import { demoBulkManifest } from "../data/demoBulkManifest";
import { jobCriteria, jobs, organizations } from "../data/mockHiringData";
import type {
  BulkUploadFile,
  EvidenceItem,
  EvidenceReport,
  FairnessCheck,
  ReviewDecision,
  StatusBadge,
  SummaryMetric
} from "../types/hiring";
import { validateHumanReviewDecision } from "./reportService";
import { validateUploadFile } from "./uploadService";

export type DemoCategory =
  | "strong"
  | "good-verify"
  | "missing-evidence"
  | "over-claiming"
  | "wrong-role"
  | "incomplete";

const KNOWN_CATEGORIES: DemoCategory[] = [
  "strong",
  "good-verify",
  "missing-evidence",
  "over-claiming",
  "wrong-role",
  "incomplete"
];

const DECISION_OPTIONS: ReviewDecision["decision"][] = [
  "Shortlist for interview",
  "Hold for review",
  "Not proceeding",
  "Request more information"
];

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

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function demoReportIdForFile(fileName: string): string {
  return `demo-upload-${slugify(fileName)}`;
}

export function isDemoReportId(reportId: string): boolean {
  return reportId.startsWith("demo-upload-");
}

/** Curated filename suffix (e.g. `..._STRONG.pdf`) -> canonical category. */
function categoryFromCuratedSuffix(fileName: string): DemoCategory | undefined {
  const match = fileName.match(/_(STRONG|GOOD-verify|MISSING-evidence|OVERCLAIMING|WRONG-role|INCOMPLETE)\.[^.]+$/i);
  if (!match) return undefined;
  const token = match[1].toLowerCase();
  if (token === "strong") return "strong";
  if (token === "good-verify") return "good-verify";
  if (token === "missing-evidence") return "missing-evidence";
  if (token === "overclaiming") return "over-claiming";
  if (token === "wrong-role") return "wrong-role";
  if (token === "incomplete") return "incomplete";
  return undefined;
}

/** Deterministic fallback category for any unknown file (e.g. a real user CV). */
function fallbackCategory(fileName: string): DemoCategory {
  let hash = 0;
  for (let i = 0; i < fileName.length; i++) hash = (hash * 31 + fileName.charCodeAt(i)) >>> 0;
  // Weighted toward realistic outcomes, lighter on the edge cases.
  const weighted: DemoCategory[] = [
    "strong",
    "strong",
    "good-verify",
    "good-verify",
    "good-verify",
    "missing-evidence",
    "missing-evidence",
    "over-claiming"
  ];
  return weighted[hash % weighted.length];
}

export function categorizeUploadedFile(fileName: string): DemoCategory {
  const manifestEntry = demoBulkManifest[fileName];
  if (manifestEntry && KNOWN_CATEGORIES.includes(manifestEntry.category as DemoCategory)) {
    return manifestEntry.category as DemoCategory;
  }
  return categoryFromCuratedSuffix(fileName) ?? fallbackCategory(fileName);
}

function candidateNameFromFile(fileName: string): string {
  const manifestEntry = demoBulkManifest[fileName];
  if (manifestEntry?.name) return manifestEntry.name;

  let base = fileName.replace(/\.[^.]+$/, "");
  base = base.replace(/^(Frontend|CSM|Data)[_-]/i, "");
  base = base.replace(/[_-](STRONG|GOOD-verify|MISSING-evidence|OVERCLAIMING|WRONG-role|INCOMPLETE)$/i, "");
  base = base.replace(/[_-]?Resume$/i, "");
  base = base.replace(/[_-]+/g, " ").trim();
  return base || "Uploaded candidate";
}

function resolveJobId(fileName: string, fallbackJobId: string): string {
  const manifestEntry = demoBulkManifest[fileName];
  if (manifestEntry?.job) {
    const byTitle = jobs.find((job) => job.title === manifestEntry.job);
    if (byTitle) return byTitle.id;
  }
  return fallbackJobId;
}

type CategoryProfile = {
  evidenceLevel: EvidenceItem["status"]["label"] | string;
  reportStatus: EvidenceReport["status"];
  evidenceFor: (label: string, index: number) => Omit<EvidenceItem, "id" | "reportId" | "applicationId" | "criteriaId" | "requirement">;
  summary: (jobTitle: string) => SummaryMetric[];
  missingEvidence: string[];
  interviewQuestions: (firstRequirement: string) => string[];
  recruiterNotes: string[];
};

const evidence = (
  text: string,
  source: EvidenceItem["source"],
  confidence: EvidenceItem["confidence"],
  verificationNeeded: string,
  status: StatusBadge
) => ({ evidence: text, source, confidence, verificationNeeded, status });

const PROFILES: Record<DemoCategory, CategoryProfile> = {
  strong: {
    evidenceLevel: "Strong evidence",
    reportStatus: "Evidence report ready",
    evidenceFor: (label) =>
      evidence(
        `Resume shows clear, relevant experience for ${label}.`,
        "Resume",
        "High",
        "None",
        { label: "Strong evidence", tone: "success" }
      ),
    summary: () => [
      { label: "Evidence match", value: "Strong evidence", detail: "Every required criterion has job-related evidence.", tone: "success" },
      { label: "Verification needed", value: "Confirm depth", detail: "Confirm ownership depth during the interview.", tone: "warning" },
      { label: "Missing evidence", value: "No major gaps", detail: "All required criteria are supported by evidence.", tone: "success" },
      { label: "Human decision", value: "Decision reason required", detail: "Final decisions stay with the hiring team.", tone: "info" }
    ],
    missingEvidence: ["No major evidence gaps were found. Confirm ownership depth during the interview."],
    interviewQuestions: (first) => [
      `Walk us through a recent example that demonstrates ${first}.`,
      "Which parts of that work did you personally own end to end?",
      "How did you collaborate with other teams on it?"
    ],
    recruiterNotes: [
      "Strong, well-evidenced match for the role's criteria.",
      "Confirm ownership depth, then consider shortlisting for interview."
    ]
  },
  "good-verify": {
    evidenceLevel: "Good evidence, verification needed",
    reportStatus: "Human review required",
    evidenceFor: (label, index) =>
      index === 0
        ? evidence(`Resume shows solid evidence for ${label}.`, "Resume", "High", "None", { label: "Strong evidence", tone: "success" })
        : evidence(
            `Resume mentions ${label}, but the depth should be confirmed.`,
            "Resume",
            "Medium",
            `Confirm ${label} in the interview`,
            { label: "Needs verification", tone: "warning" }
          ),
    summary: () => [
      { label: "Evidence match", value: "Good evidence, verification needed", detail: "Core evidence is present; some areas need confirmation.", tone: "success" },
      { label: "Verification needed", value: "Some criteria to confirm", detail: "A few criteria need interview follow-up.", tone: "warning" },
      { label: "Missing evidence", value: "Minor gaps", detail: "No critical gaps, but confirm the flagged items.", tone: "warning" },
      { label: "Human decision", value: "Decision reason required", detail: "Final decisions stay with the hiring team.", tone: "info" }
    ],
    missingEvidence: ["Some criteria have only partial evidence; confirm the flagged items during the interview."],
    interviewQuestions: (first) => [
      `Tell us more about your hands-on experience with ${first}.`,
      "Which parts did you own versus support?",
      "Can you give a specific, measurable example?"
    ],
    recruiterNotes: [
      "Promising evidence overall.",
      "Verify the flagged criteria before moving past interview review."
    ]
  },
  "missing-evidence": {
    evidenceLevel: "Missing key evidence",
    reportStatus: "Human review required",
    evidenceFor: (label) =>
      evidence(
        `No clear evidence found for ${label}.`,
        "Resume",
        "Low",
        `Ask the candidate directly about ${label}`,
        { label: "Missing evidence", tone: "danger" }
      ),
    summary: () => [
      { label: "Evidence match", value: "Missing key evidence", detail: "Required job evidence was not found in the resume.", tone: "danger" },
      { label: "Verification needed", value: "Multiple gaps", detail: "Several criteria need to be asked about directly.", tone: "warning" },
      { label: "Missing evidence", value: "Key evidence missing", detail: "Core requirements are not evidenced.", tone: "danger" },
      { label: "Human decision", value: "Decision reason required", detail: "Final decisions stay with the hiring team.", tone: "info" }
    ],
    missingEvidence: [
      "Required job-related evidence was not found in the resume.",
      "Ask the candidate directly whether they have this experience."
    ],
    interviewQuestions: (first) => [
      `Do you have direct experience with ${first}? Please give an example.`,
      "What relevant projects are not captured on your resume?"
    ],
    recruiterNotes: [
      "Key evidence appears to be missing.",
      "Confirm directly before deciding; do not assume."
    ]
  },
  "over-claiming": {
    evidenceLevel: "Needs human review",
    reportStatus: "Human review required",
    evidenceFor: (label) =>
      evidence(
        `Resume claims strong ${label}, but the specifics are vague and need verification.`,
        "Resume",
        "Low",
        `Verify the claim about ${label} with concrete examples`,
        { label: "Needs verification", tone: "warning" }
      ),
    summary: () => [
      { label: "Evidence match", value: "Needs human review", detail: "Claims are broad; concrete proof is thin.", tone: "info" },
      { label: "Verification needed", value: "Claims need verification", detail: "Ask for specific, measurable examples.", tone: "warning" },
      { label: "Missing evidence", value: "Specifics missing", detail: "Strong claims without supporting detail.", tone: "danger" },
      { label: "Human decision", value: "Decision reason required", detail: "Final decisions stay with the hiring team.", tone: "info" }
    ],
    missingEvidence: [
      "The resume makes strong claims without concrete, verifiable detail.",
      "Ask for specific, measurable examples for each claim."
    ],
    interviewQuestions: (first) => [
      `Your resume claims significant ${first}. Walk through one specific example with numbers.`,
      "What was your exact role versus the team's?"
    ],
    recruiterNotes: [
      "Claims look strong but unproven.",
      "Probe for specifics before relying on the resume."
    ]
  },
  "wrong-role": {
    evidenceLevel: "Missing key evidence",
    reportStatus: "Human review required",
    evidenceFor: (label) =>
      evidence(
        `Resume describes a different role; little evidence for ${label}.`,
        "Resume",
        "None",
        `Confirm whether the candidate has any ${label} experience`,
        { label: "Missing evidence", tone: "danger" }
      ),
    summary: () => [
      { label: "Evidence match", value: "Missing key evidence", detail: "The resume appears to be for a different role.", tone: "danger" },
      { label: "Verification needed", value: "Role mismatch", detail: "Confirm any transferable experience.", tone: "warning" },
      { label: "Missing evidence", value: "Role-relevant evidence missing", detail: "Little job-related evidence found.", tone: "danger" },
      { label: "Human decision", value: "Decision reason required", detail: "Final decisions stay with the hiring team.", tone: "info" }
    ],
    missingEvidence: [
      "The resume appears to be for a different role; little job-related evidence was found.",
      "Confirm whether the candidate has any directly relevant experience."
    ],
    interviewQuestions: (first) => [
      `This role needs ${first}. What transferable experience do you have?`,
      "Why are you applying for this role specifically?"
    ],
    recruiterNotes: [
      "Background looks like a different role.",
      "Only proceed if there is transferable evidence worth verifying."
    ]
  },
  incomplete: {
    evidenceLevel: "Needs human review",
    reportStatus: "Human review required",
    evidenceFor: (label) =>
      evidence(
        `Resume is incomplete; ${label} could not be assessed.`,
        "Resume",
        "None",
        `Request a complete resume to assess ${label}`,
        { label: "Human review required", tone: "info" }
      ),
    summary: () => [
      { label: "Evidence match", value: "Needs human review", detail: "The resume is incomplete and could not be assessed.", tone: "info" },
      { label: "Verification needed", value: "Cannot assess yet", detail: "Request a complete resume before reviewing.", tone: "warning" },
      { label: "Missing evidence", value: "Resume incomplete", detail: "Key sections were not provided.", tone: "danger" },
      { label: "Human decision", value: "Decision reason required", detail: "Final decisions stay with the hiring team.", tone: "info" }
    ],
    missingEvidence: [
      "The resume is incomplete; key sections were not provided.",
      "Request a complete resume before assessing evidence."
    ],
    interviewQuestions: () => [
      "Could you send a complete resume so we can review your experience?",
      "Which roles and skills were left off the version we received?"
    ],
    recruiterNotes: [
      "Resume is incomplete — cannot assess yet.",
      "Request a full resume before any decision."
    ]
  }
};

function nowIso(): string {
  return new Date().toISOString();
}

export function generateDemoEvidenceReport(fileName: string, fallbackJobId: string): EvidenceReport {
  const category = categorizeUploadedFile(fileName);
  const profile = PROFILES[category];
  const jobId = resolveJobId(fileName, fallbackJobId);
  const job = jobs.find((item) => item.id === jobId) ?? jobs[0];
  const company = organizations[0];
  const criteria = jobCriteria.filter((item) => item.jobId === job.id);
  const slug = slugify(fileName);
  const reportId = demoReportIdForFile(fileName);
  const candidateName = candidateNameFromFile(fileName);
  const created = nowIso();
  const fileType: "pdf" | "docx" = /\.pdf$/i.test(fileName) ? "pdf" : "docx";

  const requirementEvidence: EvidenceItem[] = criteria.map((criterion, index) => ({
    id: `demo-ev-${slug}-${index}`,
    reportId,
    applicationId: `demo-app-${slug}`,
    criteriaId: criterion.id,
    requirement: criterion.label,
    ...profile.evidenceFor(criterion.label, index)
  }));

  const firstRequirement = criteria[0]?.label ?? "the role's core skill";

  return {
    id: reportId,
    reportId,
    company,
    candidate: {
      id: `demo-cand-${slug}`,
      organizationId: company.id,
      name: candidateName,
      source: "bulk_upload",
      createdAt: created
    },
    application: {
      id: `demo-app-${slug}`,
      organizationId: company.id,
      jobId: job.id,
      candidateId: `demo-cand-${slug}`,
      status: "report_ready",
      appliedAt: created
    },
    jobRole: job,
    status: profile.reportStatus,
    generatedAt: "Uploaded just now (demo preview)",
    evidenceSummary: profile.summary(job.title),
    requirementEvidence,
    missingEvidence: profile.missingEvidence,
    verificationNeeded: requirementEvidence
      .filter((item) => item.verificationNeeded && item.verificationNeeded !== "None")
      .map((item) => `${item.requirement}: ${item.verificationNeeded}`),
    suggestedInterviewQuestions: profile.interviewQuestions(firstRequirement),
    recruiterNotes: profile.recruiterNotes,
    documentSources: [
      {
        id: `demo-doc-${slug}`,
        applicationId: `demo-app-${slug}`,
        candidateId: `demo-cand-${slug}`,
        fileName,
        fileUrl: "#",
        fileType,
        uploadStatus: "Uploaded",
        parsingStatus: "Parsed",
        createdAt: created
      }
    ],
    fairnessCheck: standardFairness,
    humanDecision: {
      options: DECISION_OPTIONS,
      reasonRequired: true,
      reminder: "The system does not make the final hiring decision. A recruiter must enter a job-related decision reason."
    },
    auditTrailPreview: [
      {
        id: `demo-audit-${slug}`,
        organizationId: company.id,
        userId: "user-sarah-tan",
        entityType: "candidate_report",
        entityId: reportId,
        action: "evidence_report_generated",
        createdAt: created
      }
    ]
  };
}

// --- sessionStorage-backed store so the /reports route can open generated reports ---

const STORE_PREFIX = "demoReport:";

function hasSession(): boolean {
  return typeof sessionStorage !== "undefined";
}

export function saveDemoReport(report: EvidenceReport): void {
  if (!hasSession()) return;
  try {
    sessionStorage.setItem(STORE_PREFIX + report.reportId, JSON.stringify(report));
  } catch {
    // storage full / unavailable — demo reports are best-effort only.
  }
}

export function getDemoReport(reportId: string): EvidenceReport | undefined {
  if (!hasSession()) return undefined;
  const raw = sessionStorage.getItem(STORE_PREFIX + reportId);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as EvidenceReport;
  } catch {
    return undefined;
  }
}

export type SaveDemoDecisionResult = { valid: boolean; message?: string; report?: EvidenceReport };

export function saveDemoHumanReviewDecision(input: {
  reportId: string;
  decision: ReviewDecision["decision"] | "";
  reason: string;
  userId: string;
  timestamp: string;
}): SaveDemoDecisionResult {
  const validation = validateHumanReviewDecision(input.decision, input.reason);
  if (!validation.valid) return validation;

  const report = getDemoReport(input.reportId);
  if (!report) return { valid: false, message: "Demo report not found in this session." };

  const updated: EvidenceReport = {
    ...report,
    status: "Recruiter decision recorded",
    auditTrailPreview: [
      ...report.auditTrailPreview,
      {
        id: `demo-audit-decision-${input.timestamp}`,
        organizationId: report.company.id,
        userId: input.userId,
        entityType: "human_review_decision",
        entityId: report.id,
        action: "human_review_decision_saved",
        createdAt: input.timestamp
      }
    ]
  };
  saveDemoReport(updated);
  return { valid: true, report: updated };
}

// --- upload-row factory used by the bulk upload panel ---

export function createDemoUploadFile(
  fileName: string,
  fileSize: number,
  index: number,
  fallbackJobId: string
): BulkUploadFile {
  const validation = validateUploadFile({ name: fileName, size: fileSize });
  const baseId = slugify(fileName) || `resume-${index + 1}`;

  if (!validation.accepted) {
    const errorMessage =
      validation.message === "File too large"
        ? "File too large. Maximum size is 10 MB."
        : "Unsupported file type. Upload PDF or DOCX resumes only.";
    return {
      id: `demo-${baseId}`,
      batchId: "demo-upload-batch",
      fileName,
      fileUrl: "",
      status: "Failed",
      parsingStatus: "Failed",
      evidenceReportStatus: "Failed",
      errorMessage,
      createdAt: nowIso()
    };
  }

  const report = generateDemoEvidenceReport(fileName, fallbackJobId);
  saveDemoReport(report);

  return {
    id: `demo-${baseId}`,
    batchId: "demo-upload-batch",
    fileName,
    fileUrl: `/local-upload/${encodeURIComponent(fileName)}`,
    status: "Uploaded",
    candidateId: report.candidate.id,
    applicationId: report.application.id,
    candidateName: report.candidate.name,
    parsingStatus: "Parsed",
    evidenceReportStatus: "Report ready",
    reportPath: `/reports/${report.reportId}`,
    createdAt: nowIso()
  };
}
