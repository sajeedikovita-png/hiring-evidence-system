export type CandidatePrivacyRequestType = "access" | "correction" | "deletion" | "withdrawal";
export type CandidatePrivacyRequestStatus =
  | "identity_verification_required"
  | "in_review"
  | "resolved"
  | "declined";
export type CandidatePrivacyRequestDecision = "verify_identity" | "resolve" | "decline";

export type CandidatePrivacyRequestRpcClient = {
  rpc: (
    name: string,
    args?: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

type CandidateListClient = CandidatePrivacyRequestRpcClient & {
  from: (table: string) => {
    select: (columns: string) => {
      order: (column: string) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
    };
  };
};

export type WorkspacePrivacyCandidate = { id: string; name: string };

export type CreateCandidatePrivacyRequestInput = {
  candidateId: string;
  requestType: CandidatePrivacyRequestType;
  requesterEmail: string;
  requestDetails?: string;
};

export type CandidatePrivacyRequest = {
  id: string;
  candidateId: string;
  candidateName?: string;
  requestType: CandidatePrivacyRequestType;
  requesterEmail?: string;
  requestDetails?: string;
  status: CandidatePrivacyRequestStatus;
  createdAt?: string;
  identityVerifiedAt?: string;
  resolvedAt?: string;
  resolutionNote?: string;
};

export type ReviewCandidatePrivacyRequestInput = {
  requestId: string;
  decision: CandidatePrivacyRequestDecision;
  reviewNote: string;
  identityVerified?: boolean;
};

const requestTypes: CandidatePrivacyRequestType[] = ["access", "correction", "deletion", "withdrawal"];
const requestDecisions: CandidatePrivacyRequestDecision[] = ["verify_identity", "resolve", "decline"];
const requestStatuses: CandidatePrivacyRequestStatus[] = ["identity_verification_required", "in_review", "resolved", "declined"];

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function asRequestType(value: unknown): CandidatePrivacyRequestType {
  if (!requestTypes.includes(value as CandidatePrivacyRequestType)) {
    throw new Error("Choose access, correction, deletion, or withdrawal.");
  }
  return value as CandidatePrivacyRequestType;
}

function asRequestDecision(value: unknown): CandidatePrivacyRequestDecision {
  if (!requestDecisions.includes(value as CandidatePrivacyRequestDecision)) {
    throw new Error("Choose a privacy-request review action.");
  }
  return value as CandidatePrivacyRequestDecision;
}

function asRequestStatus(value: unknown): CandidatePrivacyRequestStatus {
  if (!requestStatuses.includes(value as CandidatePrivacyRequestStatus)) {
    throw new Error("Privacy-request response was incomplete.");
  }
  return value as CandidatePrivacyRequestStatus;
}

function mapRequest(value: unknown): CandidatePrivacyRequest {
  const row = value as Record<string, unknown> | null;
  const id = text(row?.id);
  const candidateId = text(row?.candidate_id ?? row?.candidateId);
  if (!id || !candidateId) throw new Error("Privacy-request response was incomplete.");

  return {
    id,
    candidateId,
    candidateName: text(row?.candidate_name ?? row?.candidateName) || undefined,
    requestType: asRequestType(row?.request_type ?? row?.requestType),
    requesterEmail: text(row?.requester_email ?? row?.requesterEmail) || undefined,
    requestDetails: text(row?.request_details ?? row?.requestDetails) || undefined,
    status: asRequestStatus(row?.status),
    createdAt: text(row?.created_at ?? row?.createdAt) || undefined,
    identityVerifiedAt: text(row?.identity_verified_at ?? row?.identityVerifiedAt) || undefined,
    resolvedAt: text(row?.resolved_at ?? row?.resolvedAt) || undefined,
    resolutionNote: text(row?.resolution_note ?? row?.resolutionNote) || undefined
  };
}

export function createCandidatePrivacyRequestRepository(client: CandidatePrivacyRequestRpcClient) {
  return {
    async create(input: CreateCandidatePrivacyRequestInput): Promise<CandidatePrivacyRequest> {
      const candidateId = text(input.candidateId);
      const requestType = asRequestType(input.requestType);
      const requesterEmail = normalizedEmail(input.requesterEmail);
      const requestDetails = text(input.requestDetails);
      if (!candidateId || !isEmail(requesterEmail) || requestDetails.length > 2000) {
        throw new Error("Enter a candidate, a valid requester email, and up to 2,000 characters of request details.");
      }

      const { data, error } = await client.rpc("create_candidate_privacy_request", {
        p_candidate_id: candidateId,
        p_request_type: requestType,
        p_requester_email: requesterEmail,
        p_request_details: requestDetails
      });
      if (error) throw new Error(error.message || "Unable to record the privacy request.");
      return mapRequest(data);
    },

    async list(): Promise<CandidatePrivacyRequest[]> {
      const { data, error } = await client.rpc("list_candidate_privacy_requests");
      if (error) throw new Error(error.message || "Unable to read privacy requests.");
      if (!Array.isArray(data)) throw new Error("Privacy-request response was incomplete.");
      return data.map(mapRequest);
    },

    async review(input: ReviewCandidatePrivacyRequestInput): Promise<CandidatePrivacyRequest> {
      const requestId = text(input.requestId);
      const decision = asRequestDecision(input.decision);
      const reviewNote = text(input.reviewNote);
      if (!requestId || !reviewNote || reviewNote.length > 2000) {
        throw new Error("Enter a request and a human review note of up to 2,000 characters.");
      }
      if (decision === "verify_identity" && input.identityVerified !== true) {
        throw new Error("Confirm identity verification before moving this request to review.");
      }

      const { data, error } = await client.rpc("review_candidate_privacy_request", {
        p_request_id: requestId,
        p_decision: decision,
        p_review_note: reviewNote,
        p_identity_verified: input.identityVerified === true
      });
      if (error) throw new Error(error.message || "Unable to record the privacy review.");
      return mapRequest(data);
    }
  };
}

export async function listWorkspacePrivacyCandidates(client: CandidateListClient): Promise<WorkspacePrivacyCandidate[]> {
  const { data, error } = await client.from("candidates").select("id, name").order("name");
  if (error) throw new Error(error.message || "Unable to read candidates in this workspace.");
  if (!Array.isArray(data)) throw new Error("Candidate response was incomplete.");
  const candidates: WorkspacePrivacyCandidate[] = [];
  data.forEach((value: unknown) => {
    const row = value as Record<string, unknown>;
    const id = text(row.id);
    const name = text(row.name);
    if (id && name) candidates.push({ id, name });
  });
  return candidates;
}
