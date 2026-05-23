import React from "react";
import { Badge } from "../../components/ui/Badge";
import { DataTable } from "../../components/ui/DataTable";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import { getJobCandidateList } from "../services/hiringRepository";

export function JobCandidateListPage() {
  const candidateList = getJobCandidateList();

  return (
    <RecruiterShell
      active="candidates"
      title="Candidates"
      subtitle="Track bulk-upload processing, evidence levels, and report readiness for one job."
      primaryAction="Upload candidates"
    >
      <main className="workspace-content">
        <section className="dashboard-intro">
          <div>
            <p className="section-kicker">Grouped by evidence level</p>
            <h2>{candidateList.job.title}</h2>
            <p>
              Candidate records are scoped to this job. Reports are grouped for recruiter review, not ranked.
            </p>
          </div>
          <a className="button button-primary" href="/jobs/frontend-developer/candidates/upload">
            Upload candidates
          </a>
        </section>

        <section className="filter-bar" aria-label="Candidate evidence filters">
          {candidateList.filters.map((filter) => (
            <button className="filter-chip" type="button" key={filter}>
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
              reportPath: <a className="table-link" href={row.reportPath}>View report</a>
            }))}
          />
        </section>
      </main>
    </RecruiterShell>
  );
}
