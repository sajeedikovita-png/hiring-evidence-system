-- Private, company-scoped candidate document storage. Apply through Supabase before enabling live uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'candidate-documents',
  'candidate-documents',
  false,
  10485760,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "candidate_documents_company_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'candidate-documents'
  and (storage.foldername(name))[1] in (select public.current_company_ids()::text)
);

create policy "candidate_documents_company_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'candidate-documents'
  and (storage.foldername(name))[1] in (select public.current_company_ids()::text)
);

create policy "candidate_documents_company_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'candidate-documents'
  and (storage.foldername(name))[1] in (select public.current_company_ids()::text)
)
with check (
  bucket_id = 'candidate-documents'
  and (storage.foldername(name))[1] in (select public.current_company_ids()::text)
);

alter table public.audit_log_entries drop constraint if exists audit_log_entries_action_check;
alter table public.audit_log_entries add constraint audit_log_entries_action_check check (
  action in (
    'dashboard_viewed', 'job_role_read', 'candidate_read', 'evidence_report_read',
    'human_review_decision_saved', 'upload_validated', 'document_uploaded'
  )
);

create or replace function public.audit_candidate_document_upload()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log_entries (company_id, actor_profile_id, entity_type, entity_id, action, metadata)
  values (new.company_id, new.uploaded_by_profile_id, 'uploaded_document', new.id, 'document_uploaded',
    jsonb_build_object('file_type', new.file_type, 'file_size_bytes', new.file_size_bytes));
  return new;
end;
$$;

drop trigger if exists audit_candidate_document_upload on public.uploaded_documents;
create trigger audit_candidate_document_upload
after insert on public.uploaded_documents
for each row execute function public.audit_candidate_document_upload();
