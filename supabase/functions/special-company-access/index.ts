import {
  findAuthUserByNormalizedEmail,
  getValidatedInvitationRedirectUrl,
  normalizeApprovalEmail
} from "../_shared/approval.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { authorizeAdmin, createAdminClient } from "../_shared/supabase.ts";

type SpecialAccessBody = {
  email?: unknown;
  companyId?: unknown;
  role?: unknown;
  reason?: unknown;
  transferExisting?: unknown;
};

const roles = new Set(["admin", "recruiter", "hiring_manager"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return errorResponse("Method not allowed", 405);

  const adminClient = createAdminClient();
  let platformAdministrator;
  try {
    platformAdministrator = await authorizeAdmin(request, adminClient);
  } catch {
    return errorResponse("Platform administrator permission required", 403);
  }

  let body: SpecialAccessBody;
  try {
    body = await request.json() as SpecialAccessBody;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const email = normalizeApprovalEmail(body.email);
  const companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const transferExisting = body.transferExisting === true;
  if (!email || !uuidPattern.test(companyId) || !roles.has(role) || reason.length < 12 || reason.length > 1000) {
    return errorResponse("Email, active company, supported role, and a reason of at least 12 characters are required", 400);
  }

  let authUser;
  try {
    authUser = await findAuthUserByNormalizedEmail(
      email,
      (pagination) => adminClient.auth.admin.listUsers(pagination)
    );
  } catch {
    return errorResponse("Unable to inspect the user account", 500);
  }

  let invitationPrepared = false;
  if (!authUser) {
    const [companyResult, limitResult, memberResult] = await Promise.all([
      adminClient.from("companies").select("id").eq("id", companyId).eq("status", "active").maybeSingle(),
      adminClient.rpc("pilot_user_limit", { p_company_id: companyId }),
      adminClient.from("recruiter_profiles").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "active")
    ]);
    if (companyResult.error || !companyResult.data || limitResult.error || typeof limitResult.data !== "number") {
      return errorResponse("Target company access is not available.", 409);
    }
    if (memberResult.error) return errorResponse("Unable to verify the target company user limit.", 500);
    if ((memberResult.count ?? 0) >= limitResult.data) {
      return errorResponse("The target company has reached its user limit.", 409);
    }

    const redirectTo = getValidatedInvitationRedirectUrl();
    if (!redirectTo) return errorResponse("Invitation redirect is not configured", 503);
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (error || !data.user) return errorResponse("Unable to prepare the user invitation", 500);
    authUser = data.user;
    invitationPrepared = true;
  }

  const { data, error } = await adminClient.rpc("apply_special_company_access", {
    p_platform_user_id: platformAdministrator.user_id,
    p_auth_user_id: authUser.id,
    p_email: email,
    p_target_company_id: companyId,
    p_role: role,
    p_reason: reason,
    p_transfer_existing: transferExisting
  });

  if (error) {
    if (error.message?.includes("USER_ALREADY_HAS_ACTIVE_COMPANY")) {
      return errorResponse("This user already has active company access. Select transfer only after reviewing the written reason.", 409);
    }
    if (error.message?.includes("PILOT_USER_LIMIT")) {
      return errorResponse("The target company has reached its user limit.", 409);
    }
    return errorResponse("Special access could not be recorded.", 409);
  }

  return jsonResponse({
    status: "active",
    companyId,
    invitationPrepared,
    transferred: Boolean((data as { transferred?: unknown } | null)?.transferred)
  });
});
