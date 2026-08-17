import React, { useEffect, useState } from "react";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import {
  approveAccessRequest,
  loadAdminAccessWorkspace,
  rejectAccessRequest,
  type AdminAccessWorkspace,
  type ApprovedRecruiterRole
} from "../services/accessApprovalService";

export function AdminAccessRequestsPage() {
  const [workspace, setWorkspace] = useState<AdminAccessWorkspace>();
  const [message, setMessage] = useState("Loading access requests.");
  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState<ApprovedRecruiterRole>("recruiter");
  const [reviewNote, setReviewNote] = useState("");
  const [activeRequestId, setActiveRequestId] = useState("");

  async function refreshWorkspace() {
    try {
      const nextWorkspace = await loadAdminAccessWorkspace();
      setWorkspace(nextWorkspace);
      setCompanyId((current) => current || nextWorkspace.companies[0]?.id || "");
      setMessage(
        nextWorkspace.requests.length
          ? ""
          : "No access requests have been submitted."
      );
    } catch (error) {
      setWorkspace(undefined);
      setMessage(
        error instanceof Error ? error.message : "Human administrator approval required."
      );
    }
  }

  useEffect(() => {
    void refreshWorkspace();
  }, []);

  async function approve(requestId: string) {
    setActiveRequestId(requestId);
    setMessage("Approving access and preparing the invitation.");

    try {
      if (!companyId) throw new Error("Choose an existing company.");
      await approveAccessRequest({ requestId, companyId, role });
      setMessage("Access approved. The invitation is ready or has been sent.");
      await refreshWorkspace();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to approve access.");
    } finally {
      setActiveRequestId("");
    }
  }

  async function reject(requestId: string) {
    setActiveRequestId(requestId);
    setMessage("Recording the administrator review.");

    try {
      if (!reviewNote.trim()) throw new Error("Enter a review note before rejecting.");
      await rejectAccessRequest({ requestId, reviewNote });
      setReviewNote("");
      setMessage("Access request rejected.");
      await refreshWorkspace();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to reject access.");
    } finally {
      setActiveRequestId("");
    }
  }

  const pendingRequests = workspace?.requests.filter((request) => request.status === "pending") ?? [];

  return (
    <RecruiterShell
      active="access"
      title="Access requests"
      subtitle="A human administrator reviews every request before a login invitation is sent."
      reviewerName={workspace?.reviewerName ?? "Administrator"}
      showAccessRequests
    >
      <main className="workspace-content">
        <section className="dashboard-intro">
          <div>
            <p className="section-kicker">Permission control</p>
            <h2>Human administrator approval required</h2>
            <p>The browser never creates Auth users. Approval calls a server-side Supabase Edge Function.</p>
          </div>
        </section>

        <section className="workspace-card access-approval-controls">
          <label>
            Existing company
            <select value={companyId} onChange={(event) => setCompanyId(event.currentTarget.value)}>
              <option value="">Choose company</option>
              {(workspace?.companies ?? []).map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Approved role
            <select
              value={role}
              onChange={(event) => setRole(event.currentTarget.value as ApprovedRecruiterRole)}
            >
              <option value="recruiter">Recruiter</option>
              <option value="hiring_manager">Hiring manager</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          <label>
            Rejection note
            <input
              value={reviewNote}
              onChange={(event) => setReviewNote(event.currentTarget.value)}
              placeholder="Explain why access is not being granted."
            />
          </label>
        </section>

        {message ? (
          <p className="workspace-status" role="status">
            {message}
          </p>
        ) : null}

        <section className="access-request-grid" aria-label="Pending access requests">
          {pendingRequests.map((request) => (
            <article className="workspace-card access-request-card" key={request.id}>
              <div>
                <p className="section-kicker">Pending human review</p>
                <h3>{request.companyName}</h3>
                <p>{request.workEmail}</p>
              </div>
              <dl>
                <div>
                  <dt>Requester role</dt>
                  <dd>{request.requesterRole}</dd>
                </div>
                <div>
                  <dt>Hiring volume</dt>
                  <dd>{request.hiringVolume}</dd>
                </div>
                <div>
                  <dt>First role</dt>
                  <dd>{request.firstRoleToReview}</dd>
                </div>
              </dl>
              {request.note ? <p>{request.note}</p> : null}
              <div className="hero-actions">
                <button
                  className="button button-primary"
                  type="button"
                  disabled={activeRequestId === request.id}
                  onClick={() => void approve(request.id)}
                >
                  Approve and invite
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={activeRequestId === request.id}
                  onClick={() => void reject(request.id)}
                >
                  Reject request
                </button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </RecruiterShell>
  );
}
