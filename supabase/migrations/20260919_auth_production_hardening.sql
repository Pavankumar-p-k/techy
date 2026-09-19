-- Production auth hardening
-- Profiles must be created by the database trigger because email-confirmed
-- signups do not have an authenticated browser session yet.

alter table public.profiles
  add column if not exists username text;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (username)
  where username is not null;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate_username text;
  suffix integer := 0;
begin
  base_username := regexp_replace(
    lower(coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'student')),
    '[^a-z0-9_]+',
    '_',
    'g'
  );
  base_username := trim(both '_' from base_username);
  base_username := left(nullif(base_username, ''), 20);

  if base_username is null then
    base_username := 'student';
  end if;

  candidate_username := base_username;
  while exists (
    select 1
    from public.profiles
    where username = candidate_username
      and id <> new.id
  ) loop
    suffix := suffix + 1;
    candidate_username := left(base_username, greatest(1, 20 - length(suffix::text) - 1))
      || '_' || suffix::text;
  end loop;

  insert into public.profiles (id, email, full_name, username)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    candidate_username
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    username = coalesce(public.profiles.username, excluded.username),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
