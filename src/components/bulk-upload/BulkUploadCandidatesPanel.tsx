import React, { useMemo, useState } from "react";
import UploadCloud from "lucide-react/dist/esm/icons/upload-cloud.js";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { DataTable } from "../../../components/ui/DataTable";
import { getHiringRepositoryMode } from "../../services/hiringRepository";
import { getBulkUploadWorkspace } from "../../services/mockSelectors";
import { uploadAndAnalyzePilotResume } from "../../services/pilotUploadService";
import { analyzeResumeFile } from "../../services/resumeAnalysis";
import {
  getSafeUploadErrorMessage,
  getUploadFlowStateForFile,
  getUploadStateLabels,
  validateUploadFile
} from "../../services/uploadService";
import type { BulkUploadFile, BulkUploadWorkspaceViewModel } from "../../types/hiring";

type BulkUploadCandidatesPanelProps = {
  workspace?: BulkUploadWorkspaceViewModel;
};

function makeUploadRowId(fileName: string, index: number): string {
  const base = fileName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `resume-${index + 1}`;
  const suffix = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${index}-${Math.round(Math.random() * 1e9)}`;
  return `upload-${base}-${suffix}`;
}

function getStatusTone(status: string) {
  if (status === "Uploaded" || status === "Parsed" || status === "Report ready") return "success";
  if (status === "Failed") return "danger";
  if (status === "Needs manual review" || status === "Manual review required") return "warning";
  return "info";
}

function formatUploadState(state: string) {
  return state.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function BulkUploadCandidatesPanel({ workspace = getBulkUploadWorkspace() }: BulkUploadCandidatesPanelProps) {
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [localFiles, setLocalFiles] = useState<BulkUploadFile[]>([]);

  // A signed-in company workspace stores real candidate files privately and keeps
  // the records. The login-free demo keeps its scripted preview in this browser only.
  const pilotMode = useMemo(() => getHiringRepositoryMode() === "supabase", []);
  const uploadsLocked = pilotMode && !privacyConfirmed;

  const files = useMemo(() => [...localFiles, ...workspace.files], [localFiles, workspace.files]);
  const processedFiles = files.filter((file) => file.parsingStatus === "Parsed" || file.evidenceReportStatus === "Report ready").length;
  const failedFiles = files.filter((file) => file.status === "Failed" || file.evidenceReportStatus === "Failed").length;

  function addFiles(fileList: FileList | null) {
    if (!fileList || uploadsLocked) return;
    const incoming = Array.from(fileList);

    // 1. Show a row per file immediately: rejected files fail fast, accepted
    //    files enter a "generating" state while the AI analysis runs.
    const initialRows: BulkUploadFile[] = incoming.map((file, index) => {
      const validation = validateUploadFile({ name: file.name, size: file.size });
      const id = makeUploadRowId(file.name, index);
      const createdAt = new Date().toISOString();

      if (!validation.accepted) {
        return {
          id,
          batchId: "local-upload-batch",
          fileName: file.name,
          fileUrl: "",
          status: "Failed",
          parsingStatus: "Failed",
          evidenceReportStatus: "Failed",
          errorMessage:
            validation.message === "File too large"
              ? "File too large. Maximum size is 10 MB."
              : "Unsupported file type. Upload PDF or DOCX resumes only.",
          createdAt
        };
      }

      return {
        id,
        batchId: "local-upload-batch",
        fileName: file.name,
        fileUrl: `/local-upload/${encodeURIComponent(file.name)}`,
        status: "Uploaded",
        parsingStatus: "Parsing",
        evidenceReportStatus: "Report generating",
        createdAt
      };
    });

    setLocalFiles((current) => [...initialRows, ...current]);

    // 2. Analyze each accepted file and update its row when the report is ready.
    incoming.forEach((file, index) => {
      const row = initialRows[index];
      if (row.status === "Failed") return;

      if (pilotMode) {
        // Captured at the moment of upload, so it records what was actually confirmed
        // then rather than whatever the checkbox reads by the time the call resolves.
        analyzePilotFile(file, row, privacyConfirmed);
        return;
      }

      analyzeResumeFile(file, workspace.job.id)
        .then((result) => {
          const report = result.report;
          const done: BulkUploadFile = {
            ...row,
            status: "Uploaded",
            candidateId: report.candidate.id,
            applicationId: report.application.id,
            candidateName: report.candidate.name,
            parsingStatus: "Parsed",
            evidenceReportStatus: "Report ready",
            reportPath: `/reports/${report.reportId}`
          };
          setLocalFiles((current) => current.map((item) => (item.id === row.id ? done : item)));
        })
        .catch(() => {
          setLocalFiles((current) =>
            current.map((item) =>
              item.id === row.id
                ? {
                    ...item,
                    status: "Needs manual review",
                    parsingStatus: "Needs manual review",
                    evidenceReportStatus: "Needs manual review",
                    errorMessage: "Could not generate a report for this file."
                  }
                : item
            )
          );
        });
    });
  }

  /**
   * Customer workspace upload. A failure here is reported as a failure: the file is
   * kept and marked for manual review, and no scripted preview is substituted.
   */
  function analyzePilotFile(file: File, row: BulkUploadFile, consentConfirmed: boolean) {
    uploadAndAnalyzePilotResume(file, workspace.job.id, { consentConfirmed })
      .then((result) => {
        setLocalFiles((current) =>
          current.map((item) => {
            if (item.id !== row.id) return item;

            if (result.ok) {
              return {
                ...item,
                status: "Uploaded",
                candidateName: result.candidateName,
                parsingStatus: "Parsed",
                evidenceReportStatus: "Report ready",
                reportPath: result.reportPath
              };
            }

            return {
              ...item,
              status: "Needs manual review",
              parsingStatus: "Needs manual review",
              evidenceReportStatus: "Needs manual review",
              errorMessage: result.message
            };
          })
        );
      })
      .catch(() => {
        setLocalFiles((current) =>
          current.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  status: "Needs manual review",
                  parsingStatus: "Needs manual review",
                  evidenceReportStatus: "Needs manual review",
                  errorMessage: "This upload could not be completed. Human review required."
                }
              : item
          )
        );
      });
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  }

  return (
    <section className="workspace-card bulk-upload-panel">
      <div className="section-heading-row">
        <div>
          <p className="section-kicker">Bulk Upload Candidates</p>
          <h2>{workspace.job.title}</h2>
          <p className="muted">
            Upload many resumes for this job. Each accepted resume is prepared as one application record under this hiring review.
          </p>
        </div>
        <Badge tone="info">Grouped by evidence level</Badge>
      </div>

      <label
        className="dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <UploadCloud size={28} aria-hidden="true" />
        <strong>Drag and drop PDF or DOCX resumes</strong>
        <span>Accepted file types: PDF, DOCX. Max file size: {workspace.maxFileSizeMb} MB per file.</span>
        {uploadsLocked ? (
          <span className="muted">Confirm the authority and privacy statement below before uploading candidate files.</span>
        ) : null}
        <input
          type="file"
          multiple
          disabled={uploadsLocked}
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => addFiles(event.currentTarget.files)}
        />
      </label>

      <label className="privacy-confirmation">
        <input
          type="checkbox"
          checked={privacyConfirmed}
          onChange={(event) => setPrivacyConfirmed(event.currentTarget.checked)}
        />
        <span>{workspace.privacyConfirmationText}</span>
      </label>

      <div className="bulk-upload-actions">
        <Button disabled={!privacyConfirmed}>Upload candidates</Button>
        <p className="muted">Upload records move through validation, parsing, report generation, and manual review states.</p>
      </div>

      <div className="processing-progress">
        <div>
          <span>Total files</span>
          <strong>{files.length}</strong>
        </div>
        <div>
          <span>Processed files</span>
          <strong>{processedFiles}</strong>
        </div>
        <div>
          <span>Failed files</span>
          <strong>{failedFiles}</strong>
        </div>
      </div>

      <section className="upload-state-strip" aria-label="Upload processing states">
        {getUploadStateLabels().map((state) => (
          <span key={state}>{state}</span>
        ))}
      </section>

      <section className="uploaded-files-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Processing progress</p>
            <h2>Uploaded files</h2>
          </div>
          <Badge tone="warning">Human review required</Badge>
        </div>
        <DataTable
          caption="Uploaded files"
          columns={[
            { key: "fileName", header: "File name" },
            { key: "candidateName", header: "Candidate name if detected" },
            { key: "status", header: "Upload status" },
            { key: "parsingStatus", header: "Parsing status" },
            { key: "evidenceReportStatus", header: "Evidence report status" },
            { key: "flowState", header: "Current state" },
            { key: "errorMessage", header: "Error message if failed" },
            { key: "action", header: "View report action" }
          ]}
          rows={files.map((file) => ({
            fileName: <strong>{file.fileName}</strong>,
            candidateName: file.candidateName ?? "Not detected yet",
            status: <Badge tone={getStatusTone(file.status)}>{file.status}</Badge>,
            parsingStatus: <Badge tone={getStatusTone(file.parsingStatus)}>{file.parsingStatus}</Badge>,
            evidenceReportStatus: <Badge tone={getStatusTone(file.evidenceReportStatus)}>{file.evidenceReportStatus}</Badge>,
            flowState: <Badge tone={getStatusTone(formatUploadState(getUploadFlowStateForFile(file)))}>{formatUploadState(getUploadFlowStateForFile(file))}</Badge>,
            errorMessage: file.errorMessage ? getSafeUploadErrorMessage(file) : "None",
            action:
              file.evidenceReportStatus === "Report ready" ? (
                <a className="table-link" href={file.reportPath ?? "/reports/HER-2026-0521-AL"}>View report</a>
              ) : (
                <span className="muted">Not ready</span>
              )
          }))}
        />
      </section>
    </section>
  );
}
