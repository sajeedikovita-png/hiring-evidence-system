import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isCurrentPlatformAdministrator } from "../src/services/accessApprovalService";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = fs.readFileSync(path.join(repoRoot, "supabase/schema.sql"), "utf8");
const migration = fs.readFileSync(
  path.join(repoRoot, "supabase/migrations/202609090001_workspace_access_hardening.sql"),
  "utf8"
);
const authorizationSource = fs.readFileSync(
  path.join(repoRoot, "supabase/functions/_shared/supabase.ts"),
  "utf8"
);
const approvalFinalizationMigration = fs.readFileSync(
  path.join(repoRoot, "supabase/migrations/202609090005_access_request_approval_finalization.sql"),
  "utf8"
);

for (const source of [schema, migration]) {
  assert.match(source, /join public\.companies on companies\.id = recruiter_profiles\.company_id/i);
  assert.match(source, /recruiter_profiles\.status = 'active'/i);
  assert.match(source, /recruiter_profiles\.role in \('admin', 'recruiter', 'hiring_manager'\)/i);
  assert.match(source, /companies\.status = 'active'/i);
}

assert.match(migration, /create or replace function public\.current_company_ids_text\(\)/i);
assert.match(migration, /create table if not exists public\.platform_admins/i);
assert.match(migration, /status text not null default 'active'/i);
assert.match(migration, /alter table public\.platform_admins enable row level security/i);
assert.match(migration, /revoke all on public\.platform_admins from authenticated/i);
assert.match(migration, /grant select on public\.platform_admins to authenticated, service_role/i);
assert.match(migration, /create or replace function public\.is_current_user_admin\(\)/i);
assert.match(migration, /create or replace function public\.current_user_is_platform_administrator\(\)/i);
assert.match(migration, /select public\.is_current_user_admin\(\)/i);
assert.match(migration, /drop policy if exists recruiter_profiles_company_update/i);
assert.match(migration, /revoke insert, update, delete on public\.recruiter_profiles from authenticated/i);
assert.match(migration, /drop policy if exists access_requests_admin_update/i);
assert.match(migration, /revoke update on public\.access_requests from authenticated/i);
assert.match(migration, /create policy access_requests_admin_select/i);
assert.match(migration, /grant insert \(\s*company_name, work_email, requester_role, hiring_volume,\s*first_role_to_review, note, status\s*\) on public\.access_requests to anon, authenticated/i);
assert.match(migration, /reviewed_by_platform_user_id uuid references auth\.users\(id\) on delete set null/i);
assert.match(migration, /'access_request_approved'/i);
assert.doesNotMatch(migration, /insert into public\.platform_administrators/i);
assert.doesNotMatch(migration, /insert into public\.platform_admins/i);
assert.match(migration, /workspace_access_required/i);
assert.match(authorizationSource, /from\("platform_admins"\)/i);
assert.doesNotMatch(authorizationSource, /from\("recruiter_profiles"\)/i);
assert.match(approvalFinalizationMigration, /create or replace function public\.finalize_access_request_approval/i);
assert.match(approvalFinalizationMigration, /where user_id = p_platform_user_id and status = 'active'/i);
assert.match(approvalFinalizationMigration, /for update/i);
assert.match(approvalFinalizationMigration, /approval_finalization_version/i);
assert.match(approvalFinalizationMigration, /where company_id = p_company_id/i);
assert.match(approvalFinalizationMigration, /revoke all on function public\.finalize_access_request_approval/i);
assert.match(approvalFinalizationMigration, /grant execute on function public\.finalize_access_request_approval[\s\S]*to service_role/i);
assert.doesNotMatch(approvalFinalizationMigration, /to authenticated/i);

async function run() {
  assert.equal(
    await isCurrentPlatformAdministrator({
      async rpc(name: string) {
        assert.equal(name, "current_user_is_platform_administrator");
        return { data: true, error: null };
      }
    }),
    true
  );

  assert.equal(
    await isCurrentPlatformAdministrator({
      async rpc() {
        return { data: false, error: null };
      }
    }),
    false
  );

  assert.equal(
    await isCurrentPlatformAdministrator({
      async rpc() {
        return { data: null, error: { message: "permission denied" } };
      }
    }),
    false
  );

  console.log("Workspace security schema tests passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
