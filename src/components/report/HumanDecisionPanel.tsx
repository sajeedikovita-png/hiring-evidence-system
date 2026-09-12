import React, { useMemo, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { NoteTextArea } from "../../../components/ui/NoteTextArea";
import { validateHumanReviewDecision } from "../../services/reportService";
import type { HumanReviewDecision, ReviewDecision } from "../../types/hiring";

type HumanDecisionPanelProps = {
  options: ReviewDecision["decision"][];
  onSaveDecision?: (decision: ReviewDecision["decision"], reason: string) => Promise<{ valid: boolean; message?: string }>;
  readOnly?: boolean;
  readOnlyMessage?: string;
  latestDecision?: HumanReviewDecision;
};

export function HumanDecisionPanel({ options, onSaveDecision, readOnly = false, readOnlyMessage, latestDecision }: HumanDecisionPanelProps) {
  const [selectedDecision, setSelectedDecision] = useState<ReviewDecision["decision"] | "">("");
  const [reason, setReason] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const decisionValidation = useMemo(() => validateHumanReviewDecision(selectedDecision, reason), [selectedDecision, reason]);

  async function handleSaveDecision() {
    if (!selectedDecision || !decisionValidation.valid || !onSaveDecision) return;

    setIsSaving(true);
    try {
      const result = await onSaveDecision(selectedDecision, reason);
      setSaveMessage(result.valid ? "Recruiter decision recorded" : result.message ?? "Decision reason required");
    } catch {
      setSaveMessage("Decision save failed");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="workspace-card decision-section">
      <div className="section-heading-row">
        <div>
          <p className="section-kicker">Human Decision</p>
          <h2>Record review outcome</h2>
        </div>
        <Badge tone="info">{readOnly ? "Decision saving unavailable" : "Decision reason required"}</Badge>
      </div>
      <fieldset className="decision-options" disabled={readOnly}>
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
      {latestDecision ? (
        <section className="workspace-card" aria-label="Latest recorded decision">
          <p className="section-kicker">Latest recorded decision</p>
          <p><strong>{latestDecision.decision}</strong></p>
          <p className="muted">{latestDecision.reason}</p>
        </section>
      ) : null}
      <NoteTextArea
        label="Required decision reason"
        placeholder="Write the job-related evidence and verification notes that support this human decision."
        value={reason}
        onChange={(event) => setReason(event.currentTarget.value)}
        required
        disabled={readOnly}
      />
      <div className="decision-footer">
        <p className="muted">
          Final decision must be based on job-related evidence and reviewed by a human. The system does not make the final hiring decision.
        </p>
        {saveMessage ? <p className="muted">{saveMessage}</p> : null}
        {readOnlyMessage ? <p className="muted">{readOnlyMessage}</p> : null}
        <Button disabled={readOnly || !decisionValidation.valid || isSaving} onClick={handleSaveDecision}>
          {isSaving ? "Saving decision" : "Save decision"}
        </Button>
      </div>
    </section>
  );
}
