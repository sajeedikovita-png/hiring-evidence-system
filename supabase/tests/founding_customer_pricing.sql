begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select has_column('public', 'ongoing_access_requests', 'pricing_term_number', 'pricing term ordinal is stored per request');

select ok(
  pg_get_functiondef('public.create_ongoing_access_request(boolean)'::regprocedure)
    ~ 'perform 1\s+from public\.companies\s+where id = v_profile\.company_id for update'
  and pg_get_functiondef('public.create_ongoing_access_request(boolean)'::regprocedure)
    like '%ongoing-access-2026-09-10-founding-800-v1%'
  and pg_get_functiondef('public.create_ongoing_access_request(boolean)'::regprocedure)
    like '%v_price := 800%'
  and pg_get_functiondef('public.create_ongoing_access_request(boolean)'::regprocedure)
    like '%v_price := 1400%',
  'request pricing is serialized and assigns the founding or standard offer'
);

select ok(
  pg_get_functiondef('public.create_ongoing_access_request(boolean)'::regprocedure)
    ~ 'pricing_term_number is not null\s+and status in \(''active'', ''expired''\)'
  and pg_get_functiondef('public.create_ongoing_access_request(boolean)'::regprocedure)
    like '%v_completed_pricing_terms + 1%',
  'only completed terms consume an offer and later term numbers continue increasing'
);

select ok(
  pg_get_functiondef('public.review_ongoing_access_request(uuid, text, text, boolean)'::regprocedure)
    like '%v_request.ongoing_monthly_price_sgd%'
  and pg_get_functiondef('public.review_ongoing_access_request(uuid, text, text, boolean)'::regprocedure)
    like '%v_request.terms_version%'
  and pg_get_functiondef('public.review_ongoing_access_request(uuid, text, text, boolean)'::regprocedure)
    like '%v_request.pricing_term_number%',
  'approval audit uses the exact offer accepted on the request'
);

select ok(
  pg_get_functiondef('public.start_ongoing_access_term()'::regprocedure)
    like '%v_request.ongoing_monthly_price_sgd%'
  and pg_get_functiondef('public.start_ongoing_access_term()'::regprocedure)
    like '%v_request.terms_version%',
  'term-start audit retains the accepted price and version'
);

select ok(
  pg_get_functiondef('public.current_pilot_lifecycle_status()'::regprocedure)
    like '%''foundingMonthlySgd'', 800%'
  and pg_get_functiondef('public.current_pilot_lifecycle_status()'::regprocedure)
    like '%''standardMonthlySgd'', 1400%',
  'customer lifecycle status exposes both founding and standard pricing'
);

select ok(
  has_function_privilege('authenticated', 'public.create_ongoing_access_request(boolean)'::regprocedure, 'EXECUTE')
  and has_function_privilege('authenticated', 'public.platform_ongoing_access_requests()'::regprocedure, 'EXECUTE'),
  'existing authenticated workflow permissions remain available'
);

select ok(
  not has_table_privilege('authenticated', 'public.ongoing_access_requests', 'INSERT')
  and not has_table_privilege('authenticated', 'public.ongoing_access_requests', 'UPDATE'),
  'customers cannot bypass the versioned pricing RPC'
);

select * from finish();
rollback;
