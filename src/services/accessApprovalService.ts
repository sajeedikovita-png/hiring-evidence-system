import type { SupabaseClient } from "@supabase/supabase-js";
import { createHiringSupabaseClient } from "./supabaseClient";

export type AccessRequestStatus = "pending" | "approved" | "rejected";
export type ApprovedRecruiterRole = "admin" | "recruiter" | "hiring_manager";

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

export type CompanyOption = {
  id: string;
  name: string;
};

export type AdminAccessWorkspace = {
  reviewerName: string;
  requests: AccessRequestRecord[];
  companies: CompanyOption[];
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

type ApproveAccessInput = {
  requestId: string;
  companyId: string;
  role: ApprovedRecruiterRole;
};

type RejectAccessInput = {
  requestId: string;
  reviewNote: string;
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
): Promise<{ requestId: string; authUserId: string; status: "approved" }> {
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

export async function loadAdminAccessWorkspace(
  client: SupabaseClient = createHiringSupabaseClient()
): Promise<AdminAccessWorkspace> {
  const {
    data: { user },
    error: userError
  } = await client.auth.getUser();

  if (userError || !user) throw new Error("Sign in before reviewing access requests.");

  const { data: profile, error: profileError } = await client
    .from("recruiter_profiles")
    .select("id, display_name, role, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Human administrator approval required.");
  }

  const [requestsResult, companiesResult] = await Promise.all([
    client
      .from("access_requests")
      .select(
        "id, company_name, work_email, requester_role, hiring_volume, first_role_to_review, note, status, requested_at, review_note"
      )
      .order("requested_at", { ascending: false }),
    client
      .from("companies")
      .select("id, name")
      .eq("status", "active")
      .order("name", { ascending: true })
  ]);

  if (requestsResult.error) throw new Error("Unable to load access requests.");
  if (companiesResult.error) throw new Error("Unable to load company options.");

  return {
    reviewerName: String(profile.display_name || user.email || "Administrator"),
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
    })),
    companies: (companiesResult.data ?? []).map((company) => ({
      id: String(company.id),
      name: String(company.name)
    }))
  };
}
