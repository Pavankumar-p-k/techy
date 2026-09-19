-- ============================================================
-- posts.project_id had no foreign key constraint, so PostgREST
-- refused the "posts.select('*, projects(...)')" embed with:
--   Could not find a relationship between 'posts' and 'projects'
-- This adds the FK. Existing data is validated first.
-- ▶ RUN IN SUPABASE SQL EDITOR — idempotent.
-- ============================================================

-- 1. Clean any orphaned project_id values (projects were deletable before the FK)
do $$
declare
  orphan_count integer;
begin
  select count(*) into orphan_count
  from public.posts p
  where p.project_id is not null
    and not exists (select 1 from public.projects pr where pr.id = p.project_id);

  if orphan_count > 0 then
    update public.posts set project_id = null
    where project_id is not null
      and not exists (select 1 from public.projects pr where pr.id = project_id);
    raise notice 'Cleared % orphaned posts.project_id references.', orphan_count;
  end if;
end
$$;

-- 2. Add the foreign key (posts -> projects)
alter table public.posts
  drop constraint if exists posts_project_id_fkey;
alter table public.posts
  add constraint posts_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete set null;

-- 3. Index for the embed join performance
create index if not exists idx_posts_project_fk on public.posts(project_id);

-- 4. Reload the PostgREST schema cache so the embed is detected immediately
notify pgrst, 'reload schema';
