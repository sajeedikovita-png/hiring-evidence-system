import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import { CandidateWorkflowPanel } from "../components/workflow/CandidateWorkflowPanel";
import { getAsyncHiringRepository } from "../services/hiringRepository";
import type { JobCandidateListViewModel } from "../types/hiring";

export function CandidateWorkflowWorkspace({ candidateList }: { candidateList: JobCandidateListViewModel }) {
  return <main className="workspace-content">
    <section className="dashboard-intro">
      <div>
        <p className="section-kicker">Company candidate workflow</p>
        <h2>{candidateList.job.title}</h2>
        <p>Organise the real candidates in this role by stage, reviewer, next action and due date. Workflow stages do not change a hiring decision.</p>
      </div>
      <Link className="button button-secondary" to={`/jobs/${candidateList.job.id}/candidates`}>View evidence and reports</Link>
    </section>
    <CandidateWorkflowPanel jobId={candidateList.job.id} candidates={candidateList.rows} />
  </main>;
}

export function CandidateWorkflowPage() {
  const { jobId = "" } = useParams();
  const repository = useMemo(() => getAsyncHiringRepository(), []);
  const [candidateList, setCandidateList] = useState<JobCandidateListViewModel>();
  const [reviewerName, setReviewerName] = useState("Reviewer");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setCandidateList(undefined);
    setError("");
    repository.getActiveCompanyContext()
      .then((context) => {
        if (active) setReviewerName(context.userName);
        return repository.getJobCandidateList(context.companyId, jobId);
      })
      .then((result) => {
        if (!active) return;
        if (!result) throw new Error("This role is not available in your company workspace.");
        setCandidateList(result);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load the candidate workflow.");
      });
    return () => { active = false; };
  }, [jobId, repository]);

  return <RecruiterShell active="workflow" title="Candidate workflow" subtitle="Manage stages and next actions for one company role." reviewerName={reviewerName}>
    {candidateList ? <CandidateWorkflowWorkspace candidateList={candidateList} /> : <main className="workspace-content">
      <section className="next-task" role={error ? "alert" : "status"}>
        <p className="section-kicker">Company candidate workflow</p>
        <h2>{error ? "Workflow cannot load" : "Loading candidate workflow"}</h2>
        <p>{error || "Checking the candidates available in this company role."}</p>
        {error ? <Link className="button button-secondary" to="/jobs">Return to Jobs</Link> : null}
      </section>
    </main>}
  </RecruiterShell>;
}
