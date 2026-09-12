import React from "react";
import { Badge } from "../../../components/ui/Badge";
import type { FairnessCheck } from "../../types/hiring";
import { getReviewSafeguardsView } from "../../services/reviewSafeguardsService";

type FairnessCheckCardProps = {
  fairness: FairnessCheck;
};

export function FairnessCheckCard({ fairness }: FairnessCheckCardProps) {
  const safeguards = getReviewSafeguardsView(fairness);

  return (
    <section className="workspace-card fairness-card">
      <div className="section-heading-row">
        <div>
          <p className="section-kicker">Fairness Check</p>
          <h2>Review safeguards</h2>
        </div>
        <Badge tone={safeguards.badgeTone}>{safeguards.status}</Badge>
      </div>
      <div className="fairness-grid">
        <div className="fairness-status-panel">
          <div className="fairness-status-item">
            <span>Fairness check status</span>
            <strong>{safeguards.checkStatus}</strong>
          </div>
          <div className="fairness-status-item">
            <span>Protected-characteristic review</span>
            <strong>{safeguards.protectedCharacteristicsStatus}</strong>
          </div>
          <div className="fairness-status-item">
            <span>Decision wording warning</span>
            <strong>{safeguards.decisionWordingWarning}</strong>
          </div>
          <p className="muted">{safeguards.summary}</p>
          <p className="muted">{safeguards.reminder}</p>
        </div>
        <div className="protected-list-panel">
          <h3>Recorded safeguard scope</h3>
          <ul className="protected-list">
            {safeguards.protectedCharacteristics.length > 0 ? (
              safeguards.protectedCharacteristics.map((item) => <li key={item}>{item}</li>)
            ) : (
              <li>{safeguards.scopeMessage}</li>
            )}
          </ul>
          {safeguards.protectedCharacteristics.length > 0 ? <p className="muted">{safeguards.scopeMessage}</p> : null}
        </div>
      </div>
    </section>
  );
}
