import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const migration=readFileSync(new URL("../supabase/migrations/202609120005_harden_support_agent.sql",import.meta.url),"utf8");
const inputHardening=readFileSync(new URL("../supabase/migrations/202609120006_support_agent_input_hardening.sql",import.meta.url),"utf8");
const behaviorVerification=readFileSync(new URL("../supabase/migrations/202609120007_verify_support_agent_behavior.sql",import.meta.url),"utf8");

test("worker claims use expiring tokens and bounded recovery",()=>{
  assert.match(migration,/claim_token uuid/);
  assert.match(migration,/lease_expires_at=now\(\)\+interval '20 minutes'/);
  assert.match(migration,/attempt_count < 3/);
  assert.match(migration,/claim_token is distinct from p_claim_token/);
  assert.match(migration,/status='failed'.*lease expired three times/is);
});

test("maintenance payload redacts common credentials and links",()=>{
  assert.match(inputHardening,/\[credential removed\]/);
  assert.match(inputHardening,/\[token removed\]/);
  assert.match(inputHardening,/\[link removed\]/);
  assert.match(inputHardening,/If candidate or confidential material remains, stop/);
});

test("preview file evidence rejects null and traversal entries",()=>{
  assert.match(inputHardening,/jsonb_typeof\(item\)<>'string'/);
  assert.ok(inputHardening.includes("item#>>'{}' ~ '(^|/)\\.\\.?(/|$)'"));
  assert.match(inputHardening,/support_agent_preview_evidence_guard/);
});

test("deployed migration asserts worker privileges",()=>{
  assert.match(inputHardening,/LEGACY_AGENT_UPDATE_STILL_EXECUTABLE/);
  assert.match(inputHardening,/HARDENED_AGENT_UPDATE_NOT_EXECUTABLE/);
  assert.match(inputHardening,/AUTHENTICATED_ROLE_CAN_CLAIM_AGENT_WORK/);
});

test("production migration verifies lease, transition, file and check behavior",()=>{
  assert.match(behaviorVerification,/WRONG_CLAIM_TOKEN_ACCEPTED/);
  assert.match(behaviorVerification,/INVALID_STATUS_TRANSITION_ACCEPTED/);
  assert.match(behaviorVerification,/NULL_CHANGED_FILE_ACCEPTED/);
  assert.match(behaviorVerification,/FAILED_CHECK_ACCEPTED/);
  assert.match(behaviorVerification,/EVENT_SUMMARY_NOT_BOUNDED/);
  assert.match(behaviorVerification,/delete from public\.companies where id=v_company/);
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
