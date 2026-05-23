import React from "react";
import { BulkUploadCandidatesPanel } from "../components/bulk-upload/BulkUploadCandidatesPanel";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import { getBulkUploadWorkspace } from "../services/mockSelectors";

export function BulkUploadCandidatesPage() {
  const workspace = getBulkUploadWorkspace();

  return (
    <RecruiterShell
      active="candidates"
      title="Upload Candidates"
      subtitle="Add multiple resumes to one job-based hiring review."
      secondaryAction="Back to candidates"
      primaryAction="Upload candidates"
    >
      <main className="workspace-content">
        <BulkUploadCandidatesPanel workspace={workspace} />
      </main>
    </RecruiterShell>
  );
}
