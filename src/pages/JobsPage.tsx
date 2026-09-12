import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.js";
import BriefcaseBusiness from "lucide-react/dist/esm/icons/briefcase-business.js";
import Plus from "lucide-react/dist/esm/icons/plus.js";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.js";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import { getAsyncHiringRepository } from "../services/hiringRepository";
import { createJobWithCriteria, type JobCriterionInput } from "../services/jobService";
import { createHiringSupabaseClient } from "../services/supabaseClient";

type JobListItem = { id: string; title: string; department: string; candidates: string };

export function JobsPage() {
  const client = useMemo(() => createHiringSupabaseClient(), []);
  const repository = useMemo(() => getAsyncHiringRepository(), []);
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [criteria, setCriteria] = useState<JobCriterionInput[]>([{ label: "", description: "", priority: "required" }]);
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [message, setMessage] = useState("Create a job with at least one job-related required criterion.");
  const [submitting, setSubmitting] = useState(false);

  async function reloadJobs() {
    try {
      const context = await repository.getActiveCompanyContext();
      const dashboard = await repository.getDashboardData(context.companyId, context.userId);
      setJobs(dashboard.recentJobs.map((job) => ({ id: job.id, title: job.title, department: job.department, candidates: job.candidates })));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load jobs.");
    }
  }

  useEffect(() => { void reloadJobs(); }, [repository]);

  function updateCriterion(index: number, field: "label" | "description" | "priority", value: string) {
    setCriteria((current) => current.map((criterion, currentIndex) => currentIndex === index
      ? { ...criterion, [field]: field === "priority" ? value as JobCriterionInput["priority"] : value }
      : criterion));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await createJobWithCriteria(client, { title, department, location, criteria });
      setMessage("Job created. It is ready for private candidate uploads.");
      setTitle("");
      setDepartment("");
      setLocation("");
      setCriteria([{ label: "", description: "", priority: "required" }]);
      await reloadJobs();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create job role.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RecruiterShell active="candidates" title="Jobs" subtitle="Set the role and job-related criteria before uploading candidate documents.">
      <main className="workspace-content jobs-page">
        <p className="workspace-status" role="status">{message}</p>
        <div className="jobs-layout">
          <section className="workspace-card job-create-card">
            <div className="section-heading-row">
              <div><p className="section-kicker">New review</p><h2>Create a job</h2><p className="muted">Criteria defined here become the evidence structure for every candidate report.</p></div>
              <span className="job-card-icon"><BriefcaseBusiness size={21} aria-hidden="true" /></span>
            </div>
            <form className="job-create-form" onSubmit={submit}>
              <fieldset className="job-details-fieldset">
                <legend>Job details</legend>
                <div className="job-detail-grid">
                  <label>Job title<input value={title} onChange={(event) => setTitle(event.currentTarget.value)} required /></label>
                  <label>Department <span>Optional</span><input value={department} onChange={(event) => setDepartment(event.currentTarget.value)} /></label>
                  <label>Location <span>Optional</span><input value={location} onChange={(event) => setLocation(event.currentTarget.value)} /></label>
                </div>
              </fieldset>
              <fieldset className="criteria-builder">
                <div className="criteria-builder-heading"><legend>What should this person be able to do?</legend><span>{criteria.length} of 12</span></div>
                <p className="criteria-builder-intro">
                  Add one job-related skill, responsibility, qualification, or experience at a time. The report will look for evidence of each item in the candidate documents.
                </p>
                <details className="criterion-example">
                  <summary>See a completed example</summary>
                  <dl>
                    <div><dt>Requirement name</dt><dd>Stakeholder communication</dd></div>
                    <div><dt>Evidence to look for</dt><dd>Examples of explaining requirements, risks, or delivery progress to clients or cross-functional teams.</dd></div>
                    <div><dt>Priority</dt><dd>Required when the person must demonstrate it; Preferred when it is useful but not essential.</dd></div>
                  </dl>
                </details>
                <div className="criteria-list">
                  {criteria.map((criterion, index) => (
                    <article className="criterion-card" key={index}>
                      <div className="criterion-number">{index + 1}</div>
                      <div className="criterion-fields">
                        <label>
                          Requirement name
                          <small>Use a short name your hiring team will recognise.</small>
                          <input value={criterion.label} onChange={(event) => updateCriterion(index, "label", event.currentTarget.value)} required={index === 0} placeholder="Example: Stakeholder communication" />
                        </label>
                        <label>
                          Evidence to look for
                          <small>Describe observable, job-related proof. Avoid personality impressions or personal characteristics.</small>
                          <input value={criterion.description} onChange={(event) => updateCriterion(index, "description", event.currentTarget.value)} placeholder="Example: Explaining requirements or risks to clients and project teams" />
                        </label>
                      </div>
                      <label className="criterion-priority">
                        Priority
                        <small>Must-have or useful?</small>
                        <select value={criterion.priority} onChange={(event) => updateCriterion(index, "priority", event.currentTarget.value)}><option value="required">Required</option><option value="preferred">Preferred</option></select>
                      </label>
                      {criteria.length > 1 ? <button type="button" className="criterion-remove" aria-label={`Remove criterion ${index + 1}`} onClick={() => setCriteria((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={17} aria-hidden="true" /></button> : null}
                    </article>
                  ))}
                </div>
                {criteria.length < 12 ? <button type="button" className="button button-secondary add-criterion-button" onClick={() => setCriteria((current) => [...current, { label: "", description: "", priority: "preferred" }])}><Plus size={17} aria-hidden="true" />Add criterion</button> : null}
              </fieldset>
              <div className="job-form-actions"><p>Add at least one requirement marked Required.</p><button className="button button-primary" disabled={submitting}>{submitting ? "Creating job" : "Create job"}</button></div>
            </form>
          </section>

          <section className="workspace-card existing-jobs-card">
            <div className="section-heading-row"><div><p className="section-kicker">Company roles</p><h2>Existing jobs</h2></div><span className="record-count">{jobs.length}</span></div>
            {jobs.length ? (
              <div className="existing-jobs-list">
                {jobs.map((job) => (
                  <article className="existing-job-row" key={job.id}>
                    <div><strong>{job.title}</strong><span>{job.department || "Department not set"} · {job.candidates}</span></div>
                    <div className="existing-job-actions"><Link to={`/jobs/${job.id}/candidates`}>Candidates <ArrowRight size={14} aria-hidden="true" /></Link><Link to={`/jobs/${job.id}/candidates/upload`}>Upload</Link></div>
                  </article>
                ))}
              </div>
            ) : <div className="empty-jobs-state"><BriefcaseBusiness size={25} aria-hidden="true" /><strong>No jobs yet</strong><p>Create the first role and its criteria to begin an evidence review.</p></div>}
          </section>
        </div>
      </main>
    </RecruiterShell>
  );
}
