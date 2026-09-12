import React, { useEffect, useState } from "react";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import {
  createOngoingAccessRequest,
  loadPilotLifecycle,
  startPilotLifecycle,
  type PilotLifecycle
} from "../services/pilotLifecycleService";

function lifecycleMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/PILOT_NOT_APPROVED/i.test(message)) return "Ongoing access must be approved before its term can start.";
  if (/PILOT_TERMS_REQUIRED/i.test(message)) return "Accept the 30-day access terms before submitting a request.";
  return "We could not update pilot access. Please try again.";
}

export function canRequestOngoingAccess(lifecycle: PilotLifecycle | undefined) {
  if (!lifecycle?.startsAt) return false;
  const requestStatus = lifecycle.paidRequest?.status;
  return requestStatus === undefined || requestStatus === "rejected" || requestStatus === "expired" || (lifecycle.state === "expired" && requestStatus === "active");
}

export function PilotAccessPage() {
  const [lifecycle, setLifecycle] = useState<PilotLifecycle>();
  const [message, setMessage] = useState("Loading pilot access.");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  async function refresh() {
    try {
      const next = await loadPilotLifecycle();
      setLifecycle(next);
      setMessage("");
    } catch (error) {
      setMessage(lifecycleMessage(error));
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function startAccessTerm() {
    setIsWorking(true);
    try {
      const started = await startPilotLifecycle();
      setLifecycle(started);
      setMessage(started.plan === "ongoing" ? "Your 30-day ongoing access term has started." : "Your pilot access has started.");
    } catch (error) {
      setMessage(lifecycleMessage(error));
    } finally {
      setIsWorking(false);
    }
  }

  async function requestOngoingAccess() {
    setIsWorking(true);
    try {
      await createOngoingAccessRequest({ termsAccepted });
      setMessage("Ongoing access request pending platform review. No charge has been made.");
      await refresh();
    } catch (error) {
      setMessage(lifecycleMessage(error));
    } finally {
      setIsWorking(false);
    }
  }

  const stateLabel = lifecycle?.state.replace(/_/g, " ") ?? "Loading";
  const isReadOnly = lifecycle?.isWritable === false;
  const canRequestOngoing = canRequestOngoingAccess(lifecycle);
  const ongoingPrice = lifecycle?.pricing.ongoingMonthlySgd ?? 800;
  const ongoingTermNumber = lifecycle?.pricing.ongoingPricingTermNumber;
  const isFoundingPrice = lifecycle?.pricing.ongoingPricingVersion === "ongoing-access-2026-09-10-founding-800-v1";
  const ongoingPriceContext = isFoundingPrice && ongoingTermNumber
    ? `Founding term ${ongoingTermNumber} of ${lifecycle.pricing.foundingTerms}`
    : "Standard ongoing access";

  return (
    <RecruiterShell active="pilot" title="Pilot access" subtitle="Review pilot scope, usage, timing, and ongoing access requests.">
      <main className="workspace-content pilot-access-page">
        {message ? <p className="workspace-status" role="status">{message}</p> : null}
        {lifecycle ? (
          <>
            <section className="workspace-card pilot-summary-card">
              <div>
                <p className="section-kicker">{lifecycle.plan === "pilot" ? "Initial pilot" : "Ongoing access"}</p>
                <h2>{stateLabel}</h2>
                <p>
                  {lifecycle.startsAt ? `Started ${new Date(lifecycle.startsAt).toLocaleDateString("en-SG")}. ` : lifecycle.plan === "ongoing" ? "The ongoing 30-day term has not started. " : "Pilot access has not started. "}
                  {lifecycle.endsAt ? `Ends ${new Date(lifecycle.endsAt).toLocaleDateString("en-SG")}.` : "Start only when your team is ready."}
                </p>
                {lifecycle.plan === "pilot" ? (
                  <div className="pilot-approved-scope" aria-label="Approved pilot scope">
                    <strong>Your approved pilot</strong>
                    <span>30 days</span>
                    <span>{lifecycle.limits.roles} role</span>
                    <span>{lifecycle.limits.candidateDocuments} candidate documents</span>
                    <span>{lifecycle.limits.users} company users</span>
                  </div>
                ) : null}
              </div>
              <div className="pilot-action-stack">
                <strong>{lifecycle.remainingDays === null ? "Not started" : `${lifecycle.remainingDays} days remaining`}</strong>
                {lifecycle.canStart ? <button className="button button-primary" disabled={isWorking} onClick={() => void startAccessTerm()}>{lifecycle.plan === "ongoing" ? "Start ongoing 30-day term" : "Start pilot access"}</button> : null}
              </div>
            </section>

            {isReadOnly ? <section className="workspace-card pilot-read-only"><h2>Workspace is read-only</h2><p>New writes are unavailable. Review existing evidence and request ongoing access if appropriate.</p></section> : null}

            <section className="pilot-limit-grid" aria-label="Pilot scope and usage">
              <article className="workspace-card"><h2>Roles</h2><p>{lifecycle.usage.roles} of {lifecycle.limits.roles} used</p></article>
              <article className="workspace-card"><h2>Candidate documents</h2><p>{lifecycle.usage.candidateDocuments} of {lifecycle.limits.candidateDocuments} used</p></article>
              <article className="workspace-card"><h2>Users</h2><p>{lifecycle.usage.users} of {lifecycle.limits.users} used</p></article>
            </section>

            <section className="workspace-card ongoing-access-card">
              <p className="section-kicker">Ongoing access</p>
              <h2>S${ongoingPrice.toLocaleString("en-SG")}/month</h2>
              <p>{ongoingPriceContext}. The first three founding ongoing terms are S$800 each. The standard price from the fourth ongoing term is S$1,400. Every 30-day term is requested and renewed manually after agreement confirmation, with up to 10 roles, 500 candidate documents per term, and five users. Payment is never charged automatically.</p>
              {lifecycle.paidRequest ? <p className="workspace-status">Request status: {lifecycle.paidRequest.status.replace(/_/g, " ")}{lifecycle.paidRequest.reviewNote ? `. ${lifecycle.paidRequest.reviewNote}` : ""}</p> : null}
              {canRequestOngoing ? (
                <>
                  <label className="checkbox-row"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.currentTarget.checked)} /><span>I accept S${ongoingPrice.toLocaleString("en-SG")} for this 30-day ongoing term. I understand the first three founding terms are S$800 each, the standard price from term four is S$1,400, and every renewal requires manual agreement.</span></label>
                  <button className="button button-primary" disabled={!termsAccepted || isWorking} onClick={() => void requestOngoingAccess()}>Request ongoing access</button>
                </>
              ) : lifecycle.plan === "pilot" && !lifecycle.startsAt ? <p className="muted">Start the initial pilot before requesting ongoing access.</p> : null}
            </section>
          </>
        ) : null}
      </main>
    </RecruiterShell>
  );
}
