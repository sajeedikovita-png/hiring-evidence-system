import {
  buildApprovalResponse,
  canAdminManageCompany,
  displayNameFromEmail,
  parseApprovedRole
} from "../_shared/access.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { authorizeAdmin, createAdminClient } from "../_shared/supabase.ts";

type ApprovalBody = {
  requestId?: unknown;
  companyId?: unknown;
  role?: unknown;
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const adminClient = createAdminClient();

  let reviewingAdmin;
  try {
    reviewingAdmin = await authorizeAdmin(request, adminClient);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Admin permission required",
      403
    );
  }

  let body: ApprovalBody;
  try {
    body = (await request.json()) as ApprovalBody;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const requestId = typeof body.requestId === "string" ? body.requestId : "";
  const companyId = typeof body.companyId === "string" ? body.companyId : "";
  const approvedRole = parseApprovedRole(body.role);

  if (!requestId || !companyId || !approvedRole) {
    return errorResponse("Request, company, and approved role are required", 400);
  }

  if (!canAdminManageCompany(reviewingAdmin.company_id, companyId)) {
    return errorResponse("Admin permission required for this company", 403);
  }

  const { data: accessRequest, error: requestError } = await adminClient
    .from("access_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !accessRequest) {
    return errorResponse("Access request not found", 404);
  }

  if (accessRequest.status === "approved" && accessRequest.auth_user_id) {
    return jsonResponse(
      buildApprovalResponse({
        requestId: accessRequest.id,
        authUserId: accessRequest.auth_user_id,
        status: "approved"
      })
    );
  }

  if (accessRequest.status !== "pending") {
    return errorResponse("Only pending requests can be approved", 409);
  }

  const { data: company, error: companyError } = await adminClient
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("status", "active")
    .maybeSingle();

  if (companyError || !company) {
    return errorResponse("Active company not found", 404);
  }

  const { data: listedUsers, error: listUsersError } =
    await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (listUsersError) {
    return errorResponse("Unable to inspect existing users", 500);
  }

  const normalizedEmail = String(accessRequest.work_email).toLowerCase();
  let authUser = listedUsers.users.find(
    (candidate) => candidate.email?.toLowerCase() === normalizedEmail
  );

  if (!authUser) {
    const appUrl = (Deno.env.get("APP_URL") ?? "http://localhost:3000").replace(
      /\/$/,
      ""
    );
    const { data: invited, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
        redirectTo: `${appUrl}/set-password`
      });

    if (inviteError || !invited.user) {
      return errorResponse("Unable to send access invitation", 500);
    }

    authUser = invited.user;
  }

  const { error: profileError } = await adminClient
    .from("recruiter_profiles")
    .upsert(
      {
        company_id: companyId,
        user_id: authUser.id,
        display_name: displayNameFromEmail(normalizedEmail),
        email: normalizedEmail,
        role: approvedRole,
        status: "active",
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "company_id,user_id"
      }
    );

  if (profileError) {
    return errorResponse("Unable to provision recruiter profile", 500);
  }

  const reviewedAt = new Date().toISOString();
  const { data: approvedRequest, error: updateError } = await adminClient
    .from("access_requests")
    .update({
      status: "approved",
      reviewed_at: reviewedAt,
      reviewed_by_profile_id: reviewingAdmin.id,
      approved_company_id: companyId,
      approved_role: approvedRole,
      auth_user_id: authUser.id,
      review_note: "Access approved by administrator",
      updated_at: reviewedAt
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id, auth_user_id")
    .maybeSingle();

  if (updateError || !approvedRequest) {
    return errorResponse("Unable to finalize access approval", 500);
  }

  const { error: auditError } = await adminClient
    .from("audit_log_entries")
    .insert({
      company_id: companyId,
      actor_profile_id: reviewingAdmin.id,
      entity_type: "access_request",
      entity_id: requestId,
      action: "access_request_approved",
      metadata: {
        auth_user_id: authUser.id,
        approved_role: approvedRole
      },
      created_at: reviewedAt
    });

  if (auditError) {
    return errorResponse("Access approved but audit entry could not be recorded", 500);
  }

  return jsonResponse(
    buildApprovalResponse({
      requestId: approvedRequest.id,
      authUserId: approvedRequest.auth_user_id,
      status: "approved"
    })
  );
});
