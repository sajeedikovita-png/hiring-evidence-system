import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import { createHiringSupabaseClient } from "../services/supabaseClient";
import { getAsyncHiringRepository } from "../services/hiringRepository";
import {
  createCandidatePrivacyRequestRepository,
  listWorkspacePrivacyCandidates,
  type CandidatePrivacyRequest,
  type CandidatePrivacyRequestDecision,
  type CandidatePrivacyRequestType,
  type WorkspacePrivacyCandidate
} from "../services/candidatePrivacyRequestService";

const requestLabels: Record<CandidatePrivacyRequestType, string> = { access: "Access information", correction: "Correct information", deletion: "Deletion guidance", withdrawal: "Withdraw consent" };
const statusLabels: Record<CandidatePrivacyRequest["status"], string> = { identity_verification_required: "Identity verification required", in_review: "In review", resolved: "Resolved", declined: "Declined" };

export function WorkspacePrivacyPage() {
  const repository = useMemo(() => getAsyncHiringRepository(), []);
  const client = useMemo(() => createHiringSupabaseClient(), []);
  const privacyRepository = useMemo(() => createCandidatePrivacyRequestRepository(client), [client]);
  const [companyName, setCompanyName] = useState("Company workspace");
  const [isAdmin, setIsAdmin] = useState(false);
  const [candidates, setCandidates] = useState<WorkspacePrivacyCandidate[]>([]);
  const [requests, setRequests] = useState<CandidatePrivacyRequest[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [requestType, setRequestType] = useState<CandidatePrivacyRequestType>("access");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [requestDetails, setRequestDetails] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [identityConfirmed, setIdentityConfirmed] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("Loading workspace privacy status.");
  const [isWorking, setIsWorking] = useState(false);

  async function loadRequests() { if (isAdmin) setRequests(await privacyRepository.list()); }

  useEffect(() => {
    let mounted = true;
    repository.getActiveCompanyContext().then(async (context) => {
      if (!mounted) return;
      setCompanyName(context.companyName);
      setIsAdmin(context.role === "admin");
      const nextCandidates = await listWorkspacePrivacyCandidates(client);
      if (!mounted) return;
      setCandidates(nextCandidates);
      if (context.role === "admin") setRequests(await privacyRepository.list());
      setMessage("");
    }).catch((error) => { if (mounted) setMessage(error instanceof Error ? error.message : "Workspace privacy status is unavailable."); });
    return () => { mounted = false; };
  }, [client, privacyRepository, repository]);

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsWorking(true);
    try {
      await privacyRepository.create({ candidateId, requestType, requesterEmail, requestDetails });
      setCandidateId(""); setRequestDetails("");
      setMessage("Privacy request recorded for identity verification. No candidate data was exported, corrected, withdrawn, or deleted.");
      await loadRequests();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to record the privacy request."); }
    finally { setIsWorking(false); }
  }

  async function reviewRequest(requestId: string, decision: CandidatePrivacyRequestDecision) {
    const reviewNote = reviewNotes[requestId]?.trim() ?? "";
    const identityVerified = identityConfirmed[requestId] === true;
    if (!reviewNote) { setMessage("Enter a written human review note before recording this action."); return; }
    if (decision === "verify_identity" && !identityVerified) { setMessage("Confirm identity verification before moving the request to review."); return; }
    setIsWorking(true);
    try {
      await privacyRepository.review({ requestId, decision, reviewNote, identityVerified });
      setMessage(decision === "verify_identity" ? "Identity verification recorded. The request is now in review." : "Privacy request outcome recorded. Data is unchanged by this record.");
      await loadRequests();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to record the privacy review."); }
    finally { setIsWorking(false); }
  }

  return <RecruiterShell active="privacy" title="Privacy and data" subtitle="Review workspace safeguards and manage candidate information requests.">
    <main className="workspace-content workspace-privacy-page">
      {message ? <p className="workspace-status" role="status">{message}</p> : null}
      <section className="dashboard-intro privacy-intro"><div><p className="section-kicker">{companyName}</p><h2>Keep candidate data requests clear and attributable.</h2><p>This workspace records a reviewed request and its human outcome. It does not certify legal compliance or replace your company’s notices, approvals, or retention decisions.</p></div><ShieldCheck size={42} aria-hidden="true" /></section>
      <section className="privacy-status-grid" aria-label="Workspace privacy status"><article className="workspace-card privacy-status-card"><strong>Company-scoped access</strong><span>Workspace records are restricted to the approved company context.</span></article><article className="workspace-card privacy-status-card"><strong>Private candidate sources</strong><span>Uploaded candidate documents use private workspace storage.</span></article><article className="workspace-card privacy-status-card"><strong>Identity confirmation</strong><span>Admins must confirm identity and record a written review note.</span></article><article className="workspace-card privacy-status-card"><strong>Resolution is separate</strong><span>A request record does not itself export, correct, withdraw, or delete candidate data.</span></article></section>
      <section className="workspace-card privacy-request-card"><div className="section-heading-row"><div><p className="section-kicker">Candidate data request</p><h2>Record a request for review</h2></div><span className="badge badge-neutral">Human review required</span></div><p className="muted">Select a candidate already in this company workspace. The request is recorded for identity verification; any later data action requires a separate approved process.</p><form className="login-form privacy-request-form" onSubmit={(event) => void submitRequest(event)}><label>Candidate<select value={candidateId} onChange={(event) => setCandidateId(event.currentTarget.value)} required><option value="">Select candidate</option>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label><label>Request type<select value={requestType} onChange={(event) => setRequestType(event.currentTarget.value as CandidatePrivacyRequestType)}>{Object.entries(requestLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Authorised requester work email<input type="email" value={requesterEmail} onChange={(event) => setRequesterEmail(event.currentTarget.value)} required /></label><label>Request details<textarea rows={5} maxLength={2000} value={requestDetails} onChange={(event) => setRequestDetails(event.currentTarget.value)} placeholder="Describe the request without adding unrelated sensitive data." /></label><button className="button button-primary" type="submit" disabled={isWorking || !candidates.length}>{isWorking ? "Recording request" : "Record privacy request"}</button></form></section>
      {isAdmin ? <section className="workspace-card privacy-request-card"><div className="section-heading-row"><div><p className="section-kicker">Administrator review</p><h2>Candidate privacy requests</h2></div><span className="badge badge-neutral">Admin only</span></div>{requests.length ? <div className="privacy-request-list">{requests.map((request) => <article className="privacy-request-row" key={request.id}><div><strong>{request.candidateName ?? request.candidateId}</strong><span>{requestLabels[request.requestType]} · {request.requesterEmail}</span><span>{statusLabels[request.status]}</span>{request.requestDetails ? <p>{request.requestDetails}</p> : null}{request.resolutionNote ? <p>Review note: {request.resolutionNote}</p> : null}</div>{request.status === "identity_verification_required" || request.status === "in_review" ? <div className="privacy-review-controls"><textarea rows={3} maxLength={2000} placeholder="Written human review note" value={reviewNotes[request.id] ?? ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [request.id]: event.currentTarget.value }))} />{request.status === "identity_verification_required" ? <label className="checkbox-row"><input type="checkbox" checked={identityConfirmed[request.id] ?? false} onChange={(event) => setIdentityConfirmed((current) => ({ ...current, [request.id]: event.currentTarget.checked }))} /><span>Identity verified</span></label> : null}<div className="hero-actions">{request.status === "identity_verification_required" ? <button className="button button-primary" type="button" disabled={isWorking} onClick={() => void reviewRequest(request.id, "verify_identity")}>Verify identity</button> : null}{request.status === "in_review" ? <button className="button button-primary" type="button" disabled={isWorking} onClick={() => void reviewRequest(request.id, "resolve")}>Record resolved</button> : null}<button className="button button-secondary" type="button" disabled={isWorking} onClick={() => void reviewRequest(request.id, "decline")}>Decline</button></div></div> : null}</article>)}</div> : <p className="muted">No privacy requests have been recorded for this company.</p>}</section> : null}
      <aside className="workspace-card privacy-boundary-card"><p className="section-kicker">Operating boundary</p><h2>Human review remains required</h2><p>Confirm requester authority, identity, and the company’s instructions before taking any separate access, correction, withdrawal, or deletion action.</p><Link className="table-link" to="/privacy">Read the public privacy notice</Link></aside>
    </main>
  </RecruiterShell>;
}
