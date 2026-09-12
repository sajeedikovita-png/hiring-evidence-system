import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import UploadCloud from "lucide-react/dist/esm/icons/upload-cloud.js";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { DataTable } from "../../../components/ui/DataTable";
import { getSafeUploadErrorMessage } from "../../services/uploadService";
import type { BulkUploadFile, BulkUploadWorkspaceViewModel } from "../../types/hiring";

type BulkUploadCandidatesPanelProps = {
  workspace: BulkUploadWorkspaceViewModel;
  onUploadFiles: (files: File[]) => Promise<void>;
};

function getStatusTone(status: string) {
  if (status === "Uploaded" || status === "Parsed" || status === "Report ready") return "success";
  if (status === "Failed") return "danger";
  if (status === "Needs manual review" || status === "Manual review required") return "warning";
  return "info";
}

export function BulkUploadCandidatesPanel({ workspace, onUploadFiles }: BulkUploadCandidatesPanelProps) {
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadMessage, setUploadMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const files = useMemo(() => workspace.files, [workspace.files]);
  const readyForManualReview = files.filter((file) => file.status !== "Failed").length;
  const failedFiles = files.filter((file) => file.status === "Failed" || file.evidenceReportStatus === "Failed").length;

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    setSelectedFiles(Array.from(fileList));
    setUploadMessage("");
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  }

  async function uploadSelectedFiles() {
    if (!privacyConfirmed || selectedFiles.length === 0) return;
    setIsUploading(true);
    setUploadMessage("Recording uploads. Analysis remains pending until a reviewer adds source-grounded evidence.");
    try {
      await onUploadFiles(selectedFiles);
      setSelectedFiles([]);
      setUploadMessage("Upload recorded. Ready for human review.");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Unable to record uploads.");
    } finally {
      setIsUploading(false);
    }
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
        <input
          type="file"
          multiple
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
        <span>I attest that this organisation has a lawful basis to upload these documents. This does not represent candidate consent.</span>
      </label>

      <div className="bulk-upload-actions">
        <Button disabled={!privacyConfirmed || selectedFiles.length === 0 || isUploading} onClick={() => void uploadSelectedFiles()}>
          {isUploading ? "Recording uploads" : "Upload candidates"}
        </Button>
        <p className="muted">{uploadMessage || "Files are stored privately. A reviewer can use manual evidence review or explicitly prepare extracted text for an AI-assisted evidence report."}</p>
      </div>

      <div className="processing-progress">
        <div>
          <span>Total files</span>
          <strong>{files.length}</strong>
        </div>
        <div>
          <span>Ready for manual review</span>
          <strong>{readyForManualReview}</strong>
        </div>
        <div>
          <span>Failed files</span>
          <strong>{failedFiles}</strong>
        </div>
      </div>

      <section className="uploaded-files-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Manual review queue</p>
            <h2>Uploaded files</h2>
          </div>
          <Badge tone="warning">Human review required</Badge>
        </div>
        <DataTable
          caption="Uploaded files"
          columns={[
            { key: "fileName", header: "File name" },
            { key: "candidateName", header: "Candidate name" },
            { key: "status", header: "Upload status" },
            { key: "evidenceReportStatus", header: "Evidence report status" },
            { key: "errorMessage", header: "Error message if failed" },
            { key: "action", header: "View report action" }
          ]}
          rows={files.map((file) => ({
            fileName: <strong>{file.fileName}</strong>,
            candidateName: file.candidateName || "Name not recorded",
            status: <Badge tone={getStatusTone(file.status)}>{file.status}</Badge>,
            evidenceReportStatus: <Badge tone={getStatusTone(file.evidenceReportStatus)}>{file.evidenceReportStatus}</Badge>,
            errorMessage: file.errorMessage ? getSafeUploadErrorMessage(file) : "None",
            action:
              file.evidenceReportStatus === "Report ready" && file.reportPath ? (
                <Link className="table-link" to={file.reportPath}>View report</Link>
              ) : file.status !== "Failed" ? (
                <Link className="table-link" to={`/jobs/${workspace.job.id}/candidates/${file.id}/manual-review`}>Review source</Link>
              ) : (
                <span className="muted">Upload failed</span>
              )
          }))}
        />
      </section>
    </section>
  );
}
