import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { DevelopmentConnectionStatusPanel } from "../components/dev/DevelopmentConnectionStatusPanel";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import { getActiveCompanyContext } from "../services/companyContextService";
import { activateDemoTrialOnDashboardOpen, getDemoTrialStatusForCompany } from "../services/demoTrialActivationService";
import {
  classifyConnectionIssue,
  getDevelopmentConnectionStatus,
  type DevelopmentConnectionStatus
} from "../services/connectionStatusService";
import { getAsyncHiringRepository, getDashboardData } from "../services/hiringRepository";
import type { DashboardViewModel } from "../types/hiring";
import type { DemoTrialStatus } from "../services/demoTrialService";

function demoTrialMessage(status: DemoTrialStatus | null): string | null {
  if (!status) return null;
  if (status.state === "active") {
    return status.daysRemaining <= 4
      ? `Your live demo ends in ${status.daysRemaining} day${status.daysRemaining === 1 ? "" : "s"}. After that, it becomes view-only for seven days.`
      : `${status.daysRemaining} days remain in your live demo. Your work will stay viewable for seven days after the demo ends.`;
  }
  if (status.state === "read_only") {
    return `Your live demo is now view-only. Your workspace data will be deleted in ${status.daysRemaining} day${status.daysRemaining === 1 ? "" : "s"} unless you continue.`;
  }
  if (status.state === "purge_due") return "This demo has ended. Contact us to continue and preserve this workspace.";
  return null;
}

export function DashboardPage() {
  const repository = useMemo(() => getAsyncHiringRepository(), []);
  const companyContext = getActiveCompanyContext();
  const [dashboard, setDashboard] = useState<DashboardViewModel | undefined>(() =>
    repository.source === "seed" ? getDashboardData(companyContext.companyId) : undefined
  );
  const [loadMessage, setLoadMessage] = useState("Loading company workspace.");
  const [connectionStatus, setConnectionStatus] = useState<DevelopmentConnectionStatus>(() =>
    getDevelopmentConnectionStatus({ repositorySource: repository.source })
  );
  const [trialStatus, setTrialStatus] = useState<DemoTrialStatus | null>(null);

  useEffect(() => {
    let isMounted = true;

    repository
      .getActiveCompanyContext()
      .then(async (context) => {
        if (repository.source === "supabase") {
          await activateDemoTrialOnDashboardOpen(context.companyId);
          const nextTrialStatus = await getDemoTrialStatusForCompany(context.companyId);
          if (isMounted) setTrialStatus(nextTrialStatus);
        }
        return repository.getDashboardData(context.companyId, context.userId);
      })
      .then((nextDashboard) => {
        if (isMounted) {
          setDashboard(nextDashboard);
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
        title="Evidence Ledger"
        subtitle="Review queue, evidence status, and decision sign-off work for hiring teams."
        primaryAction={{ label: "New report", href: "/jobs/frontend-developer/candidates/upload" }}
        reviewerName={companyContext.userName}
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

  // Only a real, signed-in workspace can be empty in a way the customer must fix; the
  // seeded demo always has roles, and prompting there would be nonsense.
  const needsFirstRole = repository.source === "supabase" && dashboard.recentJobs.length === 0;

  return (
    <RecruiterShell
      active="dashboard"
      title="Evidence Ledger"
      subtitle="Review queue, evidence status, and decision sign-off work for hiring teams."
      primaryAction={{ label: "New report", href: "/jobs/frontend-developer/candidates/upload" }}
      reviewerName={dashboard.activeReviewerName}
    >
      <main className="workspace-content">
        <DevelopmentConnectionStatusPanel status={connectionStatus} />
        {demoTrialMessage(trialStatus) ? (
          <section className="warning-card" aria-live="polite">
            <p className="section-kicker">Live demo access</p>
            <h2>{demoTrialMessage(trialStatus)}</h2>
          </section>
        ) : null}
        {needsFirstRole ? (
          <section className="workspace-card" aria-live="polite">
            <p className="section-kicker">Set up your workspace</p>
            <h2>Create your first role to start reviewing resumes.</h2>
            <p className="muted">
              Resumes are reviewed against the criteria you set for a role, so the first step is
              telling us what you are hiring for.
            </p>
            <div className="bulk-upload-actions">
              <a className="button button-primary" href="/jobs/new">
                Create your first role
              </a>
            </div>
          </section>
        ) : null}
        <section className="dashboard-intro">
          <div>
            <p className="section-kicker">Welcome back, {dashboard.activeReviewerName}</p>
            <h2>{dashboard.introCount} candidate reports need recruiter review today.</h2>
            <p>Fairness checks are complete for current reports with no decision wording warnings.</p>
          </div>
          <a className="button button-secondary" href={dashboard.reviewQueue[0]?.reportPath ?? "/dashboard"}>
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
            <Button onClick={() => window.location.assign(dashboard.reviewQueue[0]?.reportPath ?? "/dashboard")}>
              Review decisions
            </Button>
          </section>
        </div>

        <section className="workspace-card">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Recent jobs</p>
              <h2>Evidence status by role</h2>
            </div>
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
