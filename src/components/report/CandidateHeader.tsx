import React from "react";
import { Badge } from "../../../components/ui/Badge";
import type { CandidateProfile } from "../../types/hiring";

type CandidateHeaderProps = {
  candidate: CandidateProfile;
};

export function CandidateHeader({ candidate }: CandidateHeaderProps) {
  const details = [
    ["Role applied for", candidate.role],
    ["Company / job", candidate.company],
    ["Application date", candidate.appliedDate],
    ["Report generated", candidate.reportGenerated],
    ["Report ID", candidate.reportId],
    ["Assigned recruiter", candidate.assignedRecruiter]
  ];

  return (
    <section className="report-hero">
      <div className="report-hero-main">
        <div>
          <p className="section-kicker">Candidate Evidence Report</p>
          <h2>{candidate.name}</h2>
          <p>
            {candidate.role} application for {candidate.company}
          </p>
        </div>
        <div className="status-cluster">
          {candidate.statusBadges.map((badge) => (
            <Badge key={badge.label} tone={badge.tone}>
              {badge.label}
            </Badge>
          ))}
        </div>
      </div>
      <dl className="report-meta-grid">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
