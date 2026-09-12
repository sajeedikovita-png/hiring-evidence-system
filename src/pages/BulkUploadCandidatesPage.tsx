import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BulkUploadCandidatesPanel } from "../components/bulk-upload/BulkUploadCandidatesPanel";
import { DevelopmentConnectionStatusPanel } from "../components/dev/DevelopmentConnectionStatusPanel";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import {
  classifyConnectionIssue,
  getDevelopmentConnectionStatus,
  type DevelopmentConnectionStatus
} from "../services/connectionStatusService";
import { getAsyncHiringRepository } from "../services/hiringRepository";
import { createHiringSupabaseClient } from "../services/supabaseClient";
import { uploadPrivateCandidateDocuments } from "../services/secureUploadService";
import type { BulkUploadWorkspaceViewModel } from "../types/hiring";

export function BulkUploadCandidatesPage() {
  const { jobId = "" } = useParams();
  const repository = useMemo(() => getAsyncHiringRepository(), []);
  const [workspace, setWorkspace] = useState<BulkUploadWorkspaceViewModel | undefined>();
  const [reviewerName, setReviewerName] = useState("Recruiter");
  const [loadMessage, setLoadMessage] = useState("Loading company workspace.");
  const [connectionStatus, setConnectionStatus] = useState<DevelopmentConnectionStatus>(() =>
    getDevelopmentConnectionStatus({ repositorySource: repository.source })
  );
  const candidateListPath = jobId ? `/jobs/${jobId}/candidates` : "/jobs";

  async function refreshWorkspace() {
    const context = await repository.getActiveCompanyContext();
    setReviewerName(context.userName);
    const nextWorkspace = await repository.getBulkUploadWorkspace(context.companyId, jobId);
    if (!nextWorkspace) throw new Error("The upload workspace could not refresh.");
    setWorkspace(nextWorkspace);
    setLoadMessage("");
    if (repository.source === "supabase") {
      setConnectionStatus(getDevelopmentConnectionStatus({ repositorySource: repository.source, issue: "ready" }));
    }
  }

  useEffect(() => {
    let isMounted = true;

    repository
      .getActiveCompanyContext()
      .then((context) => {
        if (isMounted) setReviewerName(context.userName);
        return repository.getBulkUploadWorkspace(context.companyId, jobId);
      })
      .then((nextWorkspace) => {
        if (!isMounted) return;

        setWorkspace(nextWorkspace);
        if (nextWorkspace && repository.source === "supabase") {
          setConnectionStatus(getDevelopmentConnectionStatus({ repositorySource: repository.source, issue: "ready" }));
        }
        if (!nextWorkspace) {
          setLoadMessage("Upload workspace cannot load");
          setConnectionStatus(
            getDevelopmentConnectionStatus({
              repositorySource: repository.source,
              issue: "dashboard_read_failed",
              error: "Upload workspace is not available in this company workspace."
            })
          );
        }
      })
      .catch((error) => {
        if (!isMounted) return;

        const issue = classifyConnectionIssue(error, "dashboard_read_failed");
        setConnectionStatus(getDevelopmentConnectionStatus({ repositorySource: repository.source, issue, error }));
        setLoadMessage(
          issue === "auth_user_missing"
            ? "Auth user missing"
            : issue === "company_context_missing"
              ? "Company context missing"
              : "Upload workspace cannot load"
        );
      });

    return () => {
      isMounted = false;
    };
  }, [jobId, repository]);

  if (!workspace) {
    return (
      <RecruiterShell
        active="candidates"
        title="Upload Candidates"
        subtitle="Add multiple resumes to one job-based hiring review."
        reviewerName={reviewerName}
      >
        <main className="workspace-content">
          <DevelopmentConnectionStatusPanel status={connectionStatus} />
          <section className="dashboard-intro">
            <div>
              <p className="section-kicker">Company workspace</p>
              <h2>{loadMessage}</h2>
              <p>AI assists. Human decides. Evidence explains.</p>
            </div>
            <Link className="button button-secondary" to={candidateListPath}>Back to candidates</Link>
          </section>
        </main>
      </RecruiterShell>
    );
  }

  return (
    <RecruiterShell
      active="candidates"
      title="Upload Candidates"
      subtitle="Add multiple resumes to one job-based hiring review."
      reviewerName={reviewerName}
    >
      <main className="workspace-content">
        <DevelopmentConnectionStatusPanel status={connectionStatus} />
        <p><Link className="button button-secondary" to={candidateListPath}>Back to candidates</Link></p>
        <BulkUploadCandidatesPanel
          workspace={workspace}
          onUploadFiles={async (files) => {
            await uploadPrivateCandidateDocuments({ client: createHiringSupabaseClient(), jobId, files, uploaderAttestation: true });
            await refreshWorkspace();
          }}
        />
      </main>
    </RecruiterShell>
  );
}
