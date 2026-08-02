import React, { FormEvent, useState } from "react";
import { Button } from "../../components/ui/Button";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import {
  createJobWithCriteria,
  emptyJobCriterion,
  emptyJobSetupInput,
  validateJobSetup,
  MAX_JOB_CRITERIA,
  type JobCriterionInput,
  type JobSetupErrors,
  type JobSetupInput
} from "../services/jobSetupService";
import { getPublicSupabaseClient } from "../services/publicSupabaseClient";

type SaveState = "idle" | "saving" | "saved";

export function CreateJobPage() {
  const client = getPublicSupabaseClient();
  const [form, setForm] = useState<JobSetupInput>(emptyJobSetupInput);
  const [errors, setErrors] = useState<JobSetupErrors>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [failureMessage, setFailureMessage] = useState("");

  function updateField(field: "title" | "department" | "location" | "employmentType", value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "title") setErrors((current) => ({ ...current, title: undefined }));
  }

  function updateCriterion(index: number, patch: Partial<JobCriterionInput>) {
    setForm((current) => ({
      ...current,
      criteria: current.criteria.map((criterion, position) =>
        position === index ? { ...criterion, ...patch } : criterion
      )
    }));
    setErrors((current) => ({ ...current, criteria: undefined }));
  }

  function addCriterion() {
    setForm((current) =>
      current.criteria.length >= MAX_JOB_CRITERIA
        ? current
        : { ...current, criteria: [...current.criteria, emptyJobCriterion()] }
    );
  }

  function removeCriterion(index: number) {
    setForm((current) => ({
      ...current,
      criteria: current.criteria.filter((_, position) => position !== index)
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailureMessage("");

    const validation = validateJobSetup(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    if (!client) {
      setFailureMessage("This workspace is not connected. Sign in and try again.");
      return;
    }

    setSaveState("saving");
    try {
      await createJobWithCriteria(client, form);
      setSaveState("saved");
    } catch (error) {
      // The form keeps everything typed so far — a failure must never cost the
      // recruiter their work.
      setSaveState("idle");
      setFailureMessage(error instanceof Error ? error.message : "The role could not be created. Please try again.");
    }
  }

  if (saveState === "saved") {
    return (
      <RecruiterShell active="dashboard" title="Role created" subtitle="Your workspace is ready for resumes.">
        <main className="workspace-content">
          <section className="workspace-card">
            <p className="section-kicker">Setup complete</p>
            <h2>{form.title} is ready for candidate resumes.</h2>
            <p className="muted">
              Every resume you upload is reviewed against the criteria you just set, and each report
              still requires a human decision with a written reason.
            </p>
            <div className="bulk-upload-actions">
              <a className="button button-primary" href="/jobs/frontend-developer/candidates/upload">
                Upload resumes
              </a>
              <a className="button button-secondary" href="/dashboard">
                Back to dashboard
              </a>
            </div>
          </section>
        </main>
      </RecruiterShell>
    );
  }

  return (
    <RecruiterShell
      active="dashboard"
      title="Create your first role"
      subtitle="Set the role and the job-related criteria every resume is reviewed against."
    >
      <main className="workspace-content">
        <form className="workspace-card" onSubmit={handleSubmit}>
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Role setup</p>
              <h2>What are you hiring for?</h2>
              <p className="muted">
                The criteria you write here become the evidence matrix on every candidate report, so
                keep them job-related and observable.
              </p>
            </div>
          </div>

          {failureMessage ? (
            <p className="form-error" role="alert">
              {failureMessage}
            </p>
          ) : null}

          <label>
            Role title
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateField("title", event.currentTarget.value)}
              placeholder="Frontend Developer"
              required
            />
            {errors.title ? <span className="form-error">{errors.title}</span> : null}
          </label>

          <label>
            Department
            <input
              type="text"
              value={form.department}
              onChange={(event) => updateField("department", event.currentTarget.value)}
              placeholder="Engineering"
            />
          </label>

          <label>
            Location
            <input
              type="text"
              value={form.location}
              onChange={(event) => updateField("location", event.currentTarget.value)}
              placeholder="Singapore"
            />
          </label>

          <label>
            Employment type
            <input
              type="text"
              value={form.employmentType}
              onChange={(event) => updateField("employmentType", event.currentTarget.value)}
              placeholder="Full time"
            />
          </label>

          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Criteria</p>
              <h2>What must a candidate be able to show?</h2>
              <p className="muted">
                Up to {MAX_JOB_CRITERIA}. Mark at least one as required. Write what evidence would
                prove it, not what kind of person you want.
              </p>
            </div>
          </div>

          {errors.criteria ? (
            <p className="form-error" role="alert">
              {errors.criteria}
            </p>
          ) : null}

          {form.criteria.map((criterion, index) => (
            <fieldset className="criterion-row" key={`criterion-${index}`}>
              <legend className="section-kicker">Criterion {index + 1}</legend>

              <label>
                Name
                <input
                  type="text"
                  value={criterion.label}
                  onChange={(event) => updateCriterion(index, { label: event.currentTarget.value })}
                  placeholder="React in production"
                />
              </label>

              <label>
                What would prove it
                <input
                  type="text"
                  value={criterion.description}
                  onChange={(event) => updateCriterion(index, { description: event.currentTarget.value })}
                  placeholder="Has shipped and maintained React applications in a work setting."
                />
              </label>

              <label>
                Priority
                <select
                  value={criterion.priority}
                  onChange={(event) =>
                    updateCriterion(index, { priority: event.currentTarget.value === "preferred" ? "preferred" : "required" })
                  }
                >
                  <option value="required">Required</option>
                  <option value="preferred">Preferred</option>
                </select>
              </label>

              {form.criteria.length > 1 ? (
                <button className="button button-secondary" type="button" onClick={() => removeCriterion(index)}>
                  Remove
                </button>
              ) : null}
            </fieldset>
          ))}

          <div className="bulk-upload-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={addCriterion}
              disabled={form.criteria.length >= MAX_JOB_CRITERIA}
            >
              Add criterion
            </button>
            <Button type="submit" disabled={saveState === "saving"}>
              {saveState === "saving" ? "Creating role" : "Create role"}
            </Button>
          </div>
        </form>
      </main>
    </RecruiterShell>
  );
}
