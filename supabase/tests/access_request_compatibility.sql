begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

select has_column('public', 'access_requests', 'requested_at', 'compatibility exposes requested_at');
select has_column('public', 'access_requests', 'review_note', 'compatibility exposes review_note');
select has_column('public', 'access_requests', 'auth_user_id', 'compatibility exposes auth_user_id');
select has_column('public', 'access_requests', 'approved_company_id', 'compatibility exposes approved_company_id');
select has_column('public', 'access_requests', 'approved_role', 'compatibility exposes approved_role');
select has_column('public', 'access_requests', 'updated_at', 'compatibility exposes updated_at');
select col_not_null('public', 'access_requests', 'requested_at', 'requested_at is present for stable request ordering');
select col_not_null('public', 'access_requests', 'updated_at', 'updated_at is present for approval updates');

select * from finish();

rollback;
