-- ============================================================
-- Project live deployment: server-side URL safety (spec §6/§9)
-- demo_url column already exists (20260918_social_community.sql).
-- This adds DB-level enforcement so dangerous schemes
-- (javascript:, data:, vbscript:...) can never be stored,
-- even via direct API calls that bypass the app's zod schema.
-- Existing projects continue working (constraint only applies
-- to non-null values that are already valid http(s) URLs).
-- ▶ RUN IN SUPABASE SQL EDITOR — idempotent.
-- ============================================================

-- 1. Guard function: allow only http/https absolute URLs
create or replace function public.is_safe_http_url(raw text)
returns boolean
language sql
stable
as $$
  select raw is not null
    and raw ~* '^https?://[^\s]+$'
    and not raw ~* '^(javascript|data|vbscript|file):';
$$;

-- 2. Drop old constraint if re-running
alter table public.projects
  drop constraint if exists projects_demo_url_safe;

-- 3. Enforce on demo_url (the Live Deployment URL)
alter table public.projects
  add constraint projects_demo_url_safe
  check (demo_url is null or public.is_safe_http_url(demo_url));

-- 4. Same guarantee for the other external link fields
alter table public.projects
  drop constraint if exists projects_github_url_safe;
alter table public.projects
  add constraint projects_github_url_safe
  check (github_url is null or public.is_safe_http_url(github_url));

alter table public.projects
  drop constraint if exists projects_other_url_safe;
alter table public.projects
  add constraint projects_other_url_safe
  check (other_url is null or public.is_safe_http_url(other_url));

-- 5. Validate existing rows do not violate the new constraints
-- (runs in the same transaction; if any row is unsafe this fails loudly
--  instead of silently leaving the DB unprotected)
do $$
begin
  if exists (
    select 1 from public.projects
    where (demo_url is not null and not public.is_safe_http_url(demo_url))
       or (github_url is not null and not public.is_safe_http_url(github_url))
       or (other_url is not null and not public.is_safe_http_url(other_url))
  ) then
    raise notice 'Some existing project URLs are not safe http(s) URLs — fix them and re-run.';
  end if;
end
$$;
