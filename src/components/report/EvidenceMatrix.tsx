import React from "react";
import type { EvidenceItem } from "../../types/hiring";

type EvidenceMatrixProps = { rows: EvidenceItem[] };

function evidenceTone(label: string) {
  if (/missing/i.test(label)) return "missing";
  if (/^(strong evidence|evidence found|supporting evidence)$/i.test(label)) return "found";
  return "verify";
}

export function EvidenceMatrix({ rows }: EvidenceMatrixProps) {
  return (
    <section className="workspace-card evidence-matrix-card evidence-reading-view" aria-label="Job requirement evidence">
      <div className="section-heading-row">
        <div><p className="section-kicker">Evidence review</p><h2>Requirement-by-requirement review</h2></div>
      </div>
      <p className="evidence-reading-intro">Read the finding, check its source, then verify what remains uncertain. Evidence found does not mean the claim has been independently verified.</p>
      <div className="evidence-reading-legend" aria-label="Evidence status key">
        <span className="evidence-status-label evidence-found">Evidence found</span>
        <span className="evidence-status-label evidence-verify">Needs verification</span>
        <span className="evidence-status-label evidence-missing">Missing evidence</span>
      </div>
      {rows.length ? <ol className="evidence-reading-list">{rows.map((row, index) => (
        <li key={row.id} className={`evidence-reading-item evidence-${evidenceTone(row.status.label)}`}>
          <article>
            <header className="evidence-reading-heading">
              <div><span className="evidence-criterion-number">Requirement {index + 1}</span><h3>{row.requirement}</h3></div>
              <span className={`evidence-status-label evidence-${evidenceTone(row.status.label)}`}>{row.status.label}</span>
            </header>
            <div className="evidence-finding"><h4>Candidate evidence</h4><p>{row.evidence}</p></div>
            <dl className="evidence-source-meta">
              <div><dt>Source</dt><dd>{row.source}</dd></div>
              <div><dt>Reference</dt><dd>{row.sourceReference || "Reference not recorded"}</dd></div>
              <div><dt>Analysis confidence</dt><dd>{row.confidence}</dd></div>
            </dl>
            <aside className="evidence-verification-action"><h4>Your verification step</h4><p>{row.verificationNeeded || "Review the original source and confirm this claim before using it in a decision."}</p></aside>
          </article>
        </li>
      ))}</ol> : <p className="evidence-reading-intro">No requirement evidence recorded yet.</p>}
    </section>
  );
}
