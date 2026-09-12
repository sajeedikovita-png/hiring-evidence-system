-- PostgreSQL does not expose jsonb_object_length. Count object keys in a
-- scalar subquery so the support redaction guard works in every target.
create or replace function public.redact_support_diagnostics(p_value jsonb)
returns jsonb language plpgsql immutable set search_path=public as $$
declare v_key text; v_value text; v_result jsonb := '{}'::jsonb; v_key_count integer;
begin
  if jsonb_typeof(coalesce(p_value,'{}'::jsonb)) <> 'object' then raise exception 'SUPPORT_DIAGNOSTICS_INVALID' using errcode='22023'; end if;
  select count(*) into v_key_count from jsonb_object_keys(coalesce(p_value,'{}'::jsonb));
  if v_key_count > 12 then raise exception 'SUPPORT_DIAGNOSTICS_INVALID' using errcode='22023'; end if;
  for v_key, v_value in select key, value #>> '{}' from jsonb_each(coalesce(p_value,'{}'::jsonb)) loop
    if v_key !~ '^[a-zA-Z0-9_.-]{1,64}$' or length(coalesce(v_value,'')) > 240 then raise exception 'SUPPORT_DIAGNOSTICS_INVALID' using errcode='22023'; end if;
    if lower(v_key) ~ '(token|secret|password|authorization|cookie|key)' then continue; end if;
    v_result := v_result || jsonb_build_object(v_key, regexp_replace(coalesce(v_value,''), '(?i)(bearer[[:space:]]+|sk-[a-z0-9_-]+|eyJ[a-zA-Z0-9_-]+\.)[^[:space:]]+', '[redacted]', 'g'));
  end loop;
  return v_result;
end; $$;
