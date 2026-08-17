import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { authorizeAdmin, createAdminClient } from "../_shared/supabase.ts";

type RejectionBody = {
  requestId?: unknown;
  reviewNote?: unknown;
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

  let body: RejectionBody;
  try {
    body = (await request.json()) as RejectionBody;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const requestId = typeof body.requestId === "string" ? body.requestId : "";
  const reviewNote =
    typeof body.reviewNote === "string" ? body.reviewNote.trim() : "";

  if (!requestId || !reviewNote) {
    return errorResponse("Request and review note are required", 400);
  }

  const reviewedAt = new Date().toISOString();
  const { data: rejectedRequest, error: updateError } = await adminClient
    .from("access_requests")
    .update({
      status: "rejected",
      reviewed_at: reviewedAt,
      reviewed_by_profile_id: reviewingAdmin.id,
      review_note: reviewNote,
      updated_at: reviewedAt
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id, status")
    .maybeSingle();

  if (updateError || !rejectedRequest) {
    return errorResponse("Pending access request not found", 404);
  }

  const { error: auditError } = await adminClient
    .from("audit_log_entries")
    .insert({
      company_id: reviewingAdmin.company_id,
      actor_profile_id: reviewingAdmin.id,
      entity_type: "access_request",
      entity_id: requestId,
      action: "access_request_rejected",
      metadata: { review_note: reviewNote },
      created_at: reviewedAt
    });

  if (auditError) {
    return errorResponse("Request rejected but audit entry could not be recorded", 500);
  }

  return jsonResponse({
    requestId: rejectedRequest.id,
    status: rejectedRequest.status
  });
});
