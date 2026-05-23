import React, { useMemo, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { NoteTextArea } from "../../../components/ui/NoteTextArea";
import { validateHumanReviewDecision } from "../../services/reportService";
import type { ReviewDecision } from "../../types/hiring";

type HumanDecisionPanelProps = {
  options: ReviewDecision["decision"][];
};

export function HumanDecisionPanel({ options }: HumanDecisionPanelProps) {
  const [selectedDecision, setSelectedDecision] = useState<ReviewDecision["decision"] | "">("");
  const [reason, setReason] = useState("");
  const decisionValidation = useMemo(() => validateHumanReviewDecision(selectedDecision, reason), [selectedDecision, reason]);

  return (
    <section className="workspace-card decision-section">
      <div className="section-heading-row">
        <div>
          <p className="section-kicker">Human Decision</p>
          <h2>Record review outcome</h2>
        </div>
        <Badge tone="info">Decision reason required</Badge>
      </div>
      <fieldset className="decision-options">
        <legend>Decision options</legend>
        {options.map((option) => (
          <label key={option} className="decision-option">
            <input
              type="radio"
              name="decision"
              checked={selectedDecision === option}
              onChange={() => setSelectedDecision(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
      <NoteTextArea
        label="Required decision reason"
        placeholder="Write the job-related evidence and verification notes that support this human decision."
        value={reason}
        onChange={(event) => setReason(event.currentTarget.value)}
        required
      />
      <div className="decision-footer">
        <p className="muted">
          Final decision must be based on job-related evidence and reviewed by a human. The system does not make the final hiring decision.
        </p>
        <Button disabled={!decisionValidation.valid}>Save decision</Button>
      </div>
    </section>
  );
}
