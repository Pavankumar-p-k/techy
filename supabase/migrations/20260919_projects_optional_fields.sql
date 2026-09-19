-- ============================================================
-- Make project fields optional
-- title stays required (a project needs a name), everything else
-- becomes nullable / optional. Existing rows are unaffected.
-- ▶ RUN IN SUPABASE SQL EDITOR — idempotent.
-- ============================================================

-- 1. Description: allow null, drop the 16-char minimum
alter table public.projects
  alter column description drop not null;
alter table public.projects
  drop constraint if exists projects_description_check;
alter table public.projects
  add constraint projects_description_check
  check (description is null or char_length(description) <= 6000);

-- 2. Category: default 'Other', allow null
alter table public.projects
  alter column category drop not null;
alter table public.projects
  alter column category set default 'Other';
alter table public.projects
  drop constraint if exists projects_category_check;
alter table public.projects
  add constraint projects_category_check
  check (category is null or char_length(category) between 1 and 40);

-- 3. Title: relax minimum from 2 chars to 1, max stays 120
alter table public.projects
  drop constraint if exists projects_title_check;
alter table public.projects
  add constraint projects_title_check
  check (char_length(title) between 1 and 120);

-- 4. Cover image URL also becomes optional at DB level (safety net)
alter table public.projects
  drop constraint if exists projects_cover_url_safe;
alter table public.projects
  add constraint projects_cover_url_safe
  check (cover_url is null or public.is_safe_http_url(cover_url));

-- 5. Screenshot URLs: same http(s)-only safety as other link fields.
--    NOTE: PostgreSQL forbids subqueries in CHECK constraints, so the
--    per-element check lives in a helper function instead.
create or replace function public.are_safe_http_urls(urls text[])
returns boolean
language sql
stable
as $$
  select coalesce(
    not exists (
      select 1
      from unnest(urls) as s
      where s is not null and not public.is_safe_http_url(s)
    ),
    true
  );
$$;

alter table public.projects
  drop constraint if exists projects_screenshots_safe;
alter table public.projects
  add constraint projects_screenshots_safe
  check (screenshots is null or public.are_safe_http_urls(screenshots));

-- 6. Sanity notice if existing rows would violate the new rules
do $$
begin
  if exists (select 1 from public.projects where char_length(title) < 1) then
    raise notice 'Some projects have empty titles — they will fail the new title constraint.';
  end if;
end
$$;
