import React, { useEffect, useMemo, useState } from "react";
import Activity from "lucide-react/dist/esm/icons/activity.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import { createHiringSupabaseClient } from "../services/supabaseClient";
import { getSupportOperationsReport, type SupportOperationsReport } from "../services/supportOperationsService";

function label(value: string) { return value.replace(/_/g, " "); }
function when(value?: string) { return value ? new Date(value).toLocaleString() : "Not yet"; }

export function AdminOperationsPage() {
  const client = useMemo(() => createHiringSupabaseClient(), []);
  const [report, setReport] = useState<SupportOperationsReport>();
  const [message, setMessage] = useState("Loading the current operations report.");
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try { const next = await getSupportOperationsReport(client); setReport(next); setMessage(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Operations report is unavailable."); }
    finally { setRefreshing(false); }
  }
  useEffect(() => { void load(); }, []);

  const metrics = report ? [
    ["Open requests", report.counts.openIssues, "Needs owner or agent attention"],
    ["Agent queue", report.counts.agentActive, "Queued, investigating, or prepared"],
    ["Email pending", report.counts.notificationsPending, "Owner notification not confirmed"],
    ["Blocked", report.counts.blocked, "Needs a decision or failed a check"],
    ["Released", report.counts.released, "Recorded completed releases"]
  ] as const : [];

  return <RecruiterShell active="operations" title="Site operations" subtitle="A current record of customer reports, notifications, AI work, tests, previews, and releases." reviewerName="Platform administrator" showAccessRequests>
    <main className="workspace-content operations-page">
      <section className="workspace-card operations-heading"><div><p className="section-kicker">Owner report</p><h2>What is happening across the site</h2><p>Each customer report receives a reference and a separate developer queue record. Customer messages cannot directly change the website.</p></div><button className="button button-secondary" type="button" disabled={refreshing} onClick={() => void load()}><RefreshCw size={16} aria-hidden="true" /> {refreshing ? "Refreshing" : "Refresh report"}</button></section>
      {message ? <p className="workspace-status" role="status">{message}</p> : null}
      {report ? <>
        <section className="dashboard-metrics operations-metrics">{metrics.map(([name,value,detail]) => <article className="metric-card" key={name}><p>{name}</p><strong>{value}</strong><span>{detail}</span></article>)}</section>
        <p className="operations-generated">Report refreshed {when(report.generatedAt)}</p>
        <section className="workspace-card operations-list"><div className="section-heading-row"><div><p className="section-kicker">Request register</p><h2>Support and developer status</h2></div><span className="support-inbox-boundary">Controlled workflow</span></div>
          {report.issues.length ? report.issues.map((issue) => <article className="operations-issue" key={issue.issueId}>
            <div className="operations-issue-top"><div><span className="operations-reference">{issue.reference}</span><span>{issue.companyName}</span><span>{label(issue.category)}</span><span>{issue.severity}</span></div><time>{when(issue.createdAt)}</time></div>
            <h3>{issue.title}</h3><p className="muted">Affected page: {issue.affectedPage}</p>
            <div className="operations-stage-grid">
              <div><small>Owner email</small><strong>{label(issue.notificationStatus)}</strong><span>{issue.notificationError || when(issue.notificationSentAt)}</span></div>
              <div><small>AI triage</small><strong>{label(issue.triageStatus)}</strong><span>{issue.classification || "Awaiting classification"}</span></div>
              <div><small>Developer work</small><strong>{label(issue.agentStatus)}</strong><span>Risk: {label(issue.riskLevel)}</span></div>
              <div><small>Control</small><strong>{label(issue.approvalStatus)}</strong><span>{label(issue.automationScope)} · attempt {issue.attemptCount}</span></div>
            </div>
            {issue.investigationSummary ? <p><strong>Investigation:</strong> {issue.investigationSummary}</p> : null}
            {issue.fixSummary ? <p><strong>Fix:</strong> {issue.fixSummary}</p> : null}
            {issue.blockedReason ? <p className="operations-blocked"><strong>Blocked:</strong> {issue.blockedReason}</p> : null}
            {issue.testResults.length ? <div className="operations-tests"><strong>Checks</strong>{issue.testResults.map((test,index) => <span key={`${test.name ?? "check"}-${index}`}>{test.name ?? "Check"}: {test.status ?? "recorded"}{test.detail ? `, ${test.detail}` : ""}</span>)}</div> : null}
            {issue.changedFiles.length ? <p className="muted"><strong>Changed files:</strong> {issue.changedFiles.join(", ")}</p> : null}
            {issue.targetCommit ? <p className="muted"><strong>Verified commit:</strong> {issue.targetCommit.slice(0,12)}{issue.deploymentId ? ` · deployment ${issue.deploymentId}` : ""}</p> : null}
            <div className="operations-links">{issue.previewUrl ? <a href={issue.previewUrl} target="_blank" rel="noreferrer">Open preview</a> : <span>Preview not available</span>}{issue.releaseUrl ? <a href={issue.releaseUrl} target="_blank" rel="noreferrer">Open release</a> : <span>Release not recorded</span>}</div>
          </article>) : <p className="muted">No support requests have been recorded.</p>}
        </section>
        <section className="workspace-card operations-events"><div className="section-heading-row"><div><p className="section-kicker">Audit history</p><h2>Latest agent events</h2></div><Activity size={22} aria-hidden="true" /></div>{report.events.length ? <ol>{report.events.map((event) => <li key={event.id}><span className="operations-event-dot" /><div><strong>{event.reference} · {label(event.status)}</strong><p>{event.summary}</p><time>{when(event.createdAt)}</time></div></li>)}</ol> : <p className="muted">No agent activity has been recorded.</p>}</section>
      </> : null}
    </main>
  </RecruiterShell>;
}
