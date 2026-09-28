-- Keep approved support guidance aligned with the public founding feedback offer.
-- Commercial payment and tax details remain subject to the written customer agreement.

update public.support_knowledge_base_articles
set body = 'The first conversation and synthetic walkthrough are free. The first three agencies can use the founding feedback pilot for S$350 one time. It includes 30 days, one role, up to 50 new candidate documents, up to two named company users, a 45-minute role-criteria setup, a guided first evidence review, direct founder support, and an end-of-pilot findings session. The later standard pilot price is S$500. The founding customer''s S$350 pilot payment is credited toward its first S$800 ongoing term if it continues. Pilot access does not renew automatically and starts only when the approved customer selects Start pilot. Ongoing access is requested separately. Each of the first three 30-day ongoing terms is S$800 in total, with up to 10 active roles, 500 new documents and five named users; the disclosed standard price is S$1,400 from term four. One user normally belongs to one active company workspace. Special company access is a controlled and auditable owner-approved exception. Use the live Pilot access page values when the customer asks about remaining days or usage.',
    approved_at = now(),
    updated_at = now()
where slug = 'access-pricing-and-users'
  and status = 'approved';

do $$
begin
  if not exists (
    select 1
    from public.support_knowledge_base_articles
    where slug = 'access-pricing-and-users'
      and status = 'approved'
  ) then
    raise exception 'Approved access pricing support article was not found';
  end if;
end;
$$;
