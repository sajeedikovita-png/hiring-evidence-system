import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.js";
import Circle from "lucide-react/dist/esm/icons/circle.js";
import FlaskConical from "lucide-react/dist/esm/icons/flask-conical.js";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import { getAsyncHiringRepository } from "../services/hiringRepository";
import { loadPilotLifecycle, type PilotLifecycle } from "../services/pilotLifecycleService";

type PilotTestingSnapshot = Pick<PilotLifecycle, "state" | "isWritable" | "remainingDays" | "limits" | "usage">;

const testerSteps = [
  { title: "Create the role and criteria", detail: "Use real job-related requirements and mark at least one as required.", href: "/jobs", action: "Open Jobs" },
  { title: "Upload fictional candidate documents", detail: "Confirm authority to process each document, then inspect extraction before analysis.", href: "/jobs", action: "Choose a role" },
  { title: "Review evidence and public professional text", detail: "Check supporting facts, differences, missing evidence and verification questions. URLs are not fetched automatically.", href: "/workflow", action: "Open Workflow" },
  { title: "Record the human outcome", detail: "A person chooses the outcome and must enter a reason. The evidence report does not make the decision.", href: "/workflow", action: "Continue review" },
  { title: "Report anything unclear", detail: "Send the page, expected behaviour and observed result to the owner through Support.", href: "/workspace/support", action: "Open Support" }
];

const verifiedAreas = [
  { title: "Second reviewer collaboration", detail: "A controlled fictional second reviewer authenticated, appeared in assignment controls and received an attributed workflow history." },
  { title: "Concurrent save protection", detail: "A stale workflow save was blocked promptly and the earlier values were retained for deliberate reload and review." },
  { title: "Company isolation", detail: "A separate fictional company could not read another company’s jobs, evidence report, workflow or private notes." },
  { title: "Access lifecycle", detail: "Active, expired read-only and purge-due behaviour passed using a fictional company. No destructive purge ran." },
  { title: "Audited company transfer", detail: "A disposable fictional user moved between two fictional companies only with an explicit transfer flag and written reason. Old access was revoked, one active membership remained, and the user was restored." }
];

export function PilotTestingContent({ companyName, lifecycle }: { companyName: string; lifecycle: PilotTestingSnapshot }) {
  const stateLabel = lifecycle.state.replace(/_/g, " ");
  return <main className="workspace-content pilot-testing-page">
    <section className="pilot-testing-hero"><div><p className="section-kicker">Guided customer testing</p><h2>Test the full evidence journey</h2><p>Work through each major task in the signed-in product. Use fictional candidate information during evaluation and tell us where the journey is unclear.</p></div><FlaskConical size={54} aria-hidden="true" /></section>
    <section className="workspace-card pilot-testing-live" aria-label="Current pilot status"><div><p className="section-kicker">Your live workspace</p><h2>{companyName}</h2><p><strong>{stateLabel}</strong> · {lifecycle.isWritable ? "Changes available" : "Read-only"}{lifecycle.remainingDays === null ? "" : ` · ${lifecycle.remainingDays} days remaining`}</p></div><div className="pilot-testing-usage"><span><b>{lifecycle.usage.roles}</b> / {lifecycle.limits.roles} roles</span><span><b>{lifecycle.usage.candidateDocuments}</b> / {lifecycle.limits.candidateDocuments} documents</span><span><b>{lifecycle.usage.users}</b> / {lifecycle.limits.users} users</span></div></section>
    <section className="workspace-card pilot-testing-checklist"><div className="section-heading-row"><div><p className="section-kicker">Pilot tester checklist</p><h2>Complete these five tasks</h2></div><span className="badge badge-warning">Human review required</span></div><ol>{testerSteps.map((step, index) => <li key={step.title}><span className="pilot-step-number">{index + 1}</span><div><h3>{step.title}</h3><p>{step.detail}</p></div><Link className="button button-secondary" to={step.href}>{step.action}</Link></li>)}</ol></section>
    <section className="pilot-testing-evidence" aria-labelledby="platform-qa-title"><div className="section-heading-row"><div><p className="section-kicker">Platform QA evidence</p><h2 id="platform-qa-title">Checks already completed with controlled fictional data</h2><p>These results describe the tested preview environment. They do not replace your own customer-journey test.</p></div></div><div className="pilot-testing-evidence-grid">{verifiedAreas.map((area) => <article className="workspace-card" key={area.title}><CheckCircle2 aria-hidden="true" /><h3>{area.title}</h3><p>{area.detail}</p><span className="badge badge-success">Verified in preview</span></article>)}</div></section>
    <section className="workspace-card pilot-testing-boundary"><Circle aria-hidden="true" /><div><h2>Email test status and remaining checks</h2><p>Password recovery reached the controlled Gmail inbox with Hiring Evidence branding, and the reset link opened the password screen successfully. Invitation delivery across customer mail providers, repeat spam placement, and expired-link behaviour still need controlled tests. Report observations through Support rather than including passwords, candidate documents or private tokens.</p></div><Link className="button button-primary" to="/workspace/support">Report a test result</Link></section>
  </main>;
}

export function PilotTestingPage() {
  const [snapshot, setSnapshot] = useState<{companyName:string;lifecycle:PilotLifecycle}>();
  const [message, setMessage] = useState("Loading pilot testing workspace.");
  useEffect(() => { let active = true; const repository = getAsyncHiringRepository(); Promise.all([repository.getActiveCompanyContext(), loadPilotLifecycle()]).then(([context, lifecycle]) => { if (active) { setSnapshot({companyName:context.companyName,lifecycle}); setMessage(""); } }).catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Pilot testing workspace could not load."); }); return () => { active = false; }; }, []);
  return <RecruiterShell active="testing" title="Pilot testing" subtitle="Complete the customer journey and record what works, what is unclear, and what needs attention." reviewerName={snapshot?.companyName ?? "Pilot tester"}>{snapshot ? <PilotTestingContent companyName={snapshot.companyName} lifecycle={snapshot.lifecycle} /> : <main className="workspace-content"><section className="next-task" role="status"><p className="section-kicker">Pilot tester workspace</p><h2>Preparing your testing checklist</h2><p>{message}</p></section></main>}</RecruiterShell>;
}
