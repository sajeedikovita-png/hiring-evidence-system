import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const migration=readFileSync(new URL("../supabase/migrations/202609120005_harden_support_agent.sql",import.meta.url),"utf8");

test("worker claims use expiring tokens and bounded recovery",()=>{
  assert.match(migration,/claim_token uuid/);
  assert.match(migration,/lease_expires_at=now\(\)\+interval '20 minutes'/);
  assert.match(migration,/attempt_count < 3/);
  assert.match(migration,/claim_token is distinct from p_claim_token/);
  assert.match(migration,/status='failed'.*lease expired three times/is);
});

test("worker cannot report a production release",()=>{
  const updateBody=migration.slice(migration.indexOf("update_support_agent_job_v2"));
  assert.doesNotMatch(updateBody,/v_status not in \([^)]*'released'/);
  assert.match(updateBody,/v_scope:='prepare_only'/);
});

test("preview evidence requires four passing checks and an allowed diff",()=>{
  assert.match(migration,/v_required_passes<>4/);
  assert.match(migration,/AGENT_CHECK_FAILURE_RECORDED/);
  assert.match(migration,/AGENT_CHANGED_FILES_OUTSIDE_ALLOWLIST/);
  assert.match(migration,/p_base_commit=p_target_commit/);
  assert.match(migration,/left\(coalesce\([\s\S]*,800\)/);
});
