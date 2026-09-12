import type { SupabaseClient } from "@supabase/supabase-js";
import { createHiringSupabaseClient } from "./supabaseClient";

export type AccessRequestStatus = "pending" | "approved" | "rejected";
export type AccessRequestRecord = {
  id: string;
  companyName: string;
  workEmail: string;
  requesterRole: string;
  hiringVolume: string;
  firstRoleToReview: string;
  note: string;
  status: AccessRequestStatus;
  requestedAt: string;
  reviewNote?: string;
};

export type AdminAccessWorkspace = {
  reviewerName: string;
  requests: AccessRequestRecord[];
  companies: CompanyAccessOption[];
};

export type CompanyAccessOption = {
  id: string;
  name: string;
  activeMembers: number;
  userLimit?: number;
};

type FunctionsClient = {
  functions: {
    invoke: (
      name: string,
      options: { body: Record<string, unknown> }
    ) => Promise<{
      data: unknown;
      error: { message?: string } | null;
    }>;
  };
};

type PlatformAuthorityClient = {
  rpc: (functionName: string) => PromiseLike<{
    data: unknown;
    error: { message?: string } | null;
  }>;
};

type ApproveAccessInput = {
  requestId: string;
};

type RejectAccessInput = {
  requestId: string;
  reviewNote: string;
};

export type SpecialCompanyAccessInput = {
  email: string;
  companyId: string;
  role: "admin" | "recruiter" | "hiring_manager";
  reason: string;
  transferExisting: boolean;
};

function requireFunctionData<T>(
  data: unknown,
  error: { message?: string } | null,
  fallback: string
): T {
  if (error) throw new Error(error.message ?? fallback);
  if (!data || typeof data !== "object") throw new Error(fallback);
  return data as T;
}

export async function approveAccessRequest(
  input: ApproveAccessInput,
  client: FunctionsClient = createHiringSupabaseClient()
): Promise<{ requestId: string; authUserId: string; companyId: string; status: "approved" }> {
  const { data, error } = await client.functions.invoke("approve-access-request", {
    body: input
  });

  return requireFunctionData(data, error, "Unable to approve access request");
}

export async function rejectAccessRequest(
  input: RejectAccessInput,
  client: FunctionsClient = createHiringSupabaseClient()
): Promise<{ requestId: string; status: "rejected" }> {
  const { data, error } = await client.functions.invoke("reject-access-request", {
    body: input
  });

  return requireFunctionData(data, error, "Unable to reject access request");
}

export async function grantSpecialCompanyAccess(
  input: SpecialCompanyAccessInput,
  client: FunctionsClient = createHiringSupabaseClient()
): Promise<{ status: "active"; companyId: string; invitationPrepared: boolean; transferred: boolean }> {
  const email = input.email.trim().toLowerCase();
  const reason = input.reason.trim();
  if (!email || !input.companyId || reason.length < 12) {
    throw new Error("Enter an email, target company, and a written reason of at least 12 characters.");
  }
  const { data, error } = await client.functions.invoke("special-company-access", {
    body: { ...input, email, reason }
  });
  return requireFunctionData(data, error, "Unable to record special company access");
}

export async function isCurrentPlatformAdministrator(
  client: PlatformAuthorityClient = createHiringSupabaseClient()
): Promise<boolean> {
  const { data, error } = await client.rpc("current_user_is_platform_administrator");
  return !error && data === true;
}

export async function loadAdminAccessWorkspace(
  client: SupabaseClient = createHiringSupabaseClient()
): Promise<AdminAccessWorkspace> {
  const {
    data: { user },
    error: userError
  } = await client.auth.getUser();

  if (userError || !user) throw new Error("Sign in before reviewing access requests.");

  if (!(await isCurrentPlatformAdministrator(client))) {
    throw new Error("Platform administrator approval required.");
  }

  const requestsResult = await client
    .from("access_requests")
    .select(
      "id, company_name, work_email, requester_role, hiring_volume, first_role_to_review, note, status, requested_at, review_note"
    )
    .order("requested_at", { ascending: false });

  const companiesResult = await client.rpc("platform_company_access_options");

  if (requestsResult.error) throw new Error("Unable to load access requests.");
  if (companiesResult.error) throw new Error("Unable to load company access options.");

  return {
    reviewerName: String(user.email || "Platform administrator"),
    companies: (companiesResult.data ?? []).map((company: Record<string, unknown>) => ({
      id: String(company.company_id),
      name: String(company.company_name),
      activeMembers: Number(company.active_members ?? 0),
      userLimit: company.user_limit == null ? undefined : Number(company.user_limit)
    })),
    requests: (requestsResult.data ?? []).map((request) => ({
      id: String(request.id),
      companyName: String(request.company_name),
      workEmail: String(request.work_email),
      requesterRole: String(request.requester_role),
      hiringVolume: String(request.hiring_volume),
      firstRoleToReview: String(request.first_role_to_review),
      note: String(request.note ?? ""),
      status: request.status as AccessRequestStatus,
      requestedAt: String(request.requested_at),
      reviewNote: request.review_note ? String(request.review_note) : undefined
    }))
  };
}
