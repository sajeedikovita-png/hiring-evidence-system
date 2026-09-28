import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
          <Link className="button button-primary" to={dashboard.reviewQueue[0]?.reportPath ?? dashboard.recentJobs[0]?.candidateListPath ?? "/jobs"}>
            {dashboard.reviewQueue.length ? "Review next report" : dashboard.recentJobs.length ? "Continue with your job" : "Create your first job"}
          </Link>
          <Link className="button button-secondary" to="/pilot-access">Pilot access</Link>
        </section>

        <section className="next-task"><p className="section-kicker">Team workflow</p><h2>Make ownership and the next action visible</h2><p>See which reviewer owns each candidate, what they need to do next, when it is due, and who recorded earlier workflow changes.</p><Link className="button button-primary" to="/workflow">Open team workflow</Link></section>
        <section className="next-task"><p className="section-kicker">How to start</p><h2>Turn a CV into an evidence report</h2><p>Choose a job and confirm its requirements. Upload a CV, check the extracted text, then generate and review the evidence report. Your team makes the decision and records the reason.</p><Link className="button button-secondary" to={dashboard.recentJobs.length === 1 && dashboard.recentJobs[0].status !== "closed" ? dashboard.recentJobs[0].uploadPath : "/jobs"}>{dashboard.recentJobs.length === 1 && dashboard.recentJobs[0].status !== "closed" ? `Upload a CV for ${dashboard.recentJobs[0].title}` : "Choose or create a job"}</Link></section>
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
            <Link className="button button-secondary" to="/jobs">Choose a job to review</Link>
          </section>
        </div>

        <section className="workspace-card">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Recent jobs</p>
              <h2>Evidence status by role</h2>
            </div>
            <Link className="button button-secondary" to="/jobs">Manage jobs</Link>
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
                  {job.status === "closed" ? <span className="muted">Closed role</span> : <Link className="table-link" to={job.uploadPath}>Upload candidates</Link>}
                </span>
              )
            }))}
          />
        </section>
      </main>
    </RecruiterShell>
  );
}
