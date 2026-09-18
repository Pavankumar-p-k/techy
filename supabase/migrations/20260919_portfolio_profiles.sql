-- ============================================================
-- Auto Portfolio Profile migration
-- Adds portfolio configuration to profiles + storage bucket.
-- Existing tables/columns are NOT touched.
-- ============================================================

-- 1. Profile columns
alter table public.profiles
  add column if not exists portfolio_enabled boolean not null default false,
  add column if not exists portfolio_type text check (portfolio_type in ('html','zip','external')),
  add column if not exists portfolio_html text,
  add column if not exists portfolio_storage_path text,
  add column if not exists portfolio_external_url text,
  add column if not exists portfolio_updated_at timestamptz;

-- 2. Storage bucket for portfolio ZIPs (private — served via validated API route)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolios', 'portfolios', false, 10485760,
        array['application/zip','application/x-zip-compressed','application/octet-stream'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3. Policies: owner-only access
drop policy if exists "Portfolio upload own folder" on storage.objects;
create policy "Portfolio upload own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portfolios'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Portfolio read own folder" on storage.objects;
create policy "Portfolio read own folder"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'portfolios'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Portfolio update own folder" on storage.objects;
create policy "Portfolio update own folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'portfolios'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Portfolio delete own folder" on storage.objects;
create policy "Portfolio delete own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'portfolios'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Helper: reject unsafe ZIP entry paths (traversal, absolute, dotfiles)
create or replace function public.is_safe_zip_path(path text)
returns boolean as $$
begin
  if path is null then
    return false;
  end if;

  -- Reject absolute paths, traversal, backslashes, dotfiles/dirs, control chars
  return path !~ '^/'
    and path !~ '(^|/)\.\.(/|$)'
    and path !~ '\\'
    and path !~ '(^|/)\.[^/.]'
    and path ~ '^[A-Za-z0-9][A-Za-z0-9 _\-/.]*$'
    and char_length(path) <= 200;
end;
$$ language plpgsql immutable;
