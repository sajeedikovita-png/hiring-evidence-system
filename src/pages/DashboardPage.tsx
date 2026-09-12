import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { DevelopmentConnectionStatusPanel } from "../components/dev/DevelopmentConnectionStatusPanel";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import {
  classifyConnectionIssue,
  getDevelopmentConnectionStatus,
  type DevelopmentConnectionStatus
} from "../services/connectionStatusService";
import { getAsyncHiringRepository } from "../services/hiringRepository";
import { isCurrentPlatformAdministrator } from "../services/accessApprovalService";
import type { DashboardViewModel } from "../types/hiring";

export function DashboardPage() {
  const repository = useMemo(() => getAsyncHiringRepository(), []);
  const [dashboard, setDashboard] = useState<DashboardViewModel | undefined>();
  const [loadMessage, setLoadMessage] = useState("Loading company workspace.");
  const [reviewerName, setReviewerName] = useState("Recruiter");
  const [isAdmin, setIsAdmin] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<DevelopmentConnectionStatus>(() =>
    getDevelopmentConnectionStatus({ repositorySource: repository.source })
  );

  useEffect(() => {
    let isMounted = true;

    repository
      .getActiveCompanyContext()
      .then((context) => {
        if (isMounted) {
          setReviewerName(context.userName);
        }
        return Promise.all([
          repository.getDashboardData(context.companyId, context.userId),
          isCurrentPlatformAdministrator()
        ]);
      })
      .then(([nextDashboard, isPlatformAdministrator]) => {
        if (isMounted) {
          setDashboard(nextDashboard);
          setIsAdmin(isPlatformAdministrator);
          if (repository.source === "supabase") {
            setConnectionStatus(getDevelopmentConnectionStatus({ repositorySource: repository.source, issue: "ready" }));
          }
        }
      })
      .catch((error) => {
        if (isMounted) {
          const issue = classifyConnectionIssue(error, "dashboard_read_failed");
          setConnectionStatus(getDevelopmentConnectionStatus({ repositorySource: repository.source, issue, error }));
          setLoadMessage(
            issue === "auth_user_missing"
              ? "Auth user missing"
              : issue === "company_context_missing"
                ? "Company context missing"
                : "Dashboard cannot load"
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [repository]);

  if (!dashboard) {
    return (
      <RecruiterShell
        active="dashboard"
        title="Dashboard"
        subtitle="Review queue, evidence status, and decision sign-off work for hiring teams."
        primaryAction="New report"
        reviewerName={reviewerName}
        showAccessRequests={isAdmin}
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
      active="dashboard"
      title="Dashboard"
      subtitle="Review queue, evidence status, and decision sign-off work for hiring teams."
      primaryAction="New report"
      reviewerName={dashboard.activeReviewerName}
      showAccessRequests={isAdmin}
    >
      <main className="workspace-content">
        <DevelopmentConnectionStatusPanel status={connectionStatus} />
        <section className="dashboard-intro">
          <div>
            <p className="section-kicker">Welcome back, {dashboard.activeReviewerName}</p>
            <h2>{dashboard.introCount} candidate reports need recruiter review today.</h2>
            <p>Review the job-related evidence and verify any missing information before recording a decision.</p>
          </div>
          <Link className="button button-secondary" to={dashboard.reviewQueue[0]?.reportPath ?? "/dashboard"}>
            Open sample report
          </Link>
          <Link className="button button-primary" to="/pilot-access">Pilot access</Link>
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
                  <Link to={item.reportPath}>Open report</Link>
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
              title: <Link className="table-link" to={job.candidateListPath}>{job.title}</Link>,
              evidenceStatus: <Badge tone={job.evidenceStatus.tone}>{job.evidenceStatus.label}</Badge>,
              candidates: <Link className="table-link" to={job.candidateListPath}>{job.candidates}</Link>,
              lastUpdated: (
                <span className="table-action-group">
                  <span>{job.lastUpdated}</span>
                  <Link className="table-link" to={job.uploadPath}>Upload candidates</Link>
                </span>
              )
            }))}
          />
        </section>
      </main>
    </RecruiterShell>
  );
}
