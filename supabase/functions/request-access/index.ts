import {
  normalizeAccessRequestInput,
  validateAccessRequestInput
} from "../_shared/access.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const input = normalizeAccessRequestInput(body);
  const validation = validateAccessRequestInput(input);

  if (!validation.valid) {
    return jsonResponse(
      {
        status: "validation_failed",
        errors: validation.errors
      },
      400
    );
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.rpc("submit_access_request_guarded", {
    p_company_name: input.companyName,
    p_work_email: input.workEmail,
    p_requester_role: input.requesterRole,
    p_hiring_volume: input.hiringVolume,
    p_first_role_to_review: input.firstRoleToReview,
    p_note: input.note
  });

  if (error || !data) {
    return errorResponse("Unable to record access request", 500);
  }

  // Keep the public response generic so it cannot be used to discover whether
  // an email already has access. The RPC creates at most one pending request.
  return jsonResponse({ status: "request_received" }, 202);
});
