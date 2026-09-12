import React, { useEffect, useState } from "react";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import {
  listOngoingAccessRequests,
  reviewOngoingAccessRequest,
  type PlatformOngoingAccessRequest
} from "../services/pilotLifecycleService";

export function AdminPaidAccessRequestsPage() {
  const [requests, setRequests] = useState<PlatformOngoingAccessRequest[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("Loading ongoing access requests.");
  const [activeId, setActiveId] = useState("");

  async function refresh() {
    try {
      setRequests(await listOngoingAccessRequests());
      setMessage("");
    } catch {
      setMessage("Ongoing access requests could not load.");
    }
  }
  useEffect(() => { void refresh(); }, []);

  async function review(requestId: string, decision: "approve" | "reject") {
    const reviewNote = notes[requestId]?.trim() ?? "";
    if (!reviewNote) { setMessage("Enter a human review note before recording this decision."); return; }
    if (decision === "approve" && !confirmed[requestId]) { setMessage("Confirm the payment agreement before approving ongoing access."); return; }
    setActiveId(requestId);
    try {
      await reviewOngoingAccessRequest({ requestId, decision, reviewNote, paymentAgreementConfirmed: Boolean(confirmed[requestId]) });
      setMessage(decision === "approve" ? "Ongoing access approved. The customer can start the 30-day ongoing term." : "Ongoing access request rejected.");
      await refresh();
    } catch {
      setMessage("The review could not be recorded. Please try again.");
    } finally { setActiveId(""); }
  }

  return <RecruiterShell active="paid-access" title="Ongoing access requests" subtitle="A platform administrator records each payment agreement and decision." reviewerName="Platform administrator" showAccessRequests>
    <main className="workspace-content pilot-access-page">
      {message ? <p className="workspace-status" role="status">{message}</p> : null}
      <section className="access-request-grid" aria-label="Ongoing access requests">
        {requests.map((request) => {
          const isPending = request.status === "pending";
          const paymentConfirmed = request.status === "approved_pending_start" || request.status === "active" || request.status === "expired";

          return <article className="workspace-card access-request-card" key={request.id}>
            <p className="section-kicker">{request.status.replace(/_/g, " ")}</p><h2>{request.companyName}</h2><p>{request.requesterName} · {request.requesterEmail}</p>
            <p>Requested {new Date(request.requestedAt).toLocaleDateString("en-SG")}. Terms accepted {new Date(request.termsAcceptedAt).toLocaleDateString("en-SG")}.</p>
            <p className="workspace-status">Agreed price: S${request.ongoingMonthlySgd.toLocaleString("en-SG")} for 30 days{request.ongoingPricingTermNumber ? ` · pricing term ${request.ongoingPricingTermNumber}` : ""}.</p>
            {isPending ? <>
              <label>Review note<input value={notes[request.id] ?? ""} onChange={(event) => { const value = event.currentTarget.value; setNotes((current) => ({ ...current, [request.id]: value })); }} placeholder="Record the human review basis." /></label>
              <label className="checkbox-row"><input type="checkbox" checked={confirmed[request.id] ?? false} onChange={(event) => { const checked = event.currentTarget.checked; setConfirmed((current) => ({ ...current, [request.id]: checked })); }} /><span>Payment agreement confirmed</span></label>
              <div className="hero-actions"><button className="button button-primary" disabled={activeId === request.id} onClick={() => void review(request.id, "approve")}>Approve ongoing access</button><button className="button button-secondary" disabled={activeId === request.id} onClick={() => void review(request.id, "reject")}>Reject request</button></div>
            </> : <div className="workspace-status"><p>Review note: {request.reviewNote ?? "Not recorded"}</p><p>Payment agreement: {paymentConfirmed ? "Confirmed" : "Not confirmed"}</p></div>}
          </article>;
        })}
      </section>
    </main>
  </RecruiterShell>;
}
