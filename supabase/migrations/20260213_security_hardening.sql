-- Security hardening migration:
-- 1) Restrict admin promotion RPC to service role usage.
-- 2) Prevent public/authenticated clients from selecting profile emails.

begin;

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

revoke execute on function public.set_admin_by_email(text) from public, anon, authenticated;
grant execute on function public.set_admin_by_email(text) to service_role;

revoke select on table public.profiles from anon, authenticated;
grant select (id, full_name, avatar_url, bio, role, created_at, updated_at) on table public.profiles to anon, authenticated;

commit;
