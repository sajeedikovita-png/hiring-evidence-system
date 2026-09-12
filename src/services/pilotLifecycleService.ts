import { createHiringSupabaseClient } from "./supabaseClient";

export type PilotLifecyclePlan = "pilot" | "ongoing";
export type PilotLifecycleState =
  | "pending_activation"
  | "approved_pending_start"
  | "active"
  | "read_only"
  | "expired"
  | "rejected"
  | "converted";
export type OngoingAccessRequestStatus = "pending" | "approved_pending_start" | "active" | "expired" | "rejected";
export type OngoingPricingVersion =
  | "ongoing-access-2026-09-09"
  | "ongoing-access-2026-09-10-founding-800-v1"
  | "ongoing-access-2026-09-10-standard-1400-v1";

export type OngoingPricing = {
  initialPilotSgd: 500;
  ongoingMonthlySgd: 800 | 1400;
  ongoingPricingVersion: OngoingPricingVersion;
  ongoingPricingTermNumber: number | null;
  foundingMonthlySgd: 800;
  foundingTerms: 3;
  standardMonthlySgd: 1400;
};

export type PilotLifecycle = {
  companyId: string;
  plan: PilotLifecyclePlan;
  state: PilotLifecycleState;
  startsAt: string | null;
  endsAt: string | null;
  remainingDays: number | null;
  canStart: boolean;
  isWritable: boolean;
  pricing: OngoingPricing;
  limits: { roles: number; candidateDocuments: number; users: number };
  usage: { roles: number; candidateDocuments: number; users: number };
  paidRequest: {
    id: string;
    status: OngoingAccessRequestStatus;
    requestedAt: string;
    termsAcceptedAt: string;
    reviewNote?: string;
    ongoingMonthlySgd: 800 | 1400;
    ongoingPricingVersion: OngoingPricingVersion;
    ongoingPricingTermNumber: number | null;
  } | null;
};

export type PlatformOngoingAccessRequest = {
  id: string;
  companyId: string;
  companyName: string;
  requesterEmail: string;
  requesterName: string;
  status: OngoingAccessRequestStatus;
  requestedAt: string;
  termsAcceptedAt: string;
  reviewNote?: string;
  reviewedAt?: string;
  reviewedByPlatformUserId?: string;
  ongoingMonthlySgd: 800 | 1400;
  ongoingPricingVersion: OngoingPricingVersion;
  ongoingPricingTermNumber: number | null;
};

type RpcResult = { data: unknown; error: { message?: string } | null };
type RpcClient = { rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<RpcResult> };
type ValueRecord = Record<string, unknown>;

function record(value: unknown, message: string): ValueRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
  return value as ValueRecord;
}

