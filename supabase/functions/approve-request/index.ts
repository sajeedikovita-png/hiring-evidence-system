import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://hiring-evidence-system.vercel.app";

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "POST only" }), { status: 405, headers: cors });
  }

  const URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  // 1. Verify the caller is a signed-in admin.
  const userClient = createClient(URL, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "not signed in" }), { status: 401, headers: cors });
  }

  const admin = createClient(URL, SERVICE);

  // Platform authority only. Every provisioned customer owner is an `admin` of their
  // own company, so a company role must never grant access to other companies'
  // requests. Authority is tied to this specific Auth user UUID.
  const { data: platformAdmin } = await admin
    .from("platform_admins")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!platformAdmin) {
    return new Response(JSON.stringify({ ok: false, error: "not a platform administrator" }), { status: 403, headers: cors });
  }

  // The reviewer's own recruiter profile is recorded on the request when they have
  // one; it is not what grants the authority above.
  const { data: profile } = await admin
    .from("recruiter_profiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  // 2. Read the request.
  let requestId = "";
  try {
    requestId = String((await req.json()).requestId ?? "");
  } catch {
    /* ignore */
  }
  if (!requestId) {
    return new Response(JSON.stringify({ ok: false, error: "requestId required" }), { status: 400, headers: cors });
  }

  const { data: reqRow } = await admin
    .from("access_requests")
    .select("id, work_email, company_name, status, provisioned_company_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!reqRow) {
    return new Response(JSON.stringify({ ok: false, error: "request not found" }), { status: 404, headers: cors });
  }

  if (reqRow.provisioned_company_id) {
    return new Response(JSON.stringify({ ok: true, alreadyProvisioned: true, companyId: reqRow.provisioned_company_id }), { headers: cors });
  }

  if (reqRow.status !== "pending") {
    return new Response(JSON.stringify({ ok: false, error: "request already reviewed" }), { status: 409, headers: cors });
  }

  // 3. Email the requester an access link (invite; fall back to recovery if already registered).
  const email = String(reqRow.work_email).trim();
  let emailed = false;
  let via = "invite";
  const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${SITE}/welcome` });
  let invitedUserId = inviteData?.user?.id ?? null;
  if (!inviteErr) {
    emailed = true;
  } else {
    via = "recovery";
    const { error: recErr } = await admin.auth.resetPasswordForEmail(email, { redirectTo: `${SITE}/welcome` });
    emailed = !recErr;
    if (emailed) {
      const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      invitedUserId = users.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
    }
  }

  if (!emailed || !invitedUserId) {
    return new Response(JSON.stringify({ ok: false, error: "could not prepare the customer invitation" }), { status: 502, headers: cors });
  }

  // 4. Provision one isolated company and its 14-day entitlement atomically.
  // The timer starts only when the customer first opens the dashboard.
  const { data: companyId, error: provisionErr } = await admin.rpc("provision_demo_workspace", {
    p_request_id: requestId,
    p_user_id: invitedUserId,
    p_email: email,
    p_reviewer_profile_id: profile?.id ?? null
  });
  if (provisionErr || !companyId) {
    return new Response(JSON.stringify({ ok: false, error: "could not provision the company workspace" }), { status: 500, headers: cors });
  }

  return new Response(JSON.stringify({ ok: true, emailed, via, email, companyId }), { headers: cors });
});
