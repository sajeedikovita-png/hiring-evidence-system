import React, { useMemo, useState } from "react";
import UploadCloud from "lucide-react/dist/esm/icons/upload-cloud.js";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { DataTable } from "../../../components/ui/DataTable";
import { createMockBulkUploadFile, getBulkUploadWorkspace } from "../../services/mockSelectors";
import type { BulkUploadFile, BulkUploadWorkspaceViewModel } from "../../types/hiring";

type BulkUploadCandidatesPanelProps = {
  workspace?: BulkUploadWorkspaceViewModel;
};

function getStatusTone(status: string) {
  if (status === "Uploaded" || status === "Parsed" || status === "Report ready") return "success";
  if (status === "Failed") return "danger";
  if (status === "Needs manual review") return "warning";
  return "info";
}

export function BulkUploadCandidatesPanel({ workspace = getBulkUploadWorkspace() }: BulkUploadCandidatesPanelProps) {
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [localFiles, setLocalFiles] = useState<BulkUploadFile[]>([]);

  const files = useMemo(() => [...localFiles, ...workspace.files], [localFiles, workspace.files]);
  const processedFiles = files.filter((file) => file.parsingStatus === "Parsed" || file.evidenceReportStatus === "Report ready").length;
  const failedFiles = files.filter((file) => file.status === "Failed" || file.evidenceReportStatus === "Failed").length;

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const incomingFiles = Array.from(fileList).map((file, index) => createMockBulkUploadFile(file.name, index));
    setLocalFiles((currentFiles) => [...incomingFiles, ...currentFiles]);
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
        <span>{workspace.privacyConfirmationText}</span>
      </label>

      <div className="bulk-upload-actions">
        <Button disabled={!privacyConfirmed}>Upload candidates</Button>
        <p className="muted">Mock processing is non-blocking and ready to be replaced by a background queue.</p>
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
            { key: "errorMessage", header: "Error message if failed" },
            { key: "action", header: "View report action" }
          ]}
          rows={files.map((file) => ({
            fileName: <strong>{file.fileName}</strong>,
            candidateName: file.candidateName ?? "Not detected yet",
            status: <Badge tone={getStatusTone(file.status)}>{file.status}</Badge>,
            parsingStatus: <Badge tone={getStatusTone(file.parsingStatus)}>{file.parsingStatus}</Badge>,
            evidenceReportStatus: <Badge tone={getStatusTone(file.evidenceReportStatus)}>{file.evidenceReportStatus}</Badge>,
            errorMessage: file.errorMessage ?? "None",
            action:
              file.evidenceReportStatus === "Report ready" ? (
                <a className="table-link" href="/reports/candidate-evidence">View report</a>
              ) : (
                <span className="muted">Not ready</span>
              )
          }))}
        />
      </section>
    </section>
  );
}
