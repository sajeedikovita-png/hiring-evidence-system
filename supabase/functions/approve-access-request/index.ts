import {
  buildApprovalResponse
} from "../_shared/access.ts";
import {
  findAuthUserByNormalizedEmail,
  getValidatedInvitationRedirectUrl,
  normalizeApprovalEmail
} from "../_shared/approval.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { authorizeAdmin, createAdminClient } from "../_shared/supabase.ts";

type ApprovalBody = {
  requestId?: unknown;
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
      error instanceof Error ? error.message : "Platform administrator permission required",
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

  if (!requestId) {
    return errorResponse("Request is required", 400);
  }

  const { data: accessRequest, error: requestError } = await adminClient
    .from("access_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !accessRequest) {
    return errorResponse("Access request not found", 404);
  }

  const normalizedEmail = normalizeApprovalEmail(accessRequest.work_email);
  if (!normalizedEmail) {
    return errorResponse("Access request has an invalid work email", 422);
  }

  if (accessRequest.status !== "pending" && !accessRequest.provisioned_company_id) {
    return errorResponse("Only pending requests can be approved", 409);
  }

  if (accessRequest.provisioned_company_id) {
    const { data: ownerProfile, error: ownerProfileError } = await adminClient
      .from("recruiter_profiles")
      .select("user_id")
      .eq("company_id", accessRequest.provisioned_company_id)
      .ilike("email", normalizedEmail)
      .eq("role", "admin")
      .eq("status", "active")
      .maybeSingle();

    if (ownerProfileError || !ownerProfile?.user_id) {
      return errorResponse("Pilot workspace owner is unavailable", 500);
    }

    const { error: finalizeError } = await adminClient.rpc("finalize_access_request_approval", {
      p_request_id: requestId,
      p_platform_user_id: reviewingAdmin.user_id,
      p_auth_user_id: ownerProfile.user_id,
      p_company_id: accessRequest.provisioned_company_id
    });

    if (finalizeError) {
      return errorResponse("Pilot workspace exists but approval records need review", 500);
    }

    return jsonResponse({
      ...buildApprovalResponse({
        requestId: accessRequest.id,
        authUserId: ownerProfile.user_id,
        status: "approved"
      }),
      companyId: accessRequest.provisioned_company_id
    });
  }

  let authUser;
  try {
    authUser = await findAuthUserByNormalizedEmail(
      normalizedEmail,
      (pagination) => adminClient.auth.admin.listUsers(pagination)
    );
  } catch {
    return errorResponse("Unable to inspect existing users", 500);
  }

  if (!authUser) {
    const redirectTo = getValidatedInvitationRedirectUrl();
    if (!redirectTo) {
      return errorResponse("Invitation redirect is not configured", 503);
    }
    const { data: invited, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
        redirectTo
      });

    if (inviteError || !invited.user) {
      return errorResponse("Unable to send access invitation", 500);
    }

    authUser = invited.user;
  }

  const { data: activeMemberships, error: activeMembershipError } = await adminClient
    .from("recruiter_profiles")
    .select("company_id")
    .eq("user_id", authUser.id)
    .eq("status", "active")
    .limit(1);

  if (activeMembershipError) {
    return errorResponse("Unable to verify existing company access", 500);
  }
  if ((activeMemberships ?? []).length > 0) {
    return errorResponse("This email already has active company access. Use the audited special-access transfer instead.", 409);
  }

  // This deployed security-definer RPC is the transactional lifecycle boundary:
  // it creates an isolated company, its entitlement, and the first admin profile.
  const { data: companyId, error: provisionError } = await adminClient.rpc("provision_demo_workspace", {
    p_request_id: requestId,
    p_user_id: authUser.id,
    p_email: normalizedEmail,
    p_reviewer_profile_id: null
  });

  if (provisionError || !companyId) {
    return errorResponse("Unable to create pilot workspace", 500);
  }

  const { data: ownerProfile, error: ownerProfileError } = await adminClient
    .from("recruiter_profiles")
    .select("user_id")
    .eq("company_id", companyId)
    .ilike("email", normalizedEmail)
    .eq("role", "admin")
    .eq("status", "active")
    .maybeSingle();

  if (ownerProfileError || !ownerProfile?.user_id) {
    return errorResponse("Pilot workspace owner is unavailable", 500);
  }

  const { error: finalizeError } = await adminClient.rpc("finalize_access_request_approval", {
    p_request_id: requestId,
    p_platform_user_id: reviewingAdmin.user_id,
    p_auth_user_id: ownerProfile.user_id,
    p_company_id: companyId
  });

  if (finalizeError) {
    // Provisioning is idempotent, so a retry will take the already-provisioned
    // path above and atomically complete the compatibility fields and audit row.
    return errorResponse("Pilot workspace created but approval finalization needs review", 500);
  }

  return jsonResponse({
    ...buildApprovalResponse({
      requestId,
      authUserId: ownerProfile.user_id,
      status: "approved"
    }),
    companyId
  });
});
