import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "POST only" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  let email = "";
  try {
    const body = await req.json();
    email = String(body.email ?? "").trim();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (!email) {
    return new Response(JSON.stringify({ ok: false, error: "email required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: "https://hiring-evidence-system.vercel.app/welcome"
  });

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ ok: true, userId: data.user?.id, email: data.user?.email }), {
    headers: { "Content-Type": "application/json" }
  });
});
