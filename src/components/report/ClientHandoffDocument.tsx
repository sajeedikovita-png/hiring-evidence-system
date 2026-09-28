import React from "react";
import type { ClientHandoff } from "../../services/clientHandoffService";

export function ClientHandoffDocument({ summary, syntheticSample = false }: { summary: ClientHandoff; syntheticSample?: boolean }) {
  const formatDate = (date: string) => { const parsed = new Date(date); return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleString(); };
  return <article className="client-handoff-document" style={{"--client-accent":summary.branding.accentColor} as React.CSSProperties}>
        <header>{summary.branding.logoUrl ? <img className="client-handoff-logo" src={summary.branding.logoUrl} alt={`${summary.branding.displayName} logo`} /> : null}<p>HIRING EVIDENCE · {summary.branding.displayName}</p><h1>{summary.branding.heading}</h1><h2>{summary.candidateName} · {summary.roleTitle}</h2><strong>{summary.status}</strong>{syntheticSample && <p>Synthetic demonstration data</p>}<p>Report {summary.reportReference}<br />Prepared: {formatDate(summary.preparedAt)}<br />Evidence report generated: {formatDate(summary.reportGeneratedAt)}</p></header>
        <p>AI assists. Human decides. Evidence explains. Findings are based on the reviewed sources and need human verification; this summary does not independently validate candidate claims.</p>
        <h2>Job-related evidence</h2>
        {summary.criteria.length ? summary.criteria.map((item, index) => <section key={index}><h3>{index + 1}. {item.requirement}</h3><strong>{item.status}</strong><p>{item.evidence}</p><p><b>Source:</b> {item.source} · {item.sourceReference}</p><p><b>Verify:</b> {item.verification || "Confirm the supporting source before relying on this finding."}</p></section>) : <p>No requirement evidence recorded.</p>}
        <h2>Missing evidence</h2><ul>{summary.missingEvidence.length ? summary.missingEvidence.map((item, index) => <li key={index}>{item}</li>) : <li>No missing evidence listed. Human verification is still required.</li>}</ul>
        <h2>Verification needed</h2><ul>{summary.verificationNeeded.length ? summary.verificationNeeded.map((item, index) => <li key={index}>{item}</li>) : <li>Review the source evidence and confirm relevant claims.</li>}</ul>
        <h2>Questions for follow-up</h2><ul>{summary.questions.length ? summary.questions.map((item, index) => <li key={index}>{item}</li>) : <li>No questions recorded.</li>}</ul>
        {summary.decision && <section><h2>Recorded human decision</h2><strong>{summary.decision.outcome}</strong><p>{summary.decision.reason}</p><p>Recorded: {formatDate(summary.decision.recordedAt)}</p></section>}
        <footer><strong>{summary.branding.footer}</strong><br />Prepared for an authorised hiring review. Private documents and internal notes are not attached. This copy is a snapshot; later report changes are not reflected.</footer>
      </article>;
}
