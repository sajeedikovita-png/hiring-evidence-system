import React, { useEffect, useMemo, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import { createHiringSupabaseClient } from "../services/supabaseClient";
import { hasSupabaseConfig } from "../services/supabaseConfig";
import { getAsyncHiringRepository } from "../services/hiringRepository";
import { buildSafeDiagnosticsPreview, createSupportRepository, getPageHelp, type SupportIssue, type SupportIssueInput, type SupportIssueType, type SupportSeverity } from "../services/supportService";

type WorkspaceSupportPageProps = { adminOnly?: boolean };
type RiskLevel = "low" | "medium" | "high";

export function WorkspaceSupportPage({ adminOnly = false }: WorkspaceSupportPageProps) {
  const hiringRepository = useMemo(() => getAsyncHiringRepository(), []);
  const [reviewerName, setReviewerName] = useState(adminOnly ? "Platform owner" : "Workspace member");
  const [issues, setIssues] = useState<SupportIssue[]>([]);
  const [type, setType] = useState<SupportIssueType>(() => new URLSearchParams(window.location.search).get("type") === "feature" ? "feature" : "problem");
  const [severity, setSeverity] = useState<SupportSeverity>("medium");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [riskLevels, setRiskLevels] = useState<Record<string, RiskLevel>>({});
  const [scopes, setScopes] = useState<Record<string, string>>({});
  const [testPlans, setTestPlans] = useState<Record<string, string>>({});
  const [workingId, setWorkingId] = useState("");
  const pageHelp = getPageHelp("support");
  const diagnostics = buildSafeDiagnosticsPreview({ pathname: window.location.pathname, pageTitle: "Support", repositorySource: hiringRepository.source, workspaceRole: adminOnly ? "platform administrator" : "workspace member" });
  const supportRepository = useMemo(() => hasSupabaseConfig() ? createSupportRepository(createHiringSupabaseClient()) : undefined, []);

  async function loadInbox() {
    if (!supportRepository || !adminOnly) return;
    try { setIssues(await supportRepository.listInbox()); } catch { setMessage("The platform support inbox is unavailable in this environment."); }
  }

  useEffect(() => {
    if (adminOnly) return;
    let mounted = true;
    hiringRepository.getActiveCompanyContext().then((context) => { if (mounted) setReviewerName(context.userName); }).catch(() => undefined);
    return () => { mounted = false; };
  }, [adminOnly, hiringRepository]);
  useEffect(() => { void loadInbox(); }, [adminOnly, supportRepository]);

  async function submitIssue(event: React.FormEvent) {
    event.preventDefault();
    if (!supportRepository) { setMessage("Support is not configured in this environment."); return; }
    setWorkingId("new"); setMessage("");
    const input: SupportIssueInput = { summary, details, type, severity, affectedPage: diagnostics.page };
    try {
      const result = await supportRepository.createIssue(input);
      setSummary(""); setDetails("");
      setMessage(`Your request was recorded for human review. Reference: ${result.issueId.slice(0, 8).toUpperCase()}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not record this request.");
    } finally { setWorkingId(""); }
  }

  async function triageIssue(issue: SupportIssue) {
    if (!supportRepository) return;
    setWorkingId(issue.id); setMessage("Running controlled AI triage.");
    try { await supportRepository.triageIssue(issue.id); setMessage("AI triage completed. Review the recommendation before preparing work."); await loadInbox(); }
    catch { setMessage("AI triage could not be completed. Review this request manually."); }
    finally { setWorkingId(""); }
  }

  async function approveWork(issue: SupportIssue) {
    if (!supportRepository) return;
    const workSummary = (reviewNotes[issue.id] || issue.aiRecommendation).trim();
    const scope = (scopes[issue.id] || issue.affectedPage).trim();
    const testPlan = (testPlans[issue.id] || "Reproduce the reported behavior, run focused tests and all required repository checks, then provide a reviewable preview.").trim();
    if (!workSummary || !scope || !testPlan) { setMessage("Add the work summary, affected scope, and test plan before approval."); return; }
    setWorkingId(issue.id); setMessage("Recording a controlled developer work order.");
    try {
      const request = await supportRepository.prepareChangeRequest(issue.id, workSummary);
      await supportRepository.approveChangeRequest({ requestId: request.requestId, risk: riskLevels[issue.id] ?? "medium", scope, testPlan, expiryHours: 72 });
      setMessage("Approved for a separate implementation task for 72 hours. No code or deployment was started.");
      await loadInbox();
    } catch (error) { setMessage(error instanceof Error ? error.message : "The work order could not be approved."); }
    finally { setWorkingId(""); }
  }

  async function closeIssue(issue: SupportIssue) {
    if (!supportRepository) return;
    const note = reviewNotes[issue.id]?.trim() ?? "";
    if (!note) { setMessage("Add a written owner note before closing the request."); return; }
    setWorkingId(issue.id);
    try { await supportRepository.closeIssue(issue.id, note); setMessage("Support request closed and recorded."); await loadInbox(); }
    catch { setMessage("The support request could not be closed."); }
    finally { setWorkingId(""); }
  }

  return <RecruiterShell active="support" title={adminOnly ? "Support inbox" : "Support"} subtitle={adminOnly ? "Review customer requests, run controlled triage, and authorise bounded work." : "Get page-aware guidance, report a problem, or request a considered product improvement."} reviewerName={reviewerName} showAccessRequests={adminOnly}>
    <main className="workspace-content support-page">
      <section className="workspace-card support-hero"><div className="support-hero-icon"><LifeBuoy size={24} /></div><div><p className="section-kicker">{adminOnly ? "Platform owner" : pageHelp.title}</p><h2>{adminOnly ? "One place for customer issues" : "Help for the work in front of you"}</h2><p>{adminOnly ? "AI prepares an advisory recommendation. Owner approval authorises a separate implementation task and never changes production directly." : "AI answers from approved product guidance. A human reviews every problem and feature request."}</p></div></section>

      {!adminOnly ? <div className="support-layout">
        <section className="workspace-card"><div className="section-heading-row"><div><p className="section-kicker">Contact support</p><h2>{type === "problem" ? "Report a problem" : "Request a feature"}</h2></div><div className="support-toggle"><button className={type === "problem" ? "active" : ""} type="button" onClick={() => setType("problem")}>Report a problem</button><button className={type === "feature" ? "active" : ""} type="button" onClick={() => setType("feature")}>Request a feature</button></div></div><form className="support-form" onSubmit={submitIssue}><label>Short summary<input maxLength={180} required value={summary} onChange={(event) => setSummary(event.target.value)} placeholder={type === "problem" ? "What went wrong?" : "What would help your team?"} /></label><label>Priority<select value={severity} onChange={(event) => setSeverity(event.target.value as SupportSeverity)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label><label>Details<textarea maxLength={4000} required rows={5} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Include the outcome you expected and what you observed. Do not include candidate or confidential information." /></label><details className="support-diagnostics"><summary>Safe diagnostics preview</summary><dl><div><dt>Page</dt><dd>{diagnostics.page}</dd></div><div><dt>Source</dt><dd>{diagnostics.repositorySource}</dd></div><div><dt>Role</dt><dd>{diagnostics.workspaceRole}</dd></div></dl><small>Candidate data, documents, tokens, signed links, and logs are excluded.</small></details><button className="button button-primary" type="submit" disabled={workingId === "new"}>{workingId === "new" ? "Recording request" : "Send for human review"}</button></form></section>
        <aside className="workspace-card support-guidance"><p className="section-kicker">Before you send</p><h2>Useful context</h2>{pageHelp.tips.map((tip) => <p key={tip}>{tip}</p>)}<div className="support-ai-note"><strong>AI disclosure</strong><p>Suggestions are advisory. They do not access private candidate content, make decisions, or deploy changes.</p></div></aside>
      </div> : null}

      {message ? <p className="workspace-status" role="status">{message}</p> : null}

      {adminOnly ? <section className="workspace-card support-inbox"><div className="section-heading-row"><div><p className="section-kicker">Owner review</p><h2>Support requests</h2></div><span className="support-inbox-boundary">Owner approval required</span></div><p className="muted">Customer text is untrusted. Review the recommendation, scope, risk, and test plan before authorising implementation preparation.</p>{issues.length === 0 ? <p className="muted">No support requests are available yet.</p> : <div className="support-issue-list">{issues.map((issue) => <article className="support-issue" key={issue.id}><div className="support-issue-meta"><span>{issue.companyName}</span><span>{issue.type === "problem" ? "Problem" : "Feature"}</span><span>{issue.severity}</span><span>{issue.triageStatus}</span><span>{issue.approvalStatus}</span></div><h3>{issue.summary}</h3><p>{issue.details}</p><dl><div><dt>Affected page</dt><dd>{issue.affectedPage}</dd></div><div><dt>AI recommendation</dt><dd>{issue.aiRecommendation}</dd></div>{issue.approvalExpiresAt ? <div><dt>Approval expiry</dt><dd>{new Date(issue.approvalExpiresAt).toLocaleString()}</dd></div> : null}</dl>{issue.triageStatus !== "draft" ? <button className="button button-secondary" type="button" disabled={workingId === issue.id} onClick={() => void triageIssue(issue)}>Run AI triage</button> : null}<div className="support-owner-fields"><label>Work summary or owner note<textarea rows={2} value={reviewNotes[issue.id] ?? ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [issue.id]: event.target.value }))} placeholder={issue.aiRecommendation} /></label><label>Risk<select value={riskLevels[issue.id] ?? "medium"} onChange={(event) => setRiskLevels((current) => ({ ...current, [issue.id]: event.target.value as RiskLevel }))}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label>Affected scope<input value={scopes[issue.id] ?? issue.affectedPage} onChange={(event) => setScopes((current) => ({ ...current, [issue.id]: event.target.value }))} /></label><label>Required test plan<textarea rows={2} value={testPlans[issue.id] ?? ""} onChange={(event) => setTestPlans((current) => ({ ...current, [issue.id]: event.target.value }))} placeholder="How the implementation must be verified" /></label></div><div className="support-review-actions"><button className="button button-primary" type="button" disabled={workingId === issue.id || issue.triageStatus !== "draft" || issue.approvalStatus === "approved"} onClick={() => void approveWork(issue)}>Approve 72-hour work order</button><button className="button button-secondary" type="button" disabled={workingId === issue.id || issue.status === "closed"} onClick={() => void closeIssue(issue)}>Close request</button></div></article>)}</div>}</section> : null}
    </main>
  </RecruiterShell>;
}
