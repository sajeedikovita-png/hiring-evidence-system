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
await db.exec(fs.readFileSync(cwd+'/tests/sql/launch-pricing-behavior.sql','utf8'));
await db.exec(`create or replace function is_current_user_admin() returns boolean language sql as $$ select false $$;`);
try { await db.query(`select confirm_launch_founder_payment('00000000-0000-0000-0000-000000000001',now(),'TEST-PAID-001')`); throw Error('Unauthorized payment accepted'); } catch(e) { if(!e.message.includes('NOT_PLATFORM_ADMIN')) throw e; }
console.log('Embedded PostgreSQL launch pricing behavioral tests passed.');
await db.close();