function string(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function optionalString(value: unknown): string | undefined {
  const result = string(value);
  return result || undefined;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function nonNegativeInteger(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback;
}

function nullablePositiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function asMonthlyPrice(value: unknown): 800 | 1400 {
  if (value === 800 || value === 1400) return value;
  throw new Error("Pilot pricing was invalid.");
}

function asPricingVersion(value: unknown): OngoingPricingVersion {
  const version = string(value);
  if (
    version === "ongoing-access-2026-09-09"
    || version === "ongoing-access-2026-09-10-founding-800-v1"
    || version === "ongoing-access-2026-09-10-standard-1400-v1"
  ) return version;
  throw new Error("Pilot pricing version was invalid.");
}

function asLifecycle(value: unknown): PilotLifecycle {
  const source = record(value, "Pilot lifecycle was not returned by the server.");
  const limits = record(source.limits, "Pilot limits were not returned by the server.");
  const pricing = record(source.pricing, "Pilot pricing was not returned by the server.");
  const usage = record(source.usage, "Pilot usage was not returned by the server.");
  const request = source.paidRequest === null ? null : record(source.paidRequest, "Pilot request was invalid.");
  const plan = string(source.plan);
  const state = string(source.state);
  const roles = nonNegativeInteger(limits.roles);
  const candidateDocuments = nonNegativeInteger(limits.candidateDocuments);
  const users = nonNegativeInteger(limits.users);

  if ((plan !== "pilot" && plan !== "ongoing") || !isLifecycleState(state)) {
    throw new Error("Pilot lifecycle was invalid.");
  }
  const ongoingMonthlySgd = asMonthlyPrice(pricing.ongoingMonthlySgd);
  const ongoingPricingVersion = asPricingVersion(pricing.ongoingPricingVersion);
  const ongoingPricingTermNumber = nullablePositiveInteger(pricing.ongoingPricingTermNumber);
  if (
    pricing.initialPilotSgd !== 500
    || pricing.foundingMonthlySgd !== 800
    || pricing.foundingTerms !== 3
    || pricing.standardMonthlySgd !== 1400
  ) {
    throw new Error("Pilot pricing was invalid.");
  }
  return {
    companyId: string(source.companyId),
    plan,
    state,
    startsAt: nullableString(source.startsAt),
    endsAt: nullableString(source.endsAt),
    remainingDays: source.remainingDays === null ? null : nonNegativeInteger(source.remainingDays),
    canStart: source.canStart === true,
    isWritable: source.isWritable === true,
    pricing: {
      initialPilotSgd: 500,
      ongoingMonthlySgd,
      ongoingPricingVersion,
      ongoingPricingTermNumber,
      foundingMonthlySgd: 800,
      foundingTerms: 3,
      standardMonthlySgd: 1400
    },
    limits: {
      roles: nonNegativeInteger(limits.roles),
      candidateDocuments: nonNegativeInteger(limits.candidateDocuments),
      users: nonNegativeInteger(limits.users)
    },
    usage: {
      roles: nonNegativeInteger(usage.roles),
      candidateDocuments: nonNegativeInteger(usage.candidateDocuments),
      users: nonNegativeInteger(usage.users)
    },
    paidRequest: request
      ? {
          id: string(request.id),
          status: asRequestStatus(request.status),
          requestedAt: string(request.requestedAt),
          termsAcceptedAt: string(request.termsAcceptedAt),
          reviewNote: optionalString(request.reviewNote),
          ongoingMonthlySgd: asMonthlyPrice(request.ongoingMonthlySgd),
          ongoingPricingVersion: asPricingVersion(request.ongoingPricingVersion),
          ongoingPricingTermNumber: nullablePositiveInteger(request.ongoingPricingTermNumber)
        }
      : null
  };
}

function isLifecycleState(value: string): value is PilotLifecycleState {
  return ["pending_activation", "approved_pending_start", "active", "read_only", "expired", "rejected", "converted"].includes(value);
}

function asRequestStatus(value: unknown): OngoingAccessRequestStatus {
  const status = string(value);
  if (status === "pending" || status === "approved_pending_start" || status === "active" || status === "expired" || status === "rejected") return status;
  throw new Error("Pilot request status was invalid.");
}

async function call(client: RpcClient, name: string, args?: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(error.message ?? "Pilot lifecycle request failed.");
  return data;
}

export async function loadPilotLifecycle(client: RpcClient = createHiringSupabaseClient()): Promise<PilotLifecycle> {
  return asLifecycle(await call(client, "current_pilot_lifecycle_status"));
}

export async function startPilotLifecycle(client: RpcClient = createHiringSupabaseClient()): Promise<PilotLifecycle> {
  return asLifecycle(await call(client, "start_current_pilot_lifecycle"));
}

export async function createOngoingAccessRequest(
  input: { termsAccepted: boolean },
  client: RpcClient = createHiringSupabaseClient()
): Promise<{
  id: string;
  status: "pending";
  termsAcceptedAt: string;
  ongoingMonthlySgd: 800 | 1400;
  ongoingPricingVersion: OngoingPricingVersion;
  ongoingPricingTermNumber: number | null;
}> {
  const source = record(
    await call(client, "create_ongoing_access_request", { p_terms_accepted: input.termsAccepted }),
    "Paid pilot request was not returned by the server."
  );
  const status = asRequestStatus(source.status);
  if (status !== "pending") throw new Error("Paid pilot request was invalid.");
  return {
    id: string(source.id),
    status,
    termsAcceptedAt: string(source.termsAcceptedAt),
    ongoingMonthlySgd: asMonthlyPrice(source.ongoingMonthlySgd),
    ongoingPricingVersion: asPricingVersion(source.ongoingPricingVersion),
    ongoingPricingTermNumber: nullablePositiveInteger(source.ongoingPricingTermNumber)
  };
}

export async function listOngoingAccessRequests(
  client: RpcClient = createHiringSupabaseClient()
): Promise<PlatformOngoingAccessRequest[]> {
  const rows = await call(client, "platform_ongoing_access_requests");
  if (!Array.isArray(rows)) throw new Error("Paid pilot request list was not returned by the server.");
  return rows.map((row) => {
    const source = record(row, "Paid pilot request row was invalid.");
    return {
      id: string(source.id),
      companyId: string(source.company_id),
      companyName: string(source.company_name),
      requesterEmail: string(source.requester_email),
      requesterName: string(source.requester_name),
      status: asRequestStatus(source.status),
      requestedAt: string(source.requested_at),
      termsAcceptedAt: string(source.terms_accepted_at),
      reviewNote: optionalString(source.review_note),
      reviewedAt: optionalString(source.reviewed_at),
      reviewedByPlatformUserId: optionalString(source.reviewed_by_platform_user_id),
      ongoingMonthlySgd: asMonthlyPrice(source.ongoing_monthly_price_sgd),
      ongoingPricingVersion: asPricingVersion(source.terms_version),
      ongoingPricingTermNumber: nullablePositiveInteger(source.pricing_term_number)
    };
  });
}

export async function reviewOngoingAccessRequest(
  input: {
    requestId: string;
    decision: "approve" | "reject";
    reviewNote: string;
    paymentAgreementConfirmed: boolean;
  },
  client: RpcClient = createHiringSupabaseClient()
): Promise<{ id: string; status: "approved_pending_start" | "rejected" }> {
  const source = record(
    await call(client, "review_ongoing_access_request", {
      p_request_id: input.requestId,
      p_decision: input.decision,
      p_review_note: input.reviewNote,
      p_payment_agreement_confirmed: input.paymentAgreementConfirmed
    }),
    "Paid pilot review was not returned by the server."
  );
  const status = asRequestStatus(source.status);
  if (status !== "approved_pending_start" && status !== "rejected") throw new Error("Paid pilot review was invalid.");
  return { id: string(source.id), status };
}
