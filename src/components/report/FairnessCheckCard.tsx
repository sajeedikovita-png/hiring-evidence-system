import React from "react";
import { Badge } from "../../../components/ui/Badge";
import type { FairnessCheck } from "../../types/hiring";

type FairnessCheckCardProps = {
  fairness: FairnessCheck;
};

export function FairnessCheckCard({ fairness }: FairnessCheckCardProps) {
  const protectedCharacteristics = Array.isArray(fairness.protectedCharacteristics) ? fairness.protectedCharacteristics : [];

  return (
    <section className="workspace-card fairness-card">
      <div className="section-heading-row">
        <div>
          <p className="section-kicker">Fairness Check</p>
          <h2>Review safeguards</h2>
        </div>
        <Badge tone="success">{fairness.status}</Badge>
      </div>
      <div className="fairness-grid">
        <div className="fairness-status-panel">
          <div className="fairness-status-item">
            <span>Fairness check status</span>
            <strong>Passed</strong>
          </div>
          <div className="fairness-status-item">
            <span>Protected characteristics not used</span>
            <strong>Confirmed</strong>
          </div>
          <div className="fairness-status-item">
            <span>Decision wording warning</span>
            <strong>{fairness.decisionWordingWarning}</strong>
          </div>
          <p className="muted">{fairness.reminder}</p>
        </div>
        <div className="protected-list-panel">
          <h3>Protected characteristics not used</h3>
          <ul className="protected-list">
            {protectedCharacteristics.length > 0 ? (
              protectedCharacteristics.map((item) => <li key={item}>{item}</li>)
            ) : (
              <li>Protected characteristics not used</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
