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
  const { data: profile } = await admin
    .from("recruiter_profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!profile || profile.role !== "admin") {
    return new Response(JSON.stringify({ ok: false, error: "not an admin" }), { status: 403, headers: cors });
  }

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
    .select("id, work_email, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!reqRow) {
    return new Response(JSON.stringify({ ok: false, error: "request not found" }), { status: 404, headers: cors });
  }

  // 3. Mark approved.
  await admin
    .from("access_requests")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by_profile_id: profile.id })
    .eq("id", requestId);

  // 4. Email the requester an access link (invite; fall back to recovery if already registered).
  const email = String(reqRow.work_email).trim();
  let emailed = false;
  let via = "invite";
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${SITE}/welcome` });
  if (!inviteErr) {
    emailed = true;
  } else {
    via = "recovery";
    const { error: recErr } = await admin.auth.resetPasswordForEmail(email, { redirectTo: `${SITE}/welcome` });
    emailed = !recErr;
  }

  return new Response(JSON.stringify({ ok: true, emailed, via, email }), { headers: cors });
});
