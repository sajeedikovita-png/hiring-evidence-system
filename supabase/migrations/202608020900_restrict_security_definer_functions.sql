-- Stop unauthenticated callers reaching the security-definer lifecycle functions.
--
-- Found on 2026-08-02 by probing the live project with only the public anon key and
-- no user session: `provision_demo_workspace` executed and returned its own business
-- error ("Access request not found") rather than a permission error. Postgres grants
-- EXECUTE on new functions to PUBLIC by default, and the earlier migrations never
-- revoked it.
--
-- Why this matters more than a normal missing grant: these functions are SECURITY
-- DEFINER, so they run with the owner's rights and bypass RLS by design. Reachable by
-- anon, `provision_demo_workspace` would let anyone who learned a pending access
-- request's UUID approve it themselves — creating a company, attaching an arbitrary
-- Auth user to it as admin, and marking the request approved, without ever passing
-- through /admin.
--
-- The only thing standing in the way today is that request and company ids are
-- unguessable UUIDs. That is obscurity, not authorization.
--
-- NOT revoked here, deliberately: `demo_workspace_is_writable` and
-- `demo_folder_is_writable`. Both are called inside RLS and Storage policies, which
-- are evaluated as the querying role. Revoking EXECUTE from anon would turn an
-- anonymous query into "permission denied for function" instead of an empty result.
-- Both are read-only booleans, so exposure is harmless.

-- Starting a customer's 14-day clock requires being signed in as that customer.
revoke execute on function public.activate_demo_trial(uuid) from public, anon;
grant execute on function public.activate_demo_trial(uuid) to authenticated;

-- Provisioning is only ever called by the approve-request Edge Function, which uses
-- the service role key. No browser role needs it.
revoke execute on function public.provision_demo_workspace(uuid, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.provision_demo_workspace(uuid, uuid, text, uuid)
  to service_role;

-- Upload and report writes belong to a signed-in recruiter; the functions themselves
-- still check company membership and the write boundary.
revoke execute on function public.record_candidate_upload(uuid, text, text, text, bigint)
  from public, anon;
grant execute on function public.record_candidate_upload(uuid, text, text, text, bigint)
  to authenticated;

revoke execute on function public.record_evidence_report(
  uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) from public, anon;
grant execute on function public.record_evidence_report(
  uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) to authenticated;

revoke execute on function public.mark_candidate_upload_failed(uuid, text) from public, anon;
grant execute on function public.mark_candidate_upload_failed(uuid, text) to authenticated;

-- Conversion checks platform authority internally, but must not be reachable at all
-- without a session.
revoke execute on function public.convert_demo_workspace(uuid) from public, anon;
grant execute on function public.convert_demo_workspace(uuid) to authenticated;

revoke execute on function public.demo_workspaces_for_platform_admin() from public, anon;
grant execute on function public.demo_workspaces_for_platform_admin() to authenticated;

-- 202607310950 revoked these from anon and authenticated but not from PUBLIC, which
-- is the grant that actually exists by default.
revoke execute on function public.purge_demo_workspace(uuid) from public, anon, authenticated;
grant execute on function public.purge_demo_workspace(uuid) to service_role;

revoke execute on function public.demo_workspaces_due_for_purge() from public, anon, authenticated;
grant execute on function public.demo_workspaces_due_for_purge() to service_role;
