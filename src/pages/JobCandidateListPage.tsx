import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { DevelopmentConnectionStatusPanel } from "../components/dev/DevelopmentConnectionStatusPanel";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import {
  classifyConnectionIssue,
  getDevelopmentConnectionStatus,
  type DevelopmentConnectionStatus
} from "../services/connectionStatusService";
import { getAsyncHiringRepository, getJobIdBySlug } from "../services/hiringRepository";
import type { JobCandidateListViewModel } from "../types/hiring";

export function JobCandidateListPage() {
  const repository = useMemo(() => getAsyncHiringRepository(), []);
  const { jobSlug } = useParams();
  const activeSlug = jobSlug ?? "frontend-developer";
  const jobId = getJobIdBySlug(activeSlug) ?? "job-frontend-developer";
  const [candidateList, setCandidateList] = useState<JobCandidateListViewModel | undefined>();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
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
  }, [repository, jobId]);

  if (!candidateList) {
    return (
      <RecruiterShell
        active="candidates"
        title="Candidates"
        subtitle="Track bulk-upload processing, evidence levels, and report readiness for one job."
        primaryAction={{ label: "Upload candidates", href: `/jobs/${activeSlug}/candidates/upload` }}
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

  const visibleRows = activeFilter
    ? candidateList.rows.filter((row) => row.evidenceLevel === activeFilter)
    : candidateList.rows;

  return (
    <RecruiterShell
      active="candidates"
      title="Candidates"
      subtitle="Track bulk-upload processing, evidence levels, and report readiness for one job."
      primaryAction={{ label: "Upload candidates", href: `/jobs/${activeSlug}/candidates/upload` }}
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
          <a className="button button-primary" href={`/jobs/${activeSlug}/candidates/upload`}>
            Upload candidates
          </a>
        </section>

        <section className="filter-bar" aria-label="Candidate evidence filters">
          <button
            className={activeFilter === null ? "filter-chip active" : "filter-chip"}
            type="button"
            onClick={() => setActiveFilter(null)}
          >
            All candidates
          </button>
          {candidateList.filters.map((filter) => (
            <button
              className={activeFilter === filter ? "filter-chip active" : "filter-chip"}
              type="button"
              key={filter}
              onClick={() => setActiveFilter((current) => (current === filter ? null : filter))}
            >
              {filter}
            </button>
          ))}
        </section>

        <section className="workspace-card">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Candidate list</p>
              <h2>Progress and report status</h2>
            </div>
            <Badge tone="info">Human review required</Badge>
          </div>
          {visibleRows.length > 0 ? (
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
              rows={visibleRows.map((row) => ({
                ...row,
                candidateName: <strong>{row.candidateName}</strong>,
                evidenceLevel: <Badge tone={row.reviewStatus.tone}>{row.evidenceLevel}</Badge>,
                reportStatus: <Badge tone={row.reportStatus.tone}>{row.reportStatus.label}</Badge>,
                reviewStatus: <Badge tone={row.reviewStatus.tone}>{row.reviewStatus.label}</Badge>,
                reportPath: <a className="table-link" href={row.reportPath}>View report</a>
              }))}
            />
          ) : (
            <EmptyState
              title="No candidates in this group"
              description="No candidates match this evidence group. Choose another filter, or select All candidates."
            />
          )}
        </section>
      </main>
    </RecruiterShell>
  );
}
