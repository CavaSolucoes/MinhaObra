-- SOMENTE para testes locais (Postgres descartável): simula o mínimo do Supabase, INCLUINDO os privilégios padrão amplos
-- (anon, authenticated e service_role recebem ALL em tabelas, sequências e funções criadas no schema public). NUNCA rodar no Supabase.
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
alter role service_role bypassrls;   -- como no Supabase (o papel pode já existir no cluster de teste sem este atributo)
create schema extensions; create schema auth; create schema storage;
create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table storage.buckets(id text primary key, name text, public boolean);
create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(n text) returns text[] language sql as $$ select string_to_array(n,'/') $$;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;
insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001','admin@cava.test'),('bbbbbbbb-0000-0000-0000-000000000002','client@x.test');
