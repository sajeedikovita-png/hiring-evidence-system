import { CandidateInterviewPanel } from "./CandidateInterviewPanel";
import { CandidateInternalNotesPanel } from "./CandidateInternalNotesPanel";
import React, { useEffect, useRef, useState } from "react";
import { CANDIDATE_WORKFLOW_STAGES, candidateWorkflowStageLabels, listCandidateWorkflows, listCandidateWorkflowEvents, saveCandidateWorkflow, type CandidateWorkflow, type CandidateWorkflowStage } from "../../services/candidateWorkflowService";

type Candidate = { applicationId: string; candidateName: string };
type Data = Awaited<ReturnType<typeof listCandidateWorkflows>>;
type Events = Awaited<ReturnType<typeof listCandidateWorkflowEvents>>;
export const candidateWorkflowPanelService = { listCandidateWorkflows, listCandidateWorkflowEvents, saveCandidateWorkflow };
type Draft = { stage: CandidateWorkflowStage; assignedProfileId: string; nextAction: string; due: string };
export function workflowLocalDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
/** Read the browser's submitted wall time; native date editors may not emit React change before submit. */
export function workflowSubmittedDue(form: Pick<FormData, "get">): { local: string; utc: string | null } {
  const value = form.get("workflowDue");
  const local = typeof value === "string" ? value : "";
  if (!local) return { local, utc: null };
  const date = new Date(local);
  if (!Number.isFinite(date.getTime())) throw new Error("Choose a valid due date and time.");
  if (workflowLocalDate(date.toISOString()) !== local) throw new Error("This local time does not exist in your timezone, or is invalid. Choose another due date and time.");
  return { local, utc: date.toISOString() };
}
export function workflowIsOverdue(workflow: CandidateWorkflow, now = Date.now()) { return workflow.stage !== "closed" && !!workflow.dueAt && new Date(workflow.dueAt).getTime() < now; }
export function uniqueWorkflowCandidates(candidates: Candidate[]) { return [...new Map(candidates.map(candidate => [candidate.applicationId, candidate])).values()]; }
function initialWorkflow(applicationId: string): CandidateWorkflow { return { applicationId, stage: "new", assignedProfileId: null, nextAction: "", dueAt: null, version: 0, updatedAt: null }; }
function draftFor(workflow: CandidateWorkflow): Draft { return { stage: workflow.stage, assignedProfileId: workflow.assignedProfileId ?? "", nextAction: workflow.nextAction, due: workflowLocalDate(workflow.dueAt) }; }
function errorText(error: unknown) { return error instanceof Error ? error.message : "Unable to load candidate workflow. Please try again."; }
function displayDate(value: string) { return new Date(value).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
export function workflowChanges(previous: CandidateWorkflow | null, state: CandidateWorkflow, reviewers: Data["reviewers"], labels = candidateWorkflowStageLabels): string[] {
  const before = previous ?? initialWorkflow(state.applicationId);
  const owner = (id: string | null) => id ? reviewers.find(person => person.id === id)?.name ?? "Former reviewer" : "Unassigned";
  const changes: string[] = [];
  if (before.stage !== state.stage) changes.push(`Stage: ${labels[before.stage]} → ${labels[state.stage]}`);
  if (before.assignedProfileId !== state.assignedProfileId) changes.push(`Reviewer: ${owner(before.assignedProfileId)} → ${owner(state.assignedProfileId)}`);
  if (before.nextAction !== state.nextAction) changes.push(`Next action: ${state.nextAction || "Cleared"}`);
  if (before.dueAt !== state.dueAt) changes.push(`Due: ${state.dueAt ? displayDate(state.dueAt) : "Cleared"}`);
  return changes.length ? changes : ["Workflow saved"];
}
export function CandidateWorkflowActivity({ events, reviewers, labels = candidateWorkflowStageLabels }: { events: Events; reviewers: Data["reviewers"]; labels?: Record<CandidateWorkflowStage, string> }) {
  return events.length ? <ol className="workflow-activity">{events.map(event => <li key={event.id}><strong>{event.actorName || "Former reviewer"}</strong> · <time dateTime={event.createdAt}>{displayDate(event.createdAt)}</time><ul>{workflowChanges(event.previousState, event.state, reviewers, labels).map(change => <li key={change}>{change}</li>)}</ul></li>)}</ol> : <p>No workflow changes recorded yet.</p>;
}
export function CandidateWorkflowPanel({ jobId, candidates, service = candidateWorkflowPanelService }: { jobId: string; candidates: Candidate[]; service?: typeof candidateWorkflowPanelService }) {
  const [data, setData] = useState<Data | null>(null);
  const [loadedJob, setLoadedJob] = useState("");
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [stage, setStage] = useState<CandidateWorkflowStage | "all">("all");
  const [mine, setMine] = useState(false);
  const [overdue, setOverdue] = useState(false);
  const [interviewCandidate, setInterviewCandidate] = useState("");
  const [notesCandidate, setNotesCandidate] = useState("");
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState<Draft>(draftFor(initialWorkflow("")));
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const [events, setEvents] = useState<Events>([]);
  const [historyError, setHistoryError] = useState("");
  const [historyBusy, setHistoryBusy] = useState(false);
  const [now, setNow] = useState(Date.now);
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const generation = useRef(0);
  const historyGeneration = useRef(0);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (selected) editorHeading.current?.focus(); else returnFocus.current?.focus(); }, [selected]);
  useEffect(() => {
    const token = ++generation.current;
    setData(null); setInterviewCandidate(""); setNotesCandidate(""); setLoadError(""); setSelected(""); setBusy(false); setNotice(""); setSaveError("");
    setStage("all"); setMine(false); setOverdue(false);
    service.listCandidateWorkflows(jobId).then(value => { if (generation.current === token) { setData(value); setLoadedJob(jobId); } }).catch(error => { if (generation.current === token) setLoadError(errorText(error)); });
    return () => { generation.current++; historyGeneration.current++; };
  }, [jobId, reload, service]);
  const currentData = loadedJob === jobId ? data : null;
  const workflowReady = Boolean(currentData);
  useEffect(() => {
    if (workflowReady && window.location.hash === "#candidate-workflow") {
      document.getElementById("candidate-workflow")?.scrollIntoView({ block: "start" });
    }
  }, [jobId, workflowReady]);
  const unique = uniqueWorkflowCandidates(candidates);
  const workflows = new Map(currentData?.workflows.map(workflow => [workflow.applicationId, workflow]));
  const available = unique.filter(candidate => workflows.has(candidate.applicationId));
  const getWorkflow = (id: string) => workflows.get(id)!;
  const filtered = available.filter(candidate => { const workflow = getWorkflow(candidate.applicationId); return (stage === "all" || workflow.stage === stage) && (!mine || workflow.assignedProfileId === currentData?.currentProfileId) && (!overdue || workflowIsOverdue(workflow, now)); });
  async function loadHistory(applicationId: string) {
    const token = ++historyGeneration.current;
    setEvents([]); setHistoryError(""); setHistoryBusy(true);
    try { const result = await service.listCandidateWorkflowEvents(applicationId); if (historyGeneration.current === token) setEvents(result); }
    catch (error) { if (historyGeneration.current === token) setHistoryError(errorText(error)); }
    finally { if (historyGeneration.current === token) setHistoryBusy(false); }
  }
  function openEditor(id: string, trigger: HTMLButtonElement) { if (!workflows.has(id)) return; returnFocus.current = trigger; setSelected(id); setDraft(draftFor(getWorkflow(id))); setSaveError(""); setNotice(""); void loadHistory(id); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!currentData?.canEdit || !selected || busy || !workflows.has(selected)) return;
    const submittedForm = new FormData(event.currentTarget);
    const token = generation.current;
    const applicationId = selected;
    setBusy(true); setSaveError(""); setNotice("");
    try {
      const submittedDue = workflowSubmittedDue(submittedForm);
      setDraft(current => ({ ...current, due: submittedDue.local }));
      const dueAt = submittedDue.utc;
      const result = await service.saveCandidateWorkflow({ applicationId, stage: draft.stage, assignedProfileId: draft.assignedProfileId || null, nextAction: draft.nextAction, dueAt, expectedVersion: getWorkflow(applicationId).version });
      if (generation.current !== token) return;
      setData(current => current ? { ...current, workflows: [...current.workflows.filter(item => item.applicationId !== applicationId), result] } : current);
      setDraft(draftFor(result)); setNotice("Workflow saved. Hiring decision unchanged."); void loadHistory(applicationId);
    } catch (error) { if (generation.current === token) setSaveError(errorText(error)); }
    finally { if (generation.current === token) setBusy(false); }
  }
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return <section id="candidate-workflow" className="workspace-card candidate-workflow" aria-labelledby="workflow-title">
    <header><p className="section-kicker">Recruiter workspace</p><h2 id="workflow-title">Candidate stages and next steps</h2><p>Organise the work around each candidate. Stages do not change hiring decisions. Due dates do not send automatic reminders.</p></header>
    {loadError ? <div role="alert"><p>{loadError}</p><button type="button" className="button" onClick={() => setReload(value => value + 1)}>Retry workflow loading</button></div> : !currentData ? <p role="status">Loading candidate workflow…</p> : <>
      <div className="workflow-counts" aria-label="Candidate counts by stage">{currentData.stageOrder.map(value => <span key={value}>{currentData.stageLabels[value]} <strong>{available.filter(candidate => getWorkflow(candidate.applicationId).stage === value).length}</strong></span>)}</div>
      <div className="workflow-filters"><label>Stage<select value={stage} onChange={event => setStage(event.target.value as typeof stage)}><option value="all">All stages</option>{currentData.stageOrder.map(value => <option key={value} value={value}>{currentData.stageLabels[value]}</option>)}</select></label><label><input type="checkbox" checked={mine} onChange={event => setMine(event.target.checked)} /> My work</label><label><input type="checkbox" checked={overdue} onChange={event => setOverdue(event.target.checked)} /> Overdue</label></div>
      {available.length < unique.length && <p role="status">{unique.length - available.length} candidate application(s) are unavailable for workflow review. Refresh the candidate list to check their current access.</p>}
      {!currentData.canEdit && <p>Workflow is read only for your current access.</p>}
      {!unique.length ? <p>Upload candidates to start organising the review.</p> : !filtered.length ? <p>No candidates match these filters.</p> : <ul className="workflow-candidates">{filtered.map(candidate => { const workflow = getWorkflow(candidate.applicationId); const reviewer = currentData.reviewers.find(person => person.id === workflow.assignedProfileId); return <li key={candidate.applicationId}><div><strong>{candidate.candidateName}</strong><p>{currentData.stageLabels[workflow.stage]} · {workflow.assignedProfileId ? reviewer?.name ?? "Former reviewer" : "Unassigned"}{workflow.assignedProfileId && !reviewer?.isActive ? " · Reassignment needed" : ""}</p>{workflow.nextAction && <p>{workflow.nextAction}</p>}{workflow.dueAt && <p className={workflowIsOverdue(workflow, now) ? "workflow-overdue" : ""}>{workflowIsOverdue(workflow, now) ? "Overdue · " : "Due · "}<time dateTime={workflow.dueAt}>{displayDate(workflow.dueAt)}</time> ({timezone})</p>}</div><button type="button" className="button" disabled={busy || !!selected || !!notesCandidate || !!interviewCandidate} onClick={event => openEditor(candidate.applicationId, event.currentTarget)}>{currentData.canEdit ? "Manage" : "View history"}<span className="workflow-sr-only"> {candidate.candidateName}</span></button><button type="button" className="button" disabled={busy || !!selected || !!notesCandidate || !!interviewCandidate} onClick={() => setNotesCandidate(candidate.applicationId)}>Internal notes<span className="workflow-sr-only"> {candidate.candidateName}</span></button><button type="button" className="button button-primary" disabled={busy || !!selected || !!notesCandidate || !!interviewCandidate} onClick={() => setInterviewCandidate(candidate.applicationId)}>Interview &amp; verification<span className="workflow-sr-only"> {candidate.candidateName}</span></button></li>; })}</ul>}
      {interviewCandidate && <CandidateInterviewPanel key={interviewCandidate} applicationId={interviewCandidate} candidateName={unique.find(candidate => candidate.applicationId === interviewCandidate)?.candidateName ?? "Candidate"} onClose={() => setInterviewCandidate("")} />}
      {notesCandidate && <CandidateInternalNotesPanel key={notesCandidate} applicationId={notesCandidate} candidateName={unique.find(candidate => candidate.applicationId === notesCandidate)?.candidateName ?? "Candidate"} onClose={() => setNotesCandidate("")} />}
      {selected && <div className="workflow-editor"><h3 ref={editorHeading} tabIndex={-1}>{unique.find(candidate => candidate.applicationId === selected)?.candidateName ?? "Candidate"} · Workflow</h3><p>Times below use {timezone} and are saved in UTC.</p><form onSubmit={save}><fieldset disabled={busy || !currentData.canEdit}><div className="workflow-fields"><label>Stage<select value={draft.stage} onChange={event => setDraft({ ...draft, stage: event.target.value as CandidateWorkflowStage })}>{currentData.stageOrder.map(value => <option key={value} value={value}>{currentData.stageLabels[value]}</option>)}</select></label><label>Assigned reviewer<select value={draft.assignedProfileId} onChange={event => setDraft({ ...draft, assignedProfileId: event.target.value })}><option value="">Unassigned</option>{currentData.reviewers.filter(person => person.isActive || person.id === draft.assignedProfileId).map(person => <option key={person.id} value={person.id} disabled={!person.isActive}>{person.name}{person.isActive ? "" : " — Reassignment needed"}</option>)}{draft.assignedProfileId && !currentData.reviewers.some(person => person.id === draft.assignedProfileId) && <option value={draft.assignedProfileId} disabled>Former reviewer — Reassignment needed</option>}</select></label></div><label>Next action<textarea value={draft.nextAction} maxLength={500} placeholder="Ask the candidate to explain their role in the payment integration." onChange={event => setDraft({ ...draft, nextAction: event.target.value })} /></label><label>Due date and time ({timezone})<input name="workflowDue" type="datetime-local" value={draft.due} onInput={event => { const due = event.currentTarget.value; setDraft(current => ({ ...current, due })); }} onChange={event => { const due = event.currentTarget.value; setDraft(current => ({ ...current, due })); }} /></label></fieldset><div className="workflow-actions">{currentData.canEdit && <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Saving workflow…" : "Save workflow"}</button>}<button className="button" type="button" disabled={busy} onClick={() => { historyGeneration.current++; setSelected(""); }}>{currentData.canEdit ? "Close / discard unsaved changes" : "Close history"}</button></div></form>{saveError && <div role="alert"><p>{saveError} Your unsaved changes remain in the form.</p><button type="button" className="button" disabled={busy} onClick={() => setReload(value => value + 1)}>Discard draft and reload latest workflows</button></div>}{notice && <p role="status">{notice}</p>}<h4>Workflow activity</h4>{historyBusy ? <p role="status">Loading activity…</p> : historyError ? <div role="alert"><p>{historyError}</p><button className="button" type="button" onClick={() => void loadHistory(selected)}>Retry activity</button></div> : <CandidateWorkflowActivity events={events} reviewers={currentData.reviewers} labels={currentData.stageLabels} />}</div>}
    </>}
  </section>;
}
