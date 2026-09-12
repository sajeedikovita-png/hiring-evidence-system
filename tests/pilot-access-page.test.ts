import assert from "node:assert/strict";
import { canRequestOngoingAccess } from "../src/pages/PilotAccessPage";
import type { PilotLifecycle } from "../src/services/pilotLifecycleService";

const base: PilotLifecycle = {
  companyId: "company-1",
  plan: "pilot",
  state: "active",
  startsAt: "2026-09-09T00:00:00.000Z",
  endsAt: "2026-10-09T00:00:00.000Z",
  remainingDays: 30,
  canStart: false,
  isWritable: true,
  pricing: {
    initialPilotSgd: 500,
    ongoingMonthlySgd: 800,
    ongoingPricingVersion: "ongoing-access-2026-09-10-founding-800-v1",
    ongoingPricingTermNumber: 1,
    foundingMonthlySgd: 800,
    foundingTerms: 3,
    standardMonthlySgd: 1400
  },
  limits: { roles: 1, candidateDocuments: 50, users: 2 },
  usage: { roles: 0, candidateDocuments: 0, users: 1 },
  paidRequest: null
};

assert.equal(canRequestOngoingAccess({ ...base, startsAt: null }), false, "the initial pilot must be started first");
assert.equal(canRequestOngoingAccess(base), true, "a started pilot without a request can request ongoing access");
const pricedRequest = (id: string, status: NonNullable<PilotLifecycle["paidRequest"]>["status"]): NonNullable<PilotLifecycle["paidRequest"]> => ({
  id,
  status,
  requestedAt: "2026-09-10T00:00:00.000Z",
  termsAcceptedAt: "2026-09-10T00:00:00.000Z",
  ongoingMonthlySgd: 800,
  ongoingPricingVersion: "ongoing-access-2026-09-10-founding-800-v1",
  ongoingPricingTermNumber: 1
});

assert.equal(canRequestOngoingAccess({ ...base, paidRequest: pricedRequest("pending", "pending") }), false);
assert.equal(canRequestOngoingAccess({ ...base, paidRequest: pricedRequest("approved", "approved_pending_start") }), false);
assert.equal(canRequestOngoingAccess({ ...base, paidRequest: pricedRequest("rejected", "rejected") }), true);
assert.equal(canRequestOngoingAccess({ ...base, paidRequest: pricedRequest("expired-request", "expired") }), true);
assert.equal(canRequestOngoingAccess({ ...base, state: "expired", paidRequest: pricedRequest("expired-term", "active") }), true);
assert.equal(canRequestOngoingAccess({ ...base, paidRequest: pricedRequest("active-term", "active") }), false);

console.log("Pilot access page tests passed.");
