import React from "react";
import { getPublicSyntheticSampleViewModel } from "../../services/hiringRepository";

export function SampleReportPreview() {
  const candidateReport = getPublicSyntheticSampleViewModel();

  return (
    <article className="report-dossier" aria-label="Synthetic candidate evidence report preview">
      <header className="dossier-masthead"><span>Review file 014</span><strong>Synthetic sample</strong></header>
      <div className="dossier-candidate">
        <div><p>Candidate evidence report</p><h2>{candidateReport.candidate.name}</h2><span>{candidateReport.candidate.role}</span></div>
        <strong className="human-review-stamp">Human review<br />required</strong>
      </div>
      <div className="dossier-column-labels"><span>Role requirement and source</span><span>Review state</span></div>
      <ol className="dossier-evidence-list">
        {candidateReport.evidenceRows.slice(0, 3).map((row, index) => (
          <li key={row.requirement}>
            <span className="dossier-index">0{index + 1}</span>
            <span className="dossier-copy"><strong>{row.requirement}</strong><small>Source: {row.source}{row.sourceReference ? ` · ${row.sourceReference}` : ""}</small></span>
            <span className={`dossier-status dossier-status-${row.status.tone}`}>{row.status.label}</span>
          </li>
        ))}
      </ol>
      <div className="dossier-question"><span>Verification question</span><p>What production deployment work did the candidate own, and how was it verified?</p></div>
      <footer className="dossier-decision"><span>Decision record</span><strong>Recruiter reason required</strong></footer>
      <p className="dossier-disclaimer">AI-assisted analysis. Human review is required before making any hiring decision.</p>
    </article>
  );
}
