import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { DataTable } from "../../components/ui/DataTable";
import { DevelopmentConnectionStatusPanel } from "../components/dev/DevelopmentConnectionStatusPanel";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import { CandidateWorkflowPanel } from "../components/workflow/CandidateWorkflowPanel";
import {
  classifyConnectionIssue,
  getDevelopmentConnectionStatus,
  type DevelopmentConnectionStatus
} from "../services/connectionStatusService";
import { getAsyncHiringRepository } from "../services/hiringRepository";
import type { EvidenceCriterionStatus, EvidenceReviewGroup, JobCandidateListViewModel, JobCandidateRow } from "../types/hiring";

export function filterCandidateRows(rows: JobCandidateRow[], filters: { search?: string; group?: "all" | EvidenceReviewGroup; reportStatus?: string; requirement?: string; criterionStatus?: "all" | EvidenceCriterionStatus }) {
  const search = filters.search?.trim().toLowerCase() ?? "";
  const requirement = filters.requirement?.trim().toLowerCase() ?? "";
  return rows.filter((row) => {
    const searchable = `${row.candidateName} ${row.uploadedFile}`.toLowerCase();
    const matchingCriteria = row.criterionStatuses.filter((criterion) => !requirement || criterion.requirement.toLowerCase().includes(requirement));
    return (!search || searchable.includes(search)) &&
      (!filters.group || filters.group === "all" || row.evidenceReviewGroup === filters.group) &&
      (!filters.reportStatus || filters.reportStatus === "all" || row.reportStatus.label === filters.reportStatus) &&
      (!requirement && (!filters.criterionStatus || filters.criterionStatus === "all") || matchingCriteria.length > 0) &&
      (!filters.criterionStatus || filters.criterionStatus === "all" || matchingCriteria.some((criterion) => criterion.status === filters.criterionStatus));
  });
}

function getGroupTone(group: EvidenceReviewGroup) {
  return group === "Missing evidence" ? "danger" : group === "Verification needed" ? "warning" : group === "All evidence found" ? "success" : "neutral";
}

