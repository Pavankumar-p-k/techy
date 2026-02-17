-- Adds setup-guide tables and ensures realtime publication includes feed/detail tables.

begin;

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

create index if not exists idx_tool_guides_tool_id on public.tool_guides(tool_id);
create index if not exists idx_tool_guide_steps_guide_order on public.tool_guide_steps(guide_id, step_order);

drop trigger if exists trg_tool_guides_updated_at on public.tool_guides;
create trigger trg_tool_guides_updated_at
before update on public.tool_guides
for each row execute function public.set_updated_at();

alter table public.tool_guides enable row level security;
alter table public.tool_guide_steps enable row level security;

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

alter table public.tools replica identity full;
alter table public.platform_resources replica identity full;
alter table public.tool_guides replica identity full;
alter table public.tool_guide_steps replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tools'
  ) then
    alter publication supabase_realtime add table public.tools;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'platform_resources'
  ) then
    alter publication supabase_realtime add table public.platform_resources;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tool_guides'
  ) then
    alter publication supabase_realtime add table public.tool_guides;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tool_guide_steps'
  ) then
    alter publication supabase_realtime add table public.tool_guide_steps;
  end if;
end $$;

commit;
