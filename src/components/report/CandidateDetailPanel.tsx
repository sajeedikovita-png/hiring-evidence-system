import React from "react";
import { Badge } from "../../../components/ui/Badge";
import type { CandidateProfile, FairnessCheck } from "../../types/hiring";
import { getReviewSafeguardsView } from "../../services/reviewSafeguardsService";

type CandidateDetailPanelProps = {
  candidate: CandidateProfile;
  fairness: FairnessCheck;
};

export function CandidateDetailPanel({ candidate, fairness }: CandidateDetailPanelProps) {
  const safeguards = getReviewSafeguardsView(fairness);
  const details = [
    ["Candidate", candidate.name],
    ["Role", candidate.role],
    ["Applied date", candidate.appliedDate],
    ["Assigned reviewer", candidate.assignedRecruiter],
    ["Current status", candidate.currentStatus],
    ["Candidate consent", candidate.consentStatus],
    ["Questionnaire", candidate.questionnaireStatus]
  ];

  return (
    <aside className="candidate-detail-panel">
      <section>
        <p className="section-kicker">Candidate detail</p>
        <h2>{candidate.name}</h2>
        <dl>
          {details.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section>
        <div className="section-heading-row">
          <p className="section-kicker">Fairness summary</p>
          <Badge tone={safeguards.badgeTone}>{safeguards.status}</Badge>
        </div>
        <p className="muted">{safeguards.summary}</p>
        <p className="muted">Decision wording warning: {safeguards.decisionWordingWarning}.</p>
      </section>
      <section>
        <p className="section-kicker">Recruiter note</p>
        <p className="muted">Evidence is organized for human review. No acceptance or rejection is automated.</p>
      </section>
    </aside>
  );
}
