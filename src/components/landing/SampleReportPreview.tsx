import React from "react";
import { getCandidateReport } from "../../services/mockSelectors";

const chipForTone: Record<string, { cls: string; label: string }> = {
  success: { cls: "found", label: "Found" },
  warning: { cls: "verify", label: "Verify" },
  danger: { cls: "missing", label: "Missing" },
  info: { cls: "review", label: "Review" }
};

export function SampleReportPreview() {
  const candidateReport = getCandidateReport();
  const rows = candidateReport.evidenceRows.slice(0, 3);

  return (
    <div className="panel">
      <div className="panel-head">
        <span>Record · {candidateReport.candidate.reportId}</span>
        <span className="st">Human review required</span>
      </div>
      {rows.map((row) => {
        const chip = chipForTone[row.status.tone] ?? chipForTone.info;
        return (
          <div className="prow" key={row.requirement}>
            <div>
              <div className="req">{row.requirement}</div>
              <div className="src">{row.source}</div>
            </div>
            <span className={`chip ${chip.cls}`}>{chip.label}</span>
          </div>
        );
      })}
      <div className="panel-foot">AI-assisted · human review required before any decision</div>
    </div>
  );
}
