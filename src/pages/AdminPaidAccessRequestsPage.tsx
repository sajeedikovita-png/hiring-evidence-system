import React, { useEffect, useState } from "react";
import { confirmFoundingPayment } from "../services/foundingPriceService";
import { loadAdminAccessWorkspace, type CompanyAccessOption } from "../services/accessApprovalService";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import {
  listOngoingAccessRequests,
  reviewOngoingAccessRequest,
  type PlatformOngoingAccessRequest
} from "../services/pilotLifecycleService";

export function AdminPaidAccessRequestsPage() {
  const [companies, setCompanies] = useState<CompanyAccessOption[]>([]);
  const [paidCompany, setPaidCompany] = useState("");
  const [paidDate, setPaidDate] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentVerified, setPaymentVerified] = useState(false);
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

  async function recordFoundingPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!paymentVerified) return;
    setActiveId("founding-payment");
    try {
      const result = await confirmFoundingPayment({ companyId: paidCompany, paidAt: new Date(paidDate).toISOString(), paymentReference });
      setMessage(`Founding place ${result.founderSlot} recorded. Price protected until ${new Date(result.priceLockEndsAt).toLocaleDateString("en-SG")}. No payment was collected by this form.`);
      setPaymentReference(""); setPaymentVerified(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Payment confirmation could not be recorded."); }
    finally { setActiveId(""); }
  }

  return <RecruiterShell active="paid-access" title="Ongoing access requests" subtitle="A platform administrator records each payment agreement and decision." reviewerName="Platform administrator" showAccessRequests>
    <main className="workspace-content pilot-access-page">
      {message ? <p className="workspace-status" role="status">{message}</p> : null}
      <section className="workspace-card">
        <p className="section-kicker">First five paying companies</p><h2>Record verified founding payment</h2>
        <p>For companies on the new S$149 plan only. Verify a received payment before recording its reference. Eligibility and the 12-month price protection are checked by the server. This form does not collect money or change an existing agreement.</p>
        <form className="login-form" onSubmit={(event) => void recordFoundingPayment(event)}>
          <label>Company<select required value={paidCompany} onChange={(event) => setPaidCompany(event.currentTarget.value)}><option value="">Select a company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label>Payment received (local time)<input type="datetime-local" required value={paidDate} onChange={(event) => setPaidDate(event.currentTarget.value)} /></label>
          <label>Payment reference<input required maxLength={200} value={paymentReference} onChange={(event) => setPaymentReference(event.currentTarget.value)} placeholder="Invoice or transaction reference; no bank credentials" /></label>
          <label className="checkbox-row"><input type="checkbox" checked={paymentVerified} onChange={(event) => setPaymentVerified(event.currentTarget.checked)} /><span>I verified receipt of the payment for this company.</span></label>
          <button className="button button-primary" disabled={!paymentVerified || Boolean(activeId)}>Record founding eligibility</button>
        </form>
      </section>
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
