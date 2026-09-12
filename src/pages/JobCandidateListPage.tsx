import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { DataTable } from "../../components/ui/DataTable";
import { DevelopmentConnectionStatusPanel } from "../components/dev/DevelopmentConnectionStatusPanel";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import {
  classifyConnectionIssue,
  getDevelopmentConnectionStatus,
  type DevelopmentConnectionStatus
} from "../services/connectionStatusService";
import { getAsyncHiringRepository } from "../services/hiringRepository";
import type { JobCandidateListViewModel } from "../types/hiring";

export function JobCandidateListPage() {
  const { jobId = "" } = useParams();
  const repository = useMemo(() => getAsyncHiringRepository(), []);
  const [candidateList, setCandidateList] = useState<JobCandidateListViewModel | undefined>();
  const [reviewerName, setReviewerName] = useState("Recruiter");
  const [loadMessage, setLoadMessage] = useState("Loading company workspace.");
  const [connectionStatus, setConnectionStatus] = useState<DevelopmentConnectionStatus>(() =>
    getDevelopmentConnectionStatus({ repositorySource: repository.source })
  );

  useEffect(() => {
    let isMounted = true;

    repository
      .getActiveCompanyContext()
      .then((context) => {
        if (isMounted) setReviewerName(context.userName);
        return repository.getJobCandidateList(context.companyId, jobId);
      })
      .then((nextCandidateList) => {
        if (!isMounted) return;

        setCandidateList(nextCandidateList);
        if (nextCandidateList && repository.source === "supabase") {
          setConnectionStatus(getDevelopmentConnectionStatus({ repositorySource: repository.source, issue: "ready" }));
        }
        if (!nextCandidateList) {
          setLoadMessage("Candidate list cannot load");
          setConnectionStatus(
            getDevelopmentConnectionStatus({
              repositorySource: repository.source,
              issue: "dashboard_read_failed",
              error: "Candidate list is not available in this company workspace."
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
              : "Candidate list cannot load"
        );
      });

    return () => {
      isMounted = false;
    };
  }, [jobId, repository]);

  if (!candidateList) {
    return (
      <RecruiterShell
        active="candidates"
        title="Candidates"
        subtitle="Track bulk-upload processing, evidence levels, and report readiness for one job."
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
          </section>
        </main>
      </RecruiterShell>
    );
  }

  return (
    <RecruiterShell
      active="candidates"
      title="Candidates"
      subtitle="Track private uploads, manual evidence review, and report readiness for one job."
      reviewerName={reviewerName}
    >
      <main className="workspace-content">
        <DevelopmentConnectionStatusPanel status={connectionStatus} />
        <section className="dashboard-intro">
          <div>
            <p className="section-kicker">Grouped by evidence level</p>
            <h2>{candidateList.job.title}</h2>
            <p>
              Candidate records are scoped to this job. Reports are grouped for recruiter review, not ranked.
            </p>
          </div>
          <Link className="button button-primary" to={`/jobs/${candidateList.job.id}/candidates/upload`}>
            Upload candidates
          </Link>
        </section>

        <section className="workspace-card">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Candidate list</p>
              <h2>Progress and report status</h2>
            </div>
            <Badge tone="info">Human review required</Badge>
          </div>
          <DataTable
            caption="Candidate progress table"
            columns={[
              { key: "candidateName", header: "Candidate" },
              { key: "evidenceLevel", header: "Evidence group" },
              { key: "reportStatus", header: "Evidence report status" },
              { key: "reviewStatus", header: "Review status" },
              { key: "uploadedFile", header: "Uploaded file" },
              { key: "updatedAt", header: "Updated" },
              { key: "reportPath", header: "Action" }
            ]}
            rows={candidateList.rows.map((row) => ({
              ...row,
              candidateName: <strong>{row.candidateName}</strong>,
              evidenceLevel: <Badge tone={row.reviewStatus.tone}>{row.evidenceLevel}</Badge>,
              reportStatus: <Badge tone={row.reportStatus.tone}>{row.reportStatus.label}</Badge>,
              reviewStatus: <Badge tone={row.reviewStatus.tone}>{row.reviewStatus.label}</Badge>,
              reportPath: row.hasReport ? <Link className="table-link" to={row.reportPath}>View report</Link> : row.documentId ? <Link className="table-link" to={`/jobs/${candidateList.job.id}/candidates/${row.documentId}/manual-review`}>Review source</Link> : <span className="muted">No source uploaded</span>
            }))}
          />
        </section>
      </main>
    </RecruiterShell>
  );
}
