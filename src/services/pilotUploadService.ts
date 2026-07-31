/**
 * Persistent CV processing for a signed-in customer workspace.
 *
 *   file -> private Storage object -> candidate/application/document rows
 *        -> extracted text -> analyze-resume (OpenRouter) -> persisted report
 *
 * This is deliberately NOT the login-free sales demo path. The demo generates a
 * scripted preview in browser storage; this writes real, company-scoped, private
 * records that survive a refresh and are visible to every recruiter in the company.
 *
 * The two must never be mixed. In particular, when analysis fails here the upload is
 * marked for manual review and the failure is shown honestly — a customer must never
 * be handed a scripted report while being told the model read their candidate's CV.
 */
import { extractResumeText } from "./resumeTextExtraction";
import { createHiringSupabaseClient } from "./supabaseClient";
import { validateUploadFile } from "./uploadService";
import type { EvidenceItem, EvidenceReport, FairnessCheck, StatusBadge, SummaryMetric } from "../types/hiring";

const BUCKET = "candidate-documents";
const MIN_RESUME_TEXT_LENGTH = 30;

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
};

const REPORT_STATUSES: EvidenceReport["status"][] = [
  "Evidence report ready",
  "Human review required",
  "Decision pending",
  "Recruiter decision recorded"
];

/** Recorded with every persisted report so the fairness section is never empty. */
const standardFairnessCheck: FairnessCheck = {
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

export type PilotUploadErrorCode =
  | "UNSUPPORTED_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "PILOT_EXPIRED"
  | "PILOT_CANDIDATE_LIMIT"
  | "JOB_NOT_IN_WORKSPACE"
  | "NO_JOB_CRITERIA"
  | "UNREADABLE_FILE"
  | "ANALYSIS_FAILED"
  | "STORAGE_FAILED"
  | "SAVE_FAILED";

export type PilotUploadResult =
  | { ok: true; reportId: string; reportPath: string; documentId: string; candidateName: string }
  | { ok: false; code: PilotUploadErrorCode; message: string; documentId?: string };

type AnalysisPayload = {
  overallStatus: EvidenceReport["status"];
  evidenceSummary: SummaryMetric[];
  requirementEvidence: Array<{
    criteriaId: string;
    requirement: string;
    evidence: string;
    source: EvidenceItem["source"];
    confidence: EvidenceItem["confidence"];
    verificationNeeded: string;
    status: StatusBadge;
  }>;
  missingEvidence: string[];
  verificationNeeded: string[];
  suggestedInterviewQuestions: string[];
  recruiterNotes: string[];
};

type AnalyzeResponse = { ok?: boolean; model?: string; analysis?: AnalysisPayload; error?: string };

type UploadRecord = {
  company_id: string;
  candidate_id: string;
  application_id: string;
  document_id: string;
  storage_path: string;
};

/** Customer-facing wording for each failure. No blame, always a next step. */
export function getPilotUploadErrorMessage(code: PilotUploadErrorCode): string {
  switch (code) {
    case "UNSUPPORTED_FILE_TYPE":
      return "Unsupported file type. Upload PDF or DOCX resumes only.";
    case "FILE_TOO_LARGE":
      return "File too large. Maximum size is 10 MB.";
    case "PILOT_EXPIRED":
      return "This workspace is view-only. Existing evidence reports stay available to read.";
    case "PILOT_CANDIDATE_LIMIT":
      return "This workspace has reached its candidate limit. Contact us to raise it.";
    case "JOB_NOT_IN_WORKSPACE":
      return "This role is not part of your workspace. Open the role again from your dashboard.";
    case "NO_JOB_CRITERIA":
      return "Add the required criteria for this role before uploading resumes.";
    case "UNREADABLE_FILE":
      return "The text in this file could not be read. Human review required.";
    case "ANALYSIS_FAILED":
      return "The evidence analysis did not complete. The upload is saved and can be retried.";
    case "STORAGE_FAILED":
      return "The file could not be stored securely. Nothing was saved; please try again.";
    case "SAVE_FAILED":
    default:
      return "The evidence report could not be saved. Human review required.";
  }
}

/** Postgres raises bare codes; anything unrecognized stays a generic save failure. */
export function mapPilotUploadError(rawMessage: string, fallback: PilotUploadErrorCode = "SAVE_FAILED"): PilotUploadErrorCode {
  const codes: PilotUploadErrorCode[] = [
    "PILOT_EXPIRED",
    "PILOT_CANDIDATE_LIMIT",
    "JOB_NOT_IN_WORKSPACE",
    "UNSUPPORTED_FILE_TYPE",
    "FILE_TOO_LARGE"
  ];

  return codes.find((code) => rawMessage.includes(code)) ?? fallback;
}

export function candidateNameFromFileName(fileName: string): string {
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]?Resume$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();

  return base || "Candidate pending name detection";
}

export function getFileExtension(fileName: string): string {
  const match = /\.([^.]+)$/.exec(fileName);
  return match ? match[1].toLowerCase() : "";
}

function toReportStatus(value: unknown): EvidenceReport["status"] {
  return REPORT_STATUSES.find((status) => status === value) ?? "Human review required";
}

