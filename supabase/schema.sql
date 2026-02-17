-- Student Tool Hub schema
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  bio text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  url text not null,
  logo_url text,
  category text not null,
  short_description text not null,
  how_it_works text not null,
  free_type text not null check (free_type in ('free_forever', 'freemium', 'trial', 'open_source', 'student_plan')),
  free_details text not null,
  pricing_notes text,
  tags text[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('draft', 'pending', 'published', 'rejected')),
  moderation_notes text,
  is_verified boolean not null default false,
  avg_rating numeric(3,2) not null default 0,
  review_count integer not null default 0,
  click_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tool_reviews (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references public.tools(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  review_text text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tool_id, user_id)
);

create table if not exists public.tool_bookmarks (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references public.tools(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tool_id, user_id)
);

create table if not exists public.tool_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  url text not null,
  category text not null,
  short_description text not null,
  how_it_works text not null,
  free_type text not null check (free_type in ('free_forever', 'freemium', 'trial', 'open_source', 'student_plan')),
  free_details text not null,
  tags text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderation_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  category text not null,
  short_description text not null,
  free_details text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tool_updates (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references public.tools(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  field_name text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create table if not exists public.tool_guides (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null unique references public.tools(id) on delete cascade,
  summary text not null,
  free_access_notes text,
  requires_login boolean not null default false,
  requires_api_key boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tool_guide_steps (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.tool_guides(id) on delete cascade,
  step_order integer not null check (step_order > 0),
  title text not null,
  description text not null,
  image_url text,
  created_at timestamptz not null default now(),
  unique (guide_id, step_order)
);

create index if not exists idx_tools_status_created_at on public.tools(status, created_at desc);
create index if not exists idx_tools_category on public.tools(category);
create index if not exists idx_tools_free_type on public.tools(free_type);
create index if not exists idx_tool_reviews_tool on public.tool_reviews(tool_id);
create index if not exists idx_tool_reviews_user on public.tool_reviews(user_id);
create index if not exists idx_tool_bookmarks_user on public.tool_bookmarks(user_id);
create index if not exists idx_tool_submissions_status on public.tool_submissions(status, created_at);
create index if not exists idx_tool_guides_tool_id on public.tool_guides(tool_id);
create index if not exists idx_tool_guide_steps_guide_order on public.tool_guide_steps(guide_id, step_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id and role = 'admin'
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', null)
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    updated_at = now();

  return new;
end;
$$;

create or replace function public.refresh_tool_rating(target_tool_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  avg_score numeric;
  total_reviews integer;
begin
  select
    coalesce(avg(rating), 0),
    count(*)
  into avg_score, total_reviews
  from public.tool_reviews
  where tool_id = target_tool_id;

  update public.tools
  set
    avg_rating = round(avg_score::numeric, 2),
    review_count = total_reviews,
    updated_at = now()
  where id = target_tool_id;
end;
$$;

create or replace function public.after_review_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_tool_rating(old.tool_id);
  else
    perform public.refresh_tool_rating(new.tool_id);
  end if;

  return null;
end;
$$;

create or replace function public.increment_tool_click(target_tool_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tools
  set click_count = click_count + 1
  where id = target_tool_id and status = 'published';
end;
$$;

create or replace function public.log_tool_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.tool_updates (tool_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'status', old.status, new.status);
  end if;

  return new;
end;
$$;

create or replace function public.approve_submission(submission_id uuid, moderation_comment text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  submission public.tool_submissions%rowtype;
  generated_slug text;
  slug_candidate text;
  suffix integer := 1;
  new_tool_id uuid;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can approve submissions';
  end if;

  select *
  into submission
  from public.tool_submissions
  where id = submission_id and status = 'pending'
  for update;

  if submission.id is null then
    raise exception 'Submission not found or already reviewed';
  end if;

  generated_slug := lower(regexp_replace(submission.name, '[^a-zA-Z0-9]+', '-', 'g'));
  generated_slug := trim(both '-' from generated_slug);
  if generated_slug = '' then
    generated_slug := 'tool';
  end if;

  slug_candidate := generated_slug;
  while exists (select 1 from public.tools where slug = slug_candidate) loop
    slug_candidate := generated_slug || '-' || suffix;
    suffix := suffix + 1;
  end loop;

  insert into public.tools (
    slug,
    name,
    url,
    category,
    short_description,
    how_it_works,
    free_type,
    free_details,
    tags,
    created_by,
    status,
    is_verified,
    moderation_notes
  ) values (
    slug_candidate,
    submission.name,
    submission.url,
    submission.category,
    submission.short_description,
    submission.how_it_works,
    submission.free_type,
    submission.free_details,
    submission.tags,
    submission.submitted_by,
    'published',
    true,
    moderation_comment
  ) returning id into new_tool_id;

  update public.tool_submissions
  set
    status = 'approved',
    moderation_notes = moderation_comment,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = submission_id;

  return new_tool_id;
end;
$$;

create or replace function public.reject_submission(submission_id uuid, moderation_comment text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can reject submissions';
  end if;

  update public.tool_submissions
  set
    status = 'rejected',
    moderation_notes = moderation_comment,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = submission_id and status = 'pending';
end;
$$;

create or replace function public.set_admin_by_email(target_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and session_user not in ('postgres', 'supabase_admin') then
    raise exception 'Only service_role can call set_admin_by_email';
  end if;

  update public.profiles
  set role = 'admin', updated_at = now()
  where lower(email) = lower(target_email);
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_tools_updated_at on public.tools;
create trigger trg_tools_updated_at
before update on public.tools
for each row execute function public.set_updated_at();

drop trigger if exists trg_tool_reviews_updated_at on public.tool_reviews;
create trigger trg_tool_reviews_updated_at
before update on public.tool_reviews
for each row execute function public.set_updated_at();

drop trigger if exists trg_tool_guides_updated_at on public.tool_guides;
create trigger trg_tool_guides_updated_at
before update on public.tool_guides
for each row execute function public.set_updated_at();

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

drop trigger if exists trg_after_review_change on public.tool_reviews;
create trigger trg_after_review_change
after insert or update or delete on public.tool_reviews
for each row execute function public.after_review_change();

drop trigger if exists trg_log_tool_status_change on public.tools;
create trigger trg_log_tool_status_change
after update on public.tools
for each row execute function public.log_tool_status_change();

alter table public.profiles enable row level security;
alter table public.tools enable row level security;
alter table public.tool_reviews enable row level security;
alter table public.tool_bookmarks enable row level security;
alter table public.tool_submissions enable row level security;
alter table public.platform_resources enable row level security;
alter table public.tool_updates enable row level security;
alter table public.tool_guides enable row level security;
alter table public.tool_guide_steps enable row level security;

drop policy if exists "Profiles public read" on public.profiles;
create policy "Profiles public read"
on public.profiles
for select
using (true);

drop policy if exists "Profiles insert own" on public.profiles;
create policy "Profiles insert own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Profiles update own" on public.profiles;
create policy "Profiles update own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Tools public read published" on public.tools;
create policy "Tools public read published"
on public.tools
for select
using (
  status = 'published'
  or auth.uid() = created_by
  or public.is_admin(auth.uid())
);

drop policy if exists "Tools insert by owner" on public.tools;
create policy "Tools insert by owner"
on public.tools
for insert
to authenticated
with check (
  auth.uid() = created_by
  and status in ('draft', 'pending')
);

drop policy if exists "Tools update owner or admin" on public.tools;
create policy "Tools update owner or admin"
on public.tools
for update
to authenticated
using (
  public.is_admin(auth.uid())
  or (auth.uid() = created_by and status in ('draft', 'pending'))
)
with check (
  public.is_admin(auth.uid())
  or (auth.uid() = created_by and status in ('draft', 'pending'))
);

drop policy if exists "Tools delete admin" on public.tools;
create policy "Tools delete admin"
on public.tools
for delete
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "Reviews public read" on public.tool_reviews;
create policy "Reviews public read"
on public.tool_reviews
for select
using (
  is_public = true
  or auth.uid() = user_id
  or public.is_admin(auth.uid())
);

drop policy if exists "Reviews insert own" on public.tool_reviews;
create policy "Reviews insert own"
on public.tool_reviews
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Reviews update own or admin" on public.tool_reviews;
create policy "Reviews update own or admin"
on public.tool_reviews
for update
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "Reviews delete own or admin" on public.tool_reviews;
create policy "Reviews delete own or admin"
on public.tool_reviews
for delete
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "Bookmarks select own" on public.tool_bookmarks;
create policy "Bookmarks select own"
on public.tool_bookmarks
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Bookmarks insert own" on public.tool_bookmarks;
create policy "Bookmarks insert own"
on public.tool_bookmarks
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Bookmarks delete own" on public.tool_bookmarks;
create policy "Bookmarks delete own"
on public.tool_bookmarks
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Submissions select own or admin" on public.tool_submissions;
create policy "Submissions select own or admin"
on public.tool_submissions
for select
to authenticated
using (auth.uid() = submitted_by or public.is_admin(auth.uid()));

drop policy if exists "Submissions insert own" on public.tool_submissions;
create policy "Submissions insert own"
on public.tool_submissions
for insert
to authenticated
with check (auth.uid() = submitted_by);

drop policy if exists "Submissions update admin" on public.tool_submissions;
create policy "Submissions update admin"
on public.tool_submissions
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Resources public read" on public.platform_resources;
create policy "Resources public read"
on public.platform_resources
for select
using (true);

drop policy if exists "Resources admin manage" on public.platform_resources;
create policy "Resources admin manage"
on public.platform_resources
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Tool updates public read" on public.tool_updates;
create policy "Tool updates public read"
on public.tool_updates
for select
using (true);

drop policy if exists "Tool guides public read" on public.tool_guides;
create policy "Tool guides public read"
on public.tool_guides
for select
using (true);

drop policy if exists "Tool guides admin manage" on public.tool_guides;
create policy "Tool guides admin manage"
on public.tool_guides
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Tool guide steps public read" on public.tool_guide_steps;
create policy "Tool guide steps public read"
on public.tool_guide_steps
for select
using (true);

drop policy if exists "Tool guide steps admin manage" on public.tool_guide_steps;
create policy "Tool guide steps admin manage"
on public.tool_guide_steps
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
on storage.objects
for select
using (bucket_id = 'avatars');

drop policy if exists "Avatar upload in own folder" on storage.objects;
create policy "Avatar upload in own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Avatar update own folder files" on storage.objects;
create policy "Avatar update own folder files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Avatar delete own folder files" on storage.objects;
create policy "Avatar delete own folder files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

revoke select on table public.profiles from anon, authenticated;
grant select (id, full_name, avatar_url, bio, role, created_at, updated_at) on table public.profiles to anon, authenticated;

revoke execute on function public.set_admin_by_email(text) from public, anon, authenticated;
grant execute on function public.set_admin_by_email(text) to service_role;

grant execute on function public.is_admin(uuid) to anon, authenticated;
grant execute on function public.increment_tool_click(uuid) to anon, authenticated;
grant execute on function public.approve_submission(uuid, text) to authenticated;
grant execute on function public.reject_submission(uuid, text) to authenticated;
