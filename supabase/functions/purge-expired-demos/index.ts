/**
 * purge-expired-demos — deletes demo workspaces whose seven view-only days are over.
 *
 * Order matters: private Storage objects are removed and verified BEFORE the
 * database rows, so a failure can never leave orphaned candidate files behind with
 * no record pointing at them.
 *
 * SHIPS DISABLED. It reports what it *would* delete until `PURGE_ENABLED=true` is
 * set, so the schedule can be proven safe on real data before anything is removed.
 *
 * Secrets (set with `supabase secrets set`):
 *   PURGE_JOB_SECRET  (required)  — must match the `x-purge-secret` request header
 *   PURGE_ENABLED     (optional)  — "true" to actually delete; anything else = dry run
 *
 * Schedule (Supabase → Integrations → Cron), once a day:
 *   select net.http_post(
 *     url := 'https://<project>.supabase.co/functions/v1/purge-expired-demos',
 *     headers := jsonb_build_object('x-purge-secret', '<PURGE_JOB_SECRET>')
 *   );
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "candidate-documents";

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-purge-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type DueWorkspace = { company_id: string; company_name: string; purge_at: string };

type WorkspaceOutcome = {
  companyId: string;
  filesDeleted: number;
  storageCleared: boolean;
  purged: boolean;
  reason?: string;
};

/** Every object under `<company-uuid>/`, walked one folder level at a time. */
async function listCompanyObjects(
  storage: ReturnType<typeof createClient>["storage"],
  prefix: string
): Promise<string[]> {
  const { data, error } = await storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw new Error(`could not list ${prefix}: ${error.message}`);
  if (!data) return [];

  const paths: string[] = [];
  for (const entry of data) {
    const entryPath = `${prefix}/${entry.name}`;
    // Storage returns folders as rows without an id.
    if (entry.id === null) {
      paths.push(...(await listCompanyObjects(storage, entryPath)));
    } else {
      paths.push(entryPath);
    }
  }

  return paths;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "POST only" }), { status: 405, headers: cors });
  }

  const jobSecret = Deno.env.get("PURGE_JOB_SECRET");
  if (!jobSecret) {
    return new Response(JSON.stringify({ ok: false, error: "purge job is not configured" }), { status: 500, headers: cors });
  }
  if (req.headers.get("x-purge-secret") !== jobSecret) {
    return new Response(JSON.stringify({ ok: false, error: "not authorized" }), { status: 401, headers: cors });
  }

  const enabled = Deno.env.get("PURGE_ENABLED") === "true";
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: due, error: dueError } = await admin.rpc("demo_workspaces_due_for_purge");
  if (dueError) {
    return new Response(JSON.stringify({ ok: false, error: dueError.message }), { status: 500, headers: cors });
  }

  const workspaces = (due ?? []) as DueWorkspace[];

  if (!enabled) {
    return new Response(
      JSON.stringify({
        ok: true,
        dryRun: true,
        note: "PURGE_ENABLED is not 'true'. Nothing was deleted.",
        wouldPurge: workspaces.map((workspace) => ({
          companyId: workspace.company_id,
          purgeAt: workspace.purge_at
        }))
      }),
      { headers: cors }
    );
  }

  const outcomes: WorkspaceOutcome[] = [];

  for (const workspace of workspaces) {
    const outcome: WorkspaceOutcome = {
      companyId: workspace.company_id,
      filesDeleted: 0,
      storageCleared: false,
      purged: false
    };

    try {
      const paths = await listCompanyObjects(admin.storage, workspace.company_id);

      if (paths.length > 0) {
        const { error: removeError } = await admin.storage.from(BUCKET).remove(paths);
        if (removeError) throw new Error(`could not remove files: ${removeError.message}`);
        outcome.filesDeleted = paths.length;
      }

      // Verify before touching the database. Uncertain state stops here.
      const remaining = await listCompanyObjects(admin.storage, workspace.company_id);
      if (remaining.length > 0) {
        outcome.reason = `${remaining.length} file(s) still present after deletion`;
        outcomes.push(outcome);
        continue;
      }
      outcome.storageCleared = true;

      const { data: purgeResult, error: purgeError } = await admin.rpc("purge_demo_workspace", {
        p_company_id: workspace.company_id
      });
      if (purgeError) throw new Error(purgeError.message);

      outcome.purged = Boolean((purgeResult as { purged?: boolean } | null)?.purged);
      if (!outcome.purged) {
        outcome.reason = String((purgeResult as { reason?: string } | null)?.reason ?? "not purged");
      }
    } catch (error) {
      outcome.reason = error instanceof Error ? error.message : "purge failed";
    }

    outcomes.push(outcome);
  }

  return new Response(JSON.stringify({ ok: true, dryRun: false, outcomes }), { headers: cors });
});