export function JobCandidateListPage() {
  const { jobId = "" } = useParams();
  const repository = useMemo(() => getAsyncHiringRepository(), []);
  const [candidateList, setCandidateList] = useState<JobCandidateListViewModel | undefined>();
  const [reviewerName, setReviewerName] = useState("Recruiter");
  const [loadMessage, setLoadMessage] = useState("Loading company workspace.");
  const [connectionStatus, setConnectionStatus] = useState<DevelopmentConnectionStatus>(() =>
    getDevelopmentConnectionStatus({ repositorySource: repository.source })
  );
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<"all" | EvidenceReviewGroup>("all");
  const [reportFilter, setReportFilter] = useState("all");
  const [requirementFilter, setRequirementFilter] = useState("");
  const [criterionFilter, setCriterionFilter] = useState<"all" | EvidenceCriterionStatus>("all");

  useEffect(() => {
    let isMounted = true;
    setCandidateList(undefined);
    setLoadMessage("Loading company workspace.");

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

  const normalizedSearch = search.trim().toLowerCase();
  const filteredRows = filterCandidateRows(candidateList.rows, { search: normalizedSearch, group: groupFilter, reportStatus: reportFilter, requirement: requirementFilter, criterionStatus: criterionFilter });
  const hasFilters = Boolean(search || requirementFilter || groupFilter !== "all" || reportFilter !== "all" || criterionFilter !== "all");
  const clearFilters = () => {
    setSearch("");
    setRequirementFilter("");
    setGroupFilter("all");
    setReportFilter("all");
    setCriterionFilter("all");
  };

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
            <p className="section-kicker">Review evidence by requirement</p>
            <h2>{candidateList.job.title}</h2>
            <p>
              Candidate records are scoped to this job. Use the filters to review documented evidence; rows are never ranked.
            </p>
          </div>
          {candidateList.job.status === "closed" ? <Link className="button button-secondary" to="/jobs">Manage closed role</Link> : <Link className="button button-primary" to={`/jobs/${candidateList.job.id}/candidates/upload`}>
            Upload candidates
          </Link>}
        </section>

        {candidateList.job.status === "closed" ? <section className="next-task"><h2>This role is closed</h2><p>Existing candidates and reports remain available. Reopen the role from Jobs before uploading new documents.</p></section> : <section className="next-task"><p className="section-kicker">Your next step</p><h2>{candidateList.rows.length ? "Continue a candidate review" : "Upload your first CV for this job"}</h2><p>{candidateList.rows.length ? "Choose Prepare evidence report beside an uploaded CV, or View report to review existing findings. Each report supports your own decision." : "Select Upload candidates above. You will review the CV text before choosing whether to send it to AI."}</p></section>}
        <CandidateWorkflowPanel key={jobId} jobId={candidateList.job.id} candidates={candidateList.rows} />
        <section className="workspace-card">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Candidate list</p>
              <h2>Progress and report status</h2>
            </div>
            <Badge tone="info">Human review required</Badge>
          </div>
          <div className="candidate-filters" aria-label="Candidate filters">
            <label>Search candidate or CV<input value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Search names or filenames" /></label>
            <label>Evidence group<select value={groupFilter} onChange={(event) => setGroupFilter(event.currentTarget.value as typeof groupFilter)}><option value="all">All evidence groups</option><option value="All evidence found">All evidence found</option><option value="Verification needed">Verification needed</option><option value="Missing evidence">Missing evidence</option><option value="No criterion evidence">No criterion evidence</option></select></label>
            <label>Report status<select value={reportFilter} onChange={(event) => setReportFilter(event.currentTarget.value)}><option value="all">All report statuses</option>{Array.from(new Set(candidateList.rows.map((row) => row.reportStatus.label))).map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label>Requirement<input value={requirementFilter} onChange={(event) => setRequirementFilter(event.currentTarget.value)} placeholder="Filter a requirement" /></label>
            <label>Criterion status<select value={criterionFilter} onChange={(event) => setCriterionFilter(event.currentTarget.value as typeof criterionFilter)}><option value="all">Any criterion status</option><option value="found">Evidence found</option><option value="needs_verification">Needs verification</option><option value="missing">Missing evidence</option></select></label>
            {hasFilters && <button className="button button-secondary filter-clear" type="button" onClick={clearFilters}>Clear filters</button>}
          </div>
          <p className="candidate-result-count" role="status">Showing {filteredRows.length} of {candidateList.rows.length} candidates</p>
          <div className="candidate-list-table"><DataTable
            caption="Candidate progress table"
            columns={[
              { key: "candidateName", header: "Candidate" },
              { key: "evidenceLevel", header: "Evidence group" },
              { key: "reportStatus", header: "Evidence report status" },
              { key: "updatedAt", header: "Updated" },
              { key: "reportPath", header: "Action" }
            ]}
            rows={filteredRows.map(({ evidenceCounts, evidenceReviewGroup, criterionStatuses, candidateNameSource, ...row }) => ({
              ...row,
              candidateName: <div className="candidate-name"><strong>{row.candidateName}</strong><small className="muted">{candidateNameSource === "filename" ? "Filename used; name not recorded" : candidateNameSource === "parsed_cv" ? "Name from parsed CV" : "Recorded candidate name"}</small></div>,
              evidenceLevel: <div><Badge tone={getGroupTone(evidenceReviewGroup)}>{evidenceReviewGroup}</Badge><small className="evidence-counts" aria-label={`${evidenceCounts.found} evidence found, ${evidenceCounts.needsVerification} needs verification, ${evidenceCounts.missing} missing evidence`}>Found {evidenceCounts.found} · Verify {evidenceCounts.needsVerification} · Missing {evidenceCounts.missing}</small></div>,
              reportStatus: <Badge tone={row.reportStatus.tone}>{row.reportStatus.label}</Badge>,
              reviewStatus: <Badge tone={row.reviewStatus.tone}>{row.reviewStatus.label}</Badge>,
              reportPath: row.hasReport ? <Link className="table-link" to={row.reportPath}>View report</Link> : row.documentId ? <Link className="table-link" to={`/jobs/${candidateList.job.id}/candidates/${row.documentId}/manual-review`}>Prepare evidence report</Link> : <span className="muted">No source uploaded</span>
            }))}
          /></div>
          {filteredRows.length === 0 && <div className="candidate-empty-state" role="status"><strong>{candidateList.rows.length ? "No candidates match these filters" : "No candidates in this job yet"}</strong><p>{candidateList.rows.length ? "Try a broader search or clear the filters to see all records." : "Upload a CV to begin a human evidence review."}</p>{hasFilters && <button className="button button-secondary" type="button" onClick={clearFilters}>Clear filters</button>}</div>}
        </section>
      </main>
    </RecruiterShell>
  );
}
