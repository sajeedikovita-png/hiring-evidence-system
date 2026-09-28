// Run: npm install --prefix /tmp/hiring-pricing-db-test @electric-sql/pglite --no-audit --no-fund
// Then: node tests/sql/launch-pricing-pglite.mjs
const { PGlite } = await import(process.env.PGLITE_MODULE_PATH || '/tmp/hiring-pricing-db-test/node_modules/@electric-sql/pglite/dist/index.js');
import fs from 'node:fs';
const db=new PGlite();
const cwd=process.cwd();
const orig=fs.readFileSync(cwd+'/supabase/migrations/202609090002_pilot_lifecycle.sql','utf8');
const table=orig.slice(orig.indexOf('create table if not exists public.ongoing_access_requests'),orig.indexOf('alter table public.ongoing_access_requests enable'));
await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values('00000000-0000-0000-0000-000000000100'); create function auth.uid() returns uuid language sql as $$ select '00000000-0000-0000-0000-000000000100'::uuid $$;
create table companies(id uuid primary key,name text,status text);
create table recruiter_profiles(id uuid primary key,company_id uuid,user_id uuid,role text,status text,email text,display_name text);
create table demo_entitlements(company_id uuid primary key,state text,activated_at timestamptz,active_until timestamptz,max_jobs int default1,max_candidates int default50,max_users int default2);
create table job_roles(id uuid primary key default gen_random_uuid(),company_id uuid,title text,status text);
create table uploaded_documents(id uuid,company_id uuid,created_at timestamptz);
create table audit_log_entries(company_id uuid,actor_profile_id uuid,entity_type text,entity_id uuid,action text,metadata jsonb);
create table support_knowledge_base_articles(slug text,body text,updated_at timestamptz);
create function current_company_ids() returns setof uuid language sql as $$ select company_id from recruiter_profiles where user_id=auth.uid() $$;
create function is_current_user_admin() returns boolean language sql as $$ select true $$;
create function demo_workspace_is_writable(uuid) returns boolean language sql as $$ select true $$;
`.replaceAll('default1','default 1').replaceAll('default50','default 50').replaceAll('default2','default 2'));
await db.exec(table);
const pricing=fs.readFileSync(cwd+'/supabase/migrations/202609100001_ongoing_access_pricing_schedule.sql','utf8');
await db.exec(pricing.slice(0,pricing.indexOf('create or replace function')));
await db.exec(orig.slice(orig.indexOf('create or replace function public.pilot_job_role_limit'),orig.indexOf('create or replace function public.enforce_demo_job_quota')));
await db.exec(`insert into companies values('00000000-0000-0000-0000-000000000099','Legacy','active'); insert into demo_entitlements(company_id) values('00000000-0000-0000-0000-000000000099');`);
await db.exec(fs.readFileSync(cwd+'/supabase/migrations/202609190001_launch_149_pricing.sql','utf8'));
const legacy=await db.query(`select max_jobs,commercial_terms_version from demo_entitlements where company_id='00000000-0000-0000-0000-000000000099'`);
if(legacy.rows[0].max_jobs!==1 || legacy.rows[0].commercial_terms_version!=='legacy') throw Error('Legacy agreement mutated');

// Crypto shims are fixture-only: production uses pgcrypto gen_random_bytes/digest.
// Tests validate token handling/access behavior, not pgcrypto implementation.
await db.exec(`create schema extensions;
create function extensions.gen_random_bytes(n integer) returns bytea language sql volatile as $$ select decode(replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),'hex') $$;
create function extensions.digest(t text,algorithm text) returns bytea language sql immutable as $$ select sha256(convert_to(t,'UTF8')) $$;
create table candidates(id uuid primary key,company_id uuid,name text,email text,updated_at timestamptz default now());
create table candidate_applications(id uuid primary key,company_id uuid,candidate_id uuid,consent_status text);
create table evidence_reports(id uuid primary key,company_id uuid,job_id uuid,application_id uuid,candidate_id uuid,public_report_code text,missing_evidence jsonb,verification_needed jsonb,suggested_interview_questions jsonb,recruiter_notes jsonb,generated_at timestamptz);
create table evidence_items(id uuid default gen_random_uuid(),company_id uuid,report_id uuid,requirement text,candidate_evidence text,source text,source_reference text,status_label text,verification_needed text,created_at timestamptz);
create table human_review_decisions(id uuid default gen_random_uuid(),company_id uuid,report_id uuid,decision text,reason text,status text,created_at timestamptz);
create table candidate_privacy_requests(company_id uuid,candidate_id uuid,request_type text,identity_verified_at timestamptz,status text);
create table parsed_cvs(id uuid primary key default gen_random_uuid(),company_id uuid,document_id uuid,application_id uuid,status text,extracted_name text,created_at timestamptz default now());
create table company_settings(company_id uuid primary key,display_name text,logo_url text,accent_color text,report_branding jsonb,active_report_template_id uuid);
create table company_template_versions(id uuid primary key,company_id uuid,template_kind text,content jsonb);
insert into companies values('00000000-0000-0000-0000-000000000001','Agency','active'),('00000000-0000-0000-0000-000000000002','Other','active');
insert into recruiter_profiles values('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001',auth.uid(),'admin','active','recruiter@example.invalid','Recruiter');
insert into job_roles values('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','Developer','open');
insert into candidates values('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000001','Amanda','secret@example.invalid');
insert into candidate_applications values('00000000-0000-0000-0000-000000000025','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000021','recorded');
insert into evidence_reports values('00000000-0000-0000-0000-000000000031','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000025','00000000-0000-0000-0000-000000000021','HER-TEST','["Check person@example.com"]','["https://private.example/private"]','["Explain project"]','["HIDDEN_INTERNAL_NOTE"]',now());
insert into evidence_reports(id,company_id) values('00000000-0000-0000-0000-000000000032','00000000-0000-0000-0000-000000000002');
insert into evidence_items(company_id,report_id,requirement,candidate_evidence,source,source_reference,status_label,verification_needed,created_at) values
('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000031','React','Built UI person@example.com https://private.example/CV','Resume','CV p1','Evidence found','Check experience',now()-interval '1 minute'),
('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000031','Communication','HIDDEN_INTERNAL_NOTE','Recruiter note','HIDDEN_INTERNAL_NOTE','Evidence found','HIDDEN_INTERNAL_NOTE',now());
insert into human_review_decisions(company_id,report_id,decision,reason,status,created_at) values('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000031','Hold for review','Verify project','saved',now());
insert into company_settings(company_id,display_name,logo_url,accent_color,report_branding) values('00000000-0000-0000-0000-000000000001','Agency','','#28543f','{"heading":"Candidate evidence summary","footer":"Human review required"}');
`);
await db.exec(fs.readFileSync(cwd+'/supabase/migrations/202609190002_client_report_shares.sql','utf8'));
await db.exec(fs.readFileSync(cwd+'/supabase/migrations/202609190014_candidate_sharing_authority.sql','utf8'));
await db.exec(fs.readFileSync(cwd+'/supabase/migrations/202609190015_permanently_revoke_candidate_shares.sql','utf8'));
await db.exec(fs.readFileSync(cwd+'/supabase/migrations/202609190016_candidate_identity.sql','utf8'));
await db.exec(fs.readFileSync(cwd+'/tests/sql/client-report-share-behavior.sql','utf8'));
console.log('Client share embedded PostgreSQL behavior passed.');
await db.close();
