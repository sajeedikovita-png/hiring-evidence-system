import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import { getAsyncHiringRepository } from "../services/hiringRepository";
import type { JobRow } from "../types/hiring";

export function WorkflowHubContent({ jobs }: { jobs: JobRow[] }) {
  return <main className="workspace-content">
    <section className="next-task">
      <p className="section-kicker">Team responsibility</p>
      <h2>See who owns each candidate’s next step</h2>
      <p>Open a role to assign a reviewer, record the next action and due date, and inspect who made earlier workflow changes. Hiring decisions remain separate and require a human reason.</p>
    </section>
    <section className="workspace-card existing-jobs-card">
      <div className="section-heading-row"><div><p className="section-kicker">Role workflows</p><h2>Choose a candidate workflow</h2></div><span className="record-count" aria-label={`${jobs.length} roles`}>{jobs.length}</span></div>
      {jobs.length ? <div className="existing-jobs-list">{jobs.map((job) => <article className="existing-job-row" key={job.id}>
        <div><strong>{job.title}</strong><span>{job.department || "Department not set"} · {job.candidates} · {job.status === "closed" ? "Closed" : "Open"}</span></div>
        <div className="workflow-hub-actions"><Link className="button button-primary" to={`/jobs/${job.id}/workflow`}>Open workflow board</Link><Link to={job.candidateListPath}>Evidence and reports</Link></div>
      </article>)}</div> : <div className="empty-jobs-state"><strong>No role workflows yet</strong><p>Create a job and upload candidates before assigning workflow responsibilities.</p><Link className="button button-primary" to="/jobs">Create a job</Link></div>}
    </section>
  </main>;
}

export function WorkflowHubPage() {
  const repository = useMemo(() => getAsyncHiringRepository(), []);
  const [jobs, setJobs] = useState<JobRow[]>();
  const [reviewerName, setReviewerName] = useState("Reviewer");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    repository.getActiveCompanyContext().then((context) => {
      if (active) setReviewerName(context.userName);
      return repository.getDashboardData(context.companyId, context.userId);
    }).then((dashboard) => { if (active) setJobs(dashboard.recentJobs); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load company workflows."); });
    return () => { active = false; };
  }, [repository]);
  return <RecruiterShell active="workflow" title="Workflow" subtitle="Assign responsibility and track the next action for every candidate." reviewerName={reviewerName}>
    {jobs ? <WorkflowHubContent jobs={jobs} /> : <main className="workspace-content"><section className="next-task" role={error ? "alert" : "status"}><p className="section-kicker">Team workflow</p><h2>{error ? "Workflows cannot load" : "Loading company workflows"}</h2><p>{error || "Checking the roles available in this company workspace."}</p></section></main>}
  </RecruiterShell>;
}
