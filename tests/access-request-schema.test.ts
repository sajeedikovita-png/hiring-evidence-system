import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(repoRoot, "supabase/migrations/202607040001_access_requests.sql");
const migration = fs.readFileSync(migrationPath, "utf8");

assert.match(migration, /create table public\.access_requests/i);
assert.match(migration, /status text not null default 'pending'/i);
assert.match(migration, /check \(status in \('pending', 'approved', 'rejected'\)\)/i);
assert.match(migration, /create unique index access_requests_one_pending_email/i);
assert.match(migration, /where status = 'pending'/i);
assert.match(migration, /create or replace function public\.current_user_is_admin\(\)/i);
assert.match(migration, /role = 'admin'/i);
assert.match(migration, /alter table public\.access_requests enable row level security/i);
assert.match(migration, /create policy access_requests_admin_select/i);
assert.match(migration, /create policy access_requests_admin_update/i);
assert.doesNotMatch(migration, /create policy .*anon.*select/i);
assert.doesNotMatch(migration, /for select\s+using\s+\(true\)/i);

console.log("Access request schema security test passed.");
