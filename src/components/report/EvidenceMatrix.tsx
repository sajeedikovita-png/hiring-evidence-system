import React from "react";
import { Badge } from "../../../components/ui/Badge";
import { DataTable } from "../../../components/ui/DataTable";
import type { EvidenceItem } from "../../types/hiring";

type EvidenceMatrixProps = {
  rows: EvidenceItem[];
};

export function EvidenceMatrix({ rows }: EvidenceMatrixProps) {
  return (
    <section className="workspace-card evidence-matrix-card">
      <div className="section-heading-row">
        <div>
          <p className="section-kicker">Evidence Matrix</p>
          <h2>Requirement-by-requirement review</h2>
        </div>
        <Badge tone="info">Job-related evidence</Badge>
      </div>
      <DataTable
        caption="Evidence matrix"
        columns={[
          { key: "requirement", header: "Requirement" },
          { key: "evidence", header: "Candidate evidence" },
          { key: "source", header: "Source" },
          { key: "confidence", header: "Confidence" },
          { key: "verificationNeeded", header: "Verification needed" },
          { key: "status", header: "Status" }
        ]}
        rows={rows.map((row) => ({
          ...row,
          requirement: <strong>{row.requirement}</strong>,
          confidence: <Badge tone={row.confidence === "High" ? "success" : row.confidence === "Medium" ? "info" : "danger"}>{row.confidence}</Badge>,
          status: <Badge tone={row.status.tone}>{row.status.label}</Badge>
        }))}
      />
    </section>
  );
}