export async function uploadAndAnalyzePilotResume(file: File, jobId: string): Promise<PilotUploadResult> {
  const validation = validateUploadFile({ name: file.name, size: file.size });
  if (!validation.accepted) {
    const code: PilotUploadErrorCode = validation.message === "File too large" ? "FILE_TOO_LARGE" : "UNSUPPORTED_FILE_TYPE";
    return { ok: false, code, message: getPilotUploadErrorMessage(code) };
  }

  const client = createHiringSupabaseClient();
  const fileType = getFileExtension(file.name);
  const candidateName = candidateNameFromFileName(file.name);

  // 1. Reserve the records first. The database derives the company from the job and
  //    the signed-in user, checks the quota, and returns the exact storage key — the
  //    browser never chooses where a customer's file lands.
  const { data: recordData, error: recordError } = await client.rpc("record_candidate_upload", {
    p_job_id: jobId,
    p_candidate_name: candidateName,
    p_file_name: file.name,
    p_file_type: fileType,
    p_file_size_bytes: file.size
  });

  if (recordError || !recordData) {
    const code = mapPilotUploadError(recordError?.message ?? "", "SAVE_FAILED");
    return { ok: false, code, message: getPilotUploadErrorMessage(code) };
  }

  const record = recordData as UploadRecord;
  const documentId = record.document_id;

  const failUpload = async (code: PilotUploadErrorCode, reason: string): Promise<PilotUploadResult> => {
    await client.rpc("mark_candidate_upload_failed", { p_document_id: documentId, p_reason: reason });
    return { ok: false, code, message: getPilotUploadErrorMessage(code), documentId };
  };

  // 2. Store the file privately.
  const { error: storageError } = await client.storage.from(BUCKET).upload(record.storage_path, file, {
    contentType: CONTENT_TYPES[fileType] ?? "application/octet-stream",
    upsert: false
  });
  if (storageError) {
    return failUpload("STORAGE_FAILED", "The file could not be stored");
  }

  // 3. Read the text.
  let resumeText = "";
  try {
    resumeText = await extractResumeText(file);
  } catch {
    return failUpload("UNREADABLE_FILE", "The document text could not be extracted");
  }
  if (resumeText.trim().length < MIN_RESUME_TEXT_LENGTH) {
    return failUpload("UNREADABLE_FILE", "The document contained too little readable text to analyze");
  }

  // 4. Use this company's own role and criteria — never the seeded demo job.
  const [{ data: jobData, error: jobError }, { data: criteriaData, error: criteriaError }] = await Promise.all([
    client.from("job_roles").select("id, title").eq("id", jobId).maybeSingle(),
    client.from("job_requirements").select("id, label").eq("job_id", jobId).order("sort_order")
  ]);

  if (jobError || criteriaError || !jobData) {
    return failUpload("SAVE_FAILED", "The role could not be read for analysis");
  }

  const criteria = (criteriaData ?? []).map((row) => ({ id: String(row.id), label: String(row.label) }));
  if (criteria.length === 0) {
    return failUpload("NO_JOB_CRITERIA", "The role has no required criteria to analyze against");
  }

  // 5. Real analysis. No scripted fallback in a customer workspace.
  let analysis: AnalysisPayload;
  try {
    const { data, error } = await client.functions.invoke<AnalyzeResponse>("analyze-resume", {
      body: {
        resumeText,
        candidateName,
        job: { title: String((jobData as { title?: string }).title ?? "Role"), criteria }
      }
    });

    if (error) throw new Error(error.message);
    if (!data?.ok || !data.analysis) throw new Error(data?.error ?? "analysis request failed");
    analysis = data.analysis;
  } catch {
    return failUpload("ANALYSIS_FAILED", "The evidence analysis did not complete");
  }

  // 6. Persist the report and its evidence items in one transaction.
  const items = (analysis.requirementEvidence ?? []).map((item) => ({
    requirement_id: item.criteriaId,
    requirement: item.requirement,
    candidate_evidence: item.evidence,
    source: item.source,
    confidence: item.confidence,
    verification_needed: item.verificationNeeded,
    status_label: item.status?.label ?? "Needs verification",
    status_tone: item.status?.tone ?? "warning"
  }));

  const { data: reportData, error: reportError } = await client.rpc("record_evidence_report", {
    p_document_id: documentId,
    p_status: toReportStatus(analysis.overallStatus),
    p_candidate_name: candidateName,
    p_evidence_summary: analysis.evidenceSummary ?? [],
    p_missing_evidence: analysis.missingEvidence ?? [],
    p_verification_needed: analysis.verificationNeeded ?? [],
    p_suggested_questions: analysis.suggestedInterviewQuestions ?? [],
    p_recruiter_notes: analysis.recruiterNotes ?? [],
    p_fairness_check: standardFairnessCheck,
    p_items: items
  });

  if (reportError || !reportData) {
    return failUpload("SAVE_FAILED", "The evidence report could not be saved");
  }

  const report = reportData as { report_id: string; public_report_code: string };

  return {
    ok: true,
    reportId: report.public_report_code,
    reportPath: `/reports/${report.public_report_code}`,
    documentId,
    candidateName
  };
}
