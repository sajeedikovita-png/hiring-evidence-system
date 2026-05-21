import React from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { NoteTextArea } from "../../../components/ui/NoteTextArea";

type HumanDecisionPanelProps = {
  options: string[];
};

export function HumanDecisionPanel({ options }: HumanDecisionPanelProps) {
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
            <input type="radio" name="decision" />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
      <NoteTextArea label="Required decision reason" placeholder="Write the job-related evidence and verification notes that support this human decision." />
      <div className="decision-footer">
        <p className="muted">Final decision must be based on job-related evidence and reviewed by a human.</p>
        <Button>Save decision</Button>
      </div>
    </section>
  );
}
