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
  const { data, error } = await adminClient
    .from("access_requests")
    .insert({
      company_name: input.companyName,
      work_email: input.workEmail,
      requester_role: input.requesterRole,
      hiring_volume: input.hiringVolume,
      first_role_to_review: input.firstRoleToReview,
      note: input.note,
      status: "pending"
    })
    .select("id, status")
    .single();

  if (error?.code === "23505") {
    const { data: existing, error: existingError } = await adminClient
      .from("access_requests")
      .select("id, status")
      .eq("work_email", input.workEmail)
      .eq("status", "pending")
      .maybeSingle();

    if (existingError || !existing) {
      return errorResponse("Unable to record access request", 500);
    }

    return jsonResponse({
      requestId: existing.id,
      status: existing.status
    });
  }

  if (error || !data) {
    return errorResponse("Unable to record access request", 500);
  }

  return jsonResponse(
    {
      requestId: data.id,
      status: data.status
    },
    201
  );
});
