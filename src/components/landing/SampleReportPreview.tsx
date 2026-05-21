import React from "react";
import { Badge } from "../../../components/ui/Badge";
import { candidateReport } from "../../data/mockHiringData";

export function SampleReportPreview() {
  return (
    <article className="sample-report-card">
      <div className="sample-report-header">
        <div>
          <p className="section-kicker">Sample report preview</p>
          <h3>{candidateReport.candidate.name}</h3>
          <p>
            {candidateReport.candidate.role} · {candidateReport.candidate.company}
          </p>
        </div>
        <Badge tone="info">Human review required</Badge>
      </div>
      <div className="sample-report-metrics">
        {candidateReport.summaryCards.slice(0, 3).map((card) => (
          <div key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>
      <ul className="mini-evidence-list">
        {candidateReport.evidenceRows.map((row) => (
          <li key={row.requirement}>
            <strong>{row.requirement}</strong>
            <span>{row.status.label}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
