import assert from "node:assert/strict";
import {
  createOngoingAccessRequest,
  listOngoingAccessRequests,
  loadPilotLifecycle,
  reviewOngoingAccessRequest,
  startPilotLifecycle
} from "../src/services/pilotLifecycleService";

async function main() {
const lifecycle = {
  companyId: "company-1",
  plan: "ongoing",
  state: "approved_pending_start",
  startsAt: null,
  endsAt: null,
  remainingDays: null,
  canStart: true,
  isWritable: false,
  pricing: {
    initialPilotSgd: 500,
    ongoingMonthlySgd: 800,
    ongoingPricingVersion: "ongoing-access-2026-09-10-founding-800-v1",
    ongoingPricingTermNumber: 1,
    foundingMonthlySgd: 800,
    foundingTerms: 3,
    standardMonthlySgd: 1400
  },
  limits: { roles: 10, candidateDocuments: 500, users: 5 },
  usage: { roles: 0, candidateDocuments: 0, users: 1 },
  paidRequest: {
    id: "request-1",
    status: "approved_pending_start",
    requestedAt: "2026-09-09T00:00:00.000Z",
    termsAcceptedAt: "2026-09-09T00:00:00.000Z",
    reviewNote: "Agreement reviewed.",
    ongoingMonthlySgd: 800,
    ongoingPricingVersion: "ongoing-access-2026-09-10-founding-800-v1",
    ongoingPricingTermNumber: 1
  }
};

const calls: Array<{ name: string; args?: Record<string, unknown> }> = [];
const client = {
  rpc: async (name: string, args?: Record<string, unknown>) => {
    calls.push({ name, args });
    if (name === "current_pilot_lifecycle_status" || name === "start_current_pilot_lifecycle") return { data: lifecycle, error: null };
    if (name === "create_ongoing_access_request") {
      return { data: {
        id: "request-2", status: "pending", termsAcceptedAt: "2026-09-09T00:00:00.000Z",
        ongoingMonthlySgd: 800,
        ongoingPricingVersion: "ongoing-access-2026-09-10-founding-800-v1",
        ongoingPricingTermNumber: 1
      }, error: null };
    }
    if (name === "platform_ongoing_access_requests") {
      return {
        data: [{
          id: "request-1", company_id: "company-1", company_name: "Northstar",
          requester_email: "owner@northstar.example", requester_name: "Owner", status: "pending",
          requested_at: "2026-09-09T00:00:00.000Z", terms_accepted_at: "2026-09-09T00:00:00.000Z",
          review_note: null, reviewed_at: null, reviewed_by_platform_user_id: null,
          ongoing_monthly_price_sgd: 800,
          terms_version: "ongoing-access-2026-09-10-founding-800-v1",
          pricing_term_number: 1
        }],
        error: null
      };
    }
    return { data: { id: "request-1", status: "approved_pending_start" }, error: null };
  }
};

const loaded = await loadPilotLifecycle(client);
assert.equal(loaded.canStart, true);
assert.deepEqual(loaded.limits, { roles: 10, candidateDocuments: 500, users: 5 });
assert.deepEqual(loaded.pricing, {
  initialPilotSgd: 500,
  ongoingMonthlySgd: 800,
  ongoingPricingVersion: "ongoing-access-2026-09-10-founding-800-v1",
  ongoingPricingTermNumber: 1,
  foundingMonthlySgd: 800,
  foundingTerms: 3,
  standardMonthlySgd: 1400
});

const started = await startPilotLifecycle(client);
assert.equal(started.state, "approved_pending_start");
assert.deepEqual(calls.at(-1), { name: "start_current_pilot_lifecycle", args: undefined });

const initialPilot = await startPilotLifecycle({
  rpc: async (name) => ({
    data: {
      ...lifecycle,
      plan: "pilot",
      state: "active",
      canStart: false,
      startsAt: "2026-09-09T00:00:00.000Z",
      endsAt: "2026-10-09T00:00:00.000Z"
    },
    error: name === "start_current_pilot_lifecycle" ? null : { message: "Unexpected RPC" }
  })
});
assert.equal(initialPilot.plan, "pilot");

const created = await createOngoingAccessRequest({ termsAccepted: true }, client);
assert.equal(created.status, "pending");
assert.equal(created.ongoingMonthlySgd, 800);
assert.equal(created.ongoingPricingTermNumber, 1);
assert.deepEqual(calls.at(-1), {
  name: "create_ongoing_access_request",
  args: { p_terms_accepted: true }
});

const requests = await listOngoingAccessRequests(client);
assert.deepEqual(requests[0], {
  id: "request-1", companyId: "company-1", companyName: "Northstar",
  requesterEmail: "owner@northstar.example", requesterName: "Owner", status: "pending",
  requestedAt: "2026-09-09T00:00:00.000Z", termsAcceptedAt: "2026-09-09T00:00:00.000Z",
  reviewNote: undefined, reviewedAt: undefined, reviewedByPlatformUserId: undefined,
  ongoingMonthlySgd: 800,
  ongoingPricingVersion: "ongoing-access-2026-09-10-founding-800-v1",
  ongoingPricingTermNumber: 1
});

const reviewed = await reviewOngoingAccessRequest({
  requestId: "request-1", decision: "approve", reviewNote: "Agreement reviewed.", paymentAgreementConfirmed: true
}, client);
assert.deepEqual(reviewed, { id: "request-1", status: "approved_pending_start" });
assert.deepEqual(calls.at(-1), {
  name: "review_ongoing_access_request",
  args: {
    p_request_id: "request-1", p_decision: "approve", p_review_note: "Agreement reviewed.",
    p_payment_agreement_confirmed: true
  }
});

await assert.rejects(
  () => loadPilotLifecycle({ rpc: async () => ({ data: null, error: { message: "PILOT_WORKSPACE_REQUIRED" } }) }),
  /PILOT_WORKSPACE_REQUIRED/
);

console.log("Pilot lifecycle service tests passed.");
}

void main().catch((error) => {
  throw error;
});
