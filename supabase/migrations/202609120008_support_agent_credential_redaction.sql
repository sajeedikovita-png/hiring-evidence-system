-- Cover common authorization headers and provider-key prefixes before model access.
create or replace function public.redact_support_agent_text(p_value text,p_limit integer)
returns text language plpgsql immutable set search_path=public as $$
declare v_text text:=coalesce(p_value,'');
begin
  v_text:=regexp_replace(v_text,'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}','[email removed]','gi');
  v_text:=regexp_replace(v_text,'https?://[^[:space:]]+','[link removed]','gi');
  v_text:=regexp_replace(v_text,'authorization[[:space:]]*:[[:space:]]*bearer[[:space:]]+[^[:space:],;]+','authorization: [credential removed]','gi');
  v_text:=regexp_replace(v_text,'bearer[[:space:]]+[^[:space:],;]+','bearer [credential removed]','gi');
  v_text:=regexp_replace(v_text,'(password|passwd|secret|api[_ -]?key|access[_ -]?token|refresh[_ -]?token)[[:space:]]*[:=][[:space:]]*[^[:space:],;]+','\1: [credential removed]','gi');
  v_text:=regexp_replace(v_text,'(sk-[A-Za-z0-9_-]{16,}|re_[A-Za-z0-9_-]{16,}|sbp_[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9_-]{16,}|AKIA[A-Z0-9]{16})','[provider key removed]','g');
  v_text:=regexp_replace(v_text,'eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}','[token removed]','g');
  v_text:=regexp_replace(v_text,'[A-Fa-f0-9]{32,}','[identifier removed]','g');
  return left(v_text,greatest(1,least(coalesce(p_limit,500),2000)));
end; $$;

do $$
declare v_redacted text;
begin
  v_redacted:=public.redact_support_agent_text('Authorization: Bearer opaque-token sk-1234567890abcdefghijkl re_1234567890abcdefghijkl https://example.test/path?signature=secret person@example.com',2000);
  if v_redacted ~* '(opaque-token|sk-1234567890abcdefghijkl|re_1234567890abcdefghijkl|signature=secret|person@example.com)' then raise exception 'SUPPORT_AGENT_CREDENTIAL_REDACTION_FAILED'; end if;
end; $$;

