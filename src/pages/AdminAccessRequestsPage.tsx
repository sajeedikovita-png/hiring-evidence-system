import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import {
  approveAccessRequest,
  grantSpecialCompanyAccess,
  loadAdminAccessWorkspace,
  rejectAccessRequest,
  type AdminAccessWorkspace
} from "../services/accessApprovalService";

export function AdminAccessRequestsPage() {
  const [workspace, setWorkspace] = useState<AdminAccessWorkspace>();
  const [message, setMessage] = useState("Loading access requests.");
  const [reviewNote, setReviewNote] = useState("");
  const [activeRequestId, setActiveRequestId] = useState("");
  const [specialEmail, setSpecialEmail] = useState("");
  const [specialCompanyId, setSpecialCompanyId] = useState("");
  const [specialRole, setSpecialRole] = useState<"admin" | "recruiter" | "hiring_manager">("recruiter");
  const [specialReason, setSpecialReason] = useState("");
  const [transferExisting, setTransferExisting] = useState(false);
  const [isGrantingSpecialAccess, setIsGrantingSpecialAccess] = useState(false);

  async function refreshWorkspace() {
    try {
      const nextWorkspace = await loadAdminAccessWorkspace();
      setWorkspace(nextWorkspace);
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
    setMessage("Creating a separate pilot workspace and preparing the invitation.");

    try {
      await approveAccessRequest({ requestId });
      setMessage("Pilot workspace created. The invitation is ready or has been sent.");
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

  async function grantSpecialAccess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isGrantingSpecialAccess) return;
    setIsGrantingSpecialAccess(true);
    setMessage("Checking the user, company limit, and access history.");
    try {
      const result = await grantSpecialCompanyAccess({
        email: specialEmail,
        companyId: specialCompanyId,
        role: specialRole,
        reason: specialReason,
        transferExisting
      });
      setMessage(result.transferred
        ? "Special access transferred and recorded in the audit trail."
        : result.invitationPrepared
          ? "Special access recorded and an invitation was prepared for the new user."
          : "Special access recorded in the audit trail.");
      setSpecialEmail("");
      setSpecialReason("");
      setTransferExisting(false);
      await refreshWorkspace();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record special access.");
    } finally {
      setIsGrantingSpecialAccess(false);
    }
  }

  const pendingRequests = workspace?.requests.filter((request) => request.status === "pending") ?? [];

  return (
    <RecruiterShell
      active="access"
      title="Access requests"
      subtitle="A human administrator reviews every request before a login invitation is sent."
      reviewerName={workspace?.reviewerName ?? "Platform administrator"}
      showAccessRequests
    >
      <main className="workspace-content">
        <section className="dashboard-intro">
          <div>
            <p className="section-kicker">Permission control</p>
            <h2>Human administrator approval required</h2>
            <p>Approval creates a separate pilot workspace. The requester becomes its initial administrator.</p>
            <Link className="button button-secondary" to="/admin/paid-access-requests">Review ongoing access requests</Link>
          </div>
        </section>

        <section className="workspace-card access-approval-controls">
          <label>
            Rejection note
            <input
              value={reviewNote}
              onChange={(event) => setReviewNote(event.currentTarget.value)}
              placeholder="Explain why access is not being granted."
            />
          </label>
        </section>

        <section className="workspace-card special-access-panel">
          <div>
            <p className="section-kicker">Controlled exception</p>
            <h2>Special company access</h2>
            <p>Use this only to add an individual to an existing company or transfer their single active membership. Every change requires a reason and creates an audit record.</p>
          </div>
          <form className="special-access-form" onSubmit={grantSpecialAccess}>
            <label>
              User email
              <input type="email" value={specialEmail} onChange={(event) => setSpecialEmail(event.currentTarget.value)} required />
            </label>
            <label>
              Target company
              <select value={specialCompanyId} onChange={(event) => setSpecialCompanyId(event.currentTarget.value)} required>
                <option value="">Select active company</option>
                {workspace?.companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} · {company.activeMembers}/{company.userLimit ?? "Not set"} users
                  </option>
                ))}
              </select>
            </label>
            <label>
              Company role
              <select value={specialRole} onChange={(event) => setSpecialRole(event.currentTarget.value as typeof specialRole)}>
                <option value="recruiter">Recruiter</option>
                <option value="hiring_manager">Hiring manager</option>
                <option value="admin">Company administrator</option>
              </select>
            </label>
            <label>
              Required reason
              <textarea value={specialReason} onChange={(event) => setSpecialReason(event.currentTarget.value)} minLength={12} maxLength={1000} rows={3} required />
            </label>
            <label className="privacy-confirmation">
              <input type="checkbox" checked={transferExisting} onChange={(event) => setTransferExisting(event.currentTarget.checked)} />
              <span>Transfer this user if they currently belong to another company. Their previous company access will be disabled.</span>
            </label>
            <button className="button button-primary" type="submit" disabled={isGrantingSpecialAccess}>
              {isGrantingSpecialAccess ? "Recording special access" : "Grant special access"}
            </button>
          </form>
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
                  Create pilot workspace
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
