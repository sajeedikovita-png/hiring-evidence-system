import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import { getActiveCompanyContext } from "../services/companyContextService";
import { getAsyncHiringRepository, getDashboardData } from "../services/hiringRepository";
import type { DashboardViewModel } from "../types/hiring";

export function DashboardPage() {
  const repository = useMemo(() => getAsyncHiringRepository(), []);
  const companyContext = getActiveCompanyContext();
  const [dashboard, setDashboard] = useState<DashboardViewModel | undefined>(() =>
    repository.source === "seed" ? getDashboardData(companyContext.companyId) : undefined
  );
  const [loadMessage, setLoadMessage] = useState("Loading company workspace.");

  useEffect(() => {
    let isMounted = true;

    repository
      .getActiveCompanyContext()
      .then((context) => repository.getDashboardData(context.companyId))
      .then((nextDashboard) => {
        if (isMounted) setDashboard(nextDashboard);
      })
      .catch(() => {
        if (isMounted) setLoadMessage("Unable to load company workspace. Human review required.");
      });

    return () => {
      isMounted = false;
    };
  }, [repository]);

  if (!dashboard) {
    return (
      <RecruiterShell
        active="dashboard"
        title="Evidence Ledger"
        subtitle="Review queue, evidence status, and decision sign-off work for hiring teams."
        primaryAction="New report"
      >
        <main className="workspace-content">
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
      active="dashboard"
      title="Evidence Ledger"
      subtitle="Review queue, evidence status, and decision sign-off work for hiring teams."
      primaryAction="New report"
    >
      <main className="workspace-content">
        <section className="dashboard-intro">
          <div>
            <p className="section-kicker">Welcome back, {dashboard.activeReviewerName}</p>
            <h2>{dashboard.introCount} candidate reports need recruiter review today.</h2>
            <p>Fairness checks are complete for current reports with no decision wording warnings.</p>
          </div>
          <a className="button button-secondary" href="/reports/candidate-evidence">
            Open sample report
          </a>
          <a className="button button-primary" href="/jobs/frontend-developer/candidates/upload">
            Upload candidates
          </a>
        </section>

        <section className="dashboard-metrics">
          {dashboard.metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
              <span>{metric.detail}</span>
            </article>
          ))}
        </section>

        <div className="dashboard-grid-layout">
          <section className="workspace-card">
            <div className="section-heading-row">
              <div>
                <p className="section-kicker">Review queue</p>
                <h2>Candidates waiting for review</h2>
              </div>
              <Badge tone="warning">Human review required</Badge>
            </div>
            <div className="queue-list">
              {dashboard.reviewQueue.map((item) => (
                <article key={item.candidate} className="queue-item">
                  <div>
                    <strong>{item.candidate}</strong>
                    <span>{item.role}</span>
                  </div>
                  <Badge tone={item.status.tone}>{item.status.label}</Badge>
                  <span>{item.due}</span>
                  <a href={item.reportPath}>Open report</a>
                </article>
              ))}
            </div>
          </section>

          <section className="workspace-card decision-signoff-card">
            <p className="section-kicker">Decisions needing sign-off</p>
            <h2>{dashboard.metrics.find((metric) => metric.label === "Decisions needing sign-off")?.value ?? "0"}</h2>
            <p className="muted">Decision reason required before candidate status is finalized.</p>
            <Button>Review decisions</Button>
          </section>
        </div>

        <section className="workspace-card">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Recent jobs</p>
              <h2>Evidence status by role</h2>
            </div>
            <Button variant="secondary">Create job</Button>
          </div>
          <DataTable
            caption="Recent jobs table"
            columns={[
              { key: "title", header: "Job title" },
              { key: "department", header: "Department" },
              { key: "candidates", header: "Candidates" },
              { key: "evidenceStatus", header: "Evidence status" },
              { key: "lastUpdated", header: "Last updated" }
            ]}
            rows={dashboard.recentJobs.map((job) => ({
              ...job,
              title: <a className="table-link" href={job.candidateListPath}>{job.title}</a>,
              evidenceStatus: <Badge tone={job.evidenceStatus.tone}>{job.evidenceStatus.label}</Badge>,
              candidates: <a className="table-link" href={job.candidateListPath}>{job.candidates}</a>,
              lastUpdated: (
                <span className="table-action-group">
                  <span>{job.lastUpdated}</span>
                  <a className="table-link" href={job.uploadPath}>Upload candidates</a>
                </span>
              )
            }))}
          />
        </section>
      </main>
    </RecruiterShell>
  );
}
