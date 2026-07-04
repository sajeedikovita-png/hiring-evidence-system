import React, { FormEvent, useState } from "react";
import { Button } from "../../components/ui/Button";
import { PublicHeader } from "../components/layout/PublicHeader";
import {
  submitPilotRequest,
  validatePilotRequest,
  type PilotRequestErrors,
  type PilotRequestInput
} from "../services/pilotRequestService";

const initialPilotRequest: PilotRequestInput = {
  companyName: "",
  workEmail: "",
  requesterRole: "",
  hiringVolume: "",
  firstRoleToReview: "",
  note: ""
};

const hiringVolumeOptions = ["1-2 roles this quarter", "3-5 roles this quarter", "6-10 roles this quarter", "More than 10 roles"];

export function RequestPilotPage() {
  const [form, setForm] = useState<PilotRequestInput>(initialPilotRequest);
  const [errors, setErrors] = useState<PilotRequestErrors>({});
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "pending_contact">("idle");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof PilotRequestInput, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validatePilotRequest(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      setSubmissionStatus("idle");
      return;
    }

    setIsSubmitting(true);
    setSubmissionMessage("Submitting for human review.");

    try {
      const result = await submitPilotRequest(form);
      if (result.status === "validation_failed") {
        setErrors(result.errors);
        setSubmissionStatus("idle");
        return;
      }

      setForm(initialPilotRequest);
      setErrors({});
      setSubmissionStatus("pending_contact");
      setSubmissionMessage("");
    } catch (error) {
      setSubmissionStatus("idle");
      setSubmissionMessage(
        error instanceof Error ? error.message : "Unable to submit access request"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="public-page">
      <PublicHeader />
      <main className="pilot-page">
        <section className="pilot-hero">
          <div className="pilot-hero-copy">
            <p className="section-kicker">Pilot access</p>
            <h1>Start a controlled pilot with one role.</h1>
            <p>
              Use Hiring Evidence System to review job-related candidate evidence, missing proof, suggested verification
              questions, and human decision notes in one recruiter workflow.
            </p>
            <div className="pilot-trust-row" aria-label="Pilot safeguards">
              <span>Human review required</span>
              <span>Evidence found and evidence missing</span>
              <span>Decision reason required</span>
            </div>
          </div>

          <form className="pilot-form" onSubmit={handleSubmit}>
            <div>
              <p className="section-kicker">Request details</p>
              <h2>Tell us what to prepare for your pilot.</h2>
            </div>

            {submissionStatus === "pending_contact" ? (
              <div className="pilot-success" role="status">
                <strong>Access request pending human review.</strong>
                <span>An administrator must approve access before a login invitation is sent.</span>
              </div>
            ) : null}
            {submissionMessage ? (
              <p className="login-footnote" role="status">
                {submissionMessage}
              </p>
            ) : null}

            <label>
              Company name
              <input
                type="text"
                value={form.companyName}
                onChange={(event) => updateField("companyName", event.currentTarget.value)}
                placeholder="Northstar Digital"
                required
              />
              {errors.companyName ? <span className="form-error">{errors.companyName}</span> : null}
            </label>

            <label>
              Work email
              <input
                type="email"
                value={form.workEmail}
                onChange={(event) => updateField("workEmail", event.currentTarget.value)}
                placeholder="name@company.com"
                required
              />
              {errors.workEmail ? <span className="form-error">{errors.workEmail}</span> : null}
            </label>

            <label>
              Your role
              <input
                type="text"
                value={form.requesterRole}
                onChange={(event) => updateField("requesterRole", event.currentTarget.value)}
                placeholder="Head of Talent"
                required
              />
              {errors.requesterRole ? <span className="form-error">{errors.requesterRole}</span> : null}
            </label>

            <label>
              Hiring volume
              <select value={form.hiringVolume} onChange={(event) => updateField("hiringVolume", event.currentTarget.value)} required>
                <option value="">Choose volume</option>
                {hiringVolumeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.hiringVolume ? <span className="form-error">{errors.hiringVolume}</span> : null}
            </label>

            <label>
              First role to review
              <input
                type="text"
                value={form.firstRoleToReview}
                onChange={(event) => updateField("firstRoleToReview", event.currentTarget.value)}
                placeholder="Frontend Developer"
                required
              />
              {errors.firstRoleToReview ? <span className="form-error">{errors.firstRoleToReview}</span> : null}
            </label>

            <label>
              Pilot note
              <textarea
                value={form.note}
                onChange={(event) => updateField("note", event.currentTarget.value)}
                placeholder="Share the hiring workflow or evidence review problem you want to test."
                rows={4}
              />
            </label>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting request" : "Request pilot access"}
            </Button>
            <a className="button button-secondary" href="/reports/candidate-evidence">
              View sample report
            </a>
          </form>
        </section>
      </main>
    </div>
  );
}
