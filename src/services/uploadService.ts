import type { BulkUploadFile, UploadFlowState } from "../types/hiring";

export type UploadFileInput = {
  name: string;
  size: number;
};

export type UploadValidationResult = {
  state: UploadFlowState;
  accepted: boolean;
  message: "Upload accepted" | "Unsupported file type" | "File too large" | "Unable to parse document" | "Manual review required";
};

export const uploadFlowStates: Array<{ state: UploadFlowState; label: string }> = [
  { state: "waiting_for_upload", label: "Waiting for upload" },
  { state: "validating_file", label: "Validating file" },
  { state: "upload_accepted", label: "Upload accepted" },
  { state: "parsing_queued", label: "Parsing queued" },
  { state: "parsing_in_progress", label: "Parsing in progress" },
  { state: "evidence_report_generating", label: "Evidence report generating" },
  { state: "report_ready", label: "Report ready" },
  { state: "manual_review_required", label: "Manual review required" },
  { state: "upload_failed", label: "Upload failed" }
];

const maxUploadSizeBytes = 10 * 1024 * 1024;

export function getUploadStateLabels(): string[] {
  return uploadFlowStates.map((state) => state.label);
}

export function isAcceptedUploadFile(file: UploadFileInput): boolean {
  return /\.(pdf|docx)$/i.test(file.name);
}

export function validateUploadFile(file: UploadFileInput): UploadValidationResult {
  if (!isAcceptedUploadFile(file)) {
    return {
      state: "upload_failed",
      accepted: false,
      message: "Unsupported file type"
    };
  }

  if (file.size > maxUploadSizeBytes) {
    return {
      state: "upload_failed",
      accepted: false,
      message: "File too large"
    };
  }

  return {
    state: "upload_accepted",
    accepted: true,
    message: "Upload accepted"
  };
}

export function getUploadFlowStateForFile(file: BulkUploadFile): UploadFlowState {
  if (file.status === "Failed" || file.evidenceReportStatus === "Failed") return "upload_failed";
  if (file.evidenceReportStatus === "Needs manual review" || file.parsingStatus === "Needs manual review") return "manual_review_required";
  if (file.evidenceReportStatus === "Report ready") return "report_ready";
  if (file.evidenceReportStatus === "Report generating") return "evidence_report_generating";
  if (file.parsingStatus === "Parsing") return "parsing_in_progress";
  if (file.parsingStatus === "Queued") return "parsing_queued";
  return "upload_accepted";
}

export function getSafeUploadErrorMessage(file: BulkUploadFile): string {
  if (file.errorMessage?.includes("Unsupported file type")) return "Unsupported file type";
  if (file.errorMessage?.includes("too large")) return "File too large";
  if (file.parsingStatus === "Failed") return "Unable to parse document";
  if (file.parsingStatus === "Needs manual review" || file.evidenceReportStatus === "Needs manual review") return "Manual review required";
  return file.errorMessage ?? "Manual review required";
}
