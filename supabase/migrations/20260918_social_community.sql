-- ============================================================
-- Student Community Platform — Social Layer Migration
-- Adds: profile extensions, follows, posts, likes, comments,
-- projects, members, feedback, conversations, messages, notifications.
-- Existing tables (tools, resources, etc.) are NOT touched.
-- Run top-to-bottom in Supabase SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES EXTENSION
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists username text unique,
  add column if not exists branch text,
  add column if not exists year text,
  add column if not exists college text,
  add column if not exists skills text[] default '{}',
  add column if not exists tools_used text[] default '{}',
  add column if not exists interests text[] default '{}',
  add column if not exists currently_building text,
  add column if not exists looking_for text,
  add column if not exists link_github text,
  add column if not exists link_linkedin text,
  add column if not exists link_instagram text,
  add column if not exists link_portfolio text,
  add column if not exists link_youtube text,
  add column if not exists link_x text,
  add column if not exists link_other text,
  add column if not exists show_links boolean default true;

create index if not exists idx_profiles_username on public.profiles(username);

-- ------------------------------------------------------------
-- 2. FOLLOWS
-- ------------------------------------------------------------
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists idx_follows_follower on public.follows(follower_id);
create index if not exists idx_follows_following on public.follows(following_id);

-- ------------------------------------------------------------
-- 3. POSTS (unified content model: normal / project / achievement /
--    course_completion / learning_update / project_update)
-- ------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  post_type text not null default 'normal'
    check (post_type in ('normal','project','achievement','course_completion','learning_update','project_update')),
  title text,
  content text not null,
  image_url text,
  tags text[] default '{}',
  project_id uuid,
  visibility text not null default 'public' check (visibility in ('public','followers')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_posts_author_created on public.posts(author_id, created_at desc);
create index if not exists idx_posts_created on public.posts(created_at desc);
create index if not exists idx_posts_project on public.posts(project_id);

-- ------------------------------------------------------------
-- 4. POST LIKES / COMMENTS (counts maintained by triggers)
-- ------------------------------------------------------------
create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists idx_post_likes_post on public.post_likes(post_id);
create index if not exists idx_post_likes_user on public.post_likes(user_id);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_post_comments_post on public.post_comments(post_id, created_at);
create index if not exists idx_post_comments_user on public.post_comments(user_id);

alter table public.posts
  add column if not exists like_count integer not null default 0,
  add column if not exists comment_count integer not null default 0;

-- Count maintenance triggers
create or replace function public.handle_post_like_change()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_post_like_count on public.post_likes;
create trigger trg_post_like_count
  after insert or delete on public.post_likes
  for each row execute function public.handle_post_like_change();

create or replace function public.handle_post_comment_change()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set comment_count = greatest(0, comment_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_post_comment_count on public.post_comments;
create trigger trg_post_comment_count
  after insert or delete on public.post_comments
  for each row execute function public.handle_post_comment_change();

-- ------------------------------------------------------------
-- 5. PROJECTS
-- ------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  description text not null check (char_length(description) between 16 and 6000),
  category text not null default 'Other',
  status text not null default 'building'
    check (status in ('planning','building','completed','maintaining','archived')),
  review_status text not null default 'approved' check (review_status in ('draft','pending','approved','rejected')),
  cover_url text,
  screenshots text[] default '{}',
  demo_url text,
  github_url text,
  other_url text,
  technologies text[] default '{}',
  tools_used text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_owner on public.projects(owner_id, created_at desc);
create index if not exists idx_projects_status on public.projects(review_status, created_at desc);
create index if not exists idx_projects_category on public.projects(category);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'contributor' check (role in ('owner','contributor')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists idx_project_members_project on public.project_members(project_id);
create index if not exists idx_project_members_user on public.project_members(user_id);

-- Owner is always a member
insert into public.project_members (project_id, user_id, role)
select p.id, p.owner_id, 'owner' from public.projects p
where not exists (
  select 1 from public.project_members m where m.project_id = p.id and m.user_id = p.owner_id
);

-- ------------------------------------------------------------
-- 6. PROJECT FEEDBACK
-- ------------------------------------------------------------
create table if not exists public.project_feedback (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  feedback_type text not null default 'suggestion'
    check (feedback_type in ('bug','suggestion','question','improvement')),
  content text not null check (char_length(content) between 4 and 2000),
  status text not null default 'open' check (status in ('open','in_progress','fixed','closed')),
  owner_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_feedback_project on public.project_feedback(project_id, created_at desc);

-- ------------------------------------------------------------
-- 7. CONVERSATIONS + MESSAGES
-- ------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct' check (type in ('direct','group','project')),
  title text,
  created_by uuid references public.profiles(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  unique (conversation_id, user_id)
);

create index if not exists idx_conversation_members_user on public.conversation_members(user_id);
create index if not exists idx_conversation_members_conv on public.conversation_members(conversation_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conv_created on public.messages(conversation_id, created_at desc);
create index if not exists idx_messages_sender on public.messages(sender_id);

-- Touch conversation.updated_at on new message
create or replace function public.handle_message_created()
returns trigger as $$
begin
  update public.conversations set updated_at = new.created_at where id = new.conversation_id;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_message_touch_conversation on public.messages;
create trigger trg_message_touch_conversation
  after insert on public.messages
  for each row execute function public.handle_message_created();

-- ------------------------------------------------------------
-- 8. NOTIFICATIONS
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('follow','like','comment','feedback','feedback_status','message','group_invite')),
  entity_id uuid,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications(user_id) where is_read = false;

-- Auto-notify helpers (like / comment / feedback / follow status change)
create or replace function public.notify_on_like()
returns trigger as $$
declare target_author uuid;
begin
  select author_id into target_author from public.posts where id = new.post_id;
  if target_author is not null and target_author <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, entity_id)
    values (target_author, new.user_id, 'like', new.post_id);
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_like on public.post_likes;
create trigger trg_notify_like
  after insert on public.post_likes
  for each row execute function public.notify_on_like();

create or replace function public.notify_on_comment()
returns trigger as $$
declare target_author uuid;
begin
  select author_id into target_author from public.posts where id = new.post_id;
  if target_author is not null and target_author <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, entity_id, body)
    values (target_author, new.user_id, 'comment', new.post_id, left(new.content, 120));
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_comment on public.post_comments;
create trigger trg_notify_comment
  after insert on public.post_comments
  for each row execute function public.notify_on_comment();

create or replace function public.notify_on_feedback()
returns trigger as $$
declare project_owner uuid;
begin
  select owner_id into project_owner from public.projects where id = new.project_id;
  if project_owner is not null and project_owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, entity_id, body)
    values (project_owner, new.user_id, 'feedback', new.project_id, left(new.content, 120));
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_feedback on public.project_feedback;
create trigger trg_notify_feedback
  after insert on public.project_feedback
  for each row execute function public.notify_on_feedback();

create or replace function public.notify_on_feedback_status()
returns trigger as $$
begin
  if new.status is distinct from old.status and new.status in ('in_progress','fixed','closed') then
    insert into public.notifications (user_id, actor_id, type, entity_id, body)
    values (old.user_id, new.user_id, 'feedback_status', new.project_id,
            'Your feedback was marked ' || replace(new.status, '_', ' '));
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_feedback_status on public.project_feedback;
create trigger trg_notify_feedback_status
  after update of status on public.project_feedback
  for each row execute function public.notify_on_feedback_status();

-- ------------------------------------------------------------
-- 9. RPC: follow / unfollow (with notification)
-- ------------------------------------------------------------
create or replace function public.follow_user(target_profile_id uuid)
returns void as $$
declare me uuid;
begin
  me := auth.uid();
  if me is null then raise exception 'Not authenticated'; end if;
  if me = target_profile_id then raise exception 'Cannot follow yourself'; end if;

  insert into public.follows (follower_id, following_id) values (me, target_profile_id)
  on conflict (follower_id, following_id) do nothing;

  if found then
    insert into public.notifications (user_id, actor_id, type, entity_id)
    values (target_profile_id, me, 'follow', me);
  end if;
end;
$$ language plpgsql security definer;

create or replace function public.unfollow_user(target_profile_id uuid)
returns void as $$
begin
  delete from public.follows
  where follower_id = auth.uid() and following_id = target_profile_id;
end;
$$ language plpgsql security definer;

create or replace function public.is_following(target_profile_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.follows
    where follower_id = auth.uid() and following_id = target_profile_id
  );
$$ language sql security definer stable;

-- ------------------------------------------------------------
-- 10. RPC: direct conversation between two users (no duplicates)
-- ------------------------------------------------------------
create or replace function public.get_or_create_direct_conversation(other_user uuid)
returns uuid as $$
declare
  me uuid;
  existing uuid;
  new_id uuid;
begin
  me := auth.uid();
  if me is null then raise exception 'Not authenticated'; end if;
  if me = other_user then raise exception 'Cannot message yourself'; end if;

  select c.id into existing
  from public.conversations c
  join public.conversation_members m1 on m1.conversation_id = c.id and m1.user_id = me
  join public.conversation_members m2 on m2.conversation_id = c.id and m2.user_id = other_user
  where c.type = 'direct'
  limit 1;

  if existing is not null then
    return existing;
  end if;

  insert into public.conversations (type, created_by) values ('direct', me)
  returning id into new_id;

  insert into public.conversation_members (conversation_id, user_id) values
    (new_id, me), (new_id, other_user);

  return new_id;
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------
-- 11. ENABLE RLS
-- ------------------------------------------------------------
alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_feedback enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

-- ------------------------------------------------------------
-- 12. RLS POLICIES
-- ------------------------------------------------------------

-- FOLLOWS
create policy "Follows are publicly visible"
  on public.follows for select using (true);

create policy "Users manage own follow relationships"
  on public.follows for insert
  with check (auth.uid() = follower_id and follower_id <> following_id);

create policy "Users remove own follows"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- POSTS
create policy "Posts are publicly readable"
  on public.posts for select using (true);

create policy "Users create own posts"
  on public.posts for insert
  with check (auth.uid() = author_id);

create policy "Users update own posts"
  on public.posts for update
  using (auth.uid() = author_id);

create policy "Users delete own posts"
  on public.posts for delete
  using (auth.uid() = author_id);

-- POST LIKES: anyone logged in can like; users can remove own likes
create policy "Likes readable by all"
  on public.post_likes for select using (true);

create policy "Users like as themselves"
  on public.post_likes for insert
  with check (auth.uid() = user_id);

create policy "Users remove own likes"
  on public.post_likes for delete
  using (auth.uid() = user_id);

-- POST COMMENTS
create policy "Comments readable by all"
  on public.post_comments for select using (true);

create policy "Users comment as themselves"
  on public.post_comments for insert
  with check (auth.uid() = user_id);

create policy "Users edit own comments"
  on public.post_comments for update
  using (auth.uid() = user_id);

create policy "Users delete own comments"
  on public.post_comments for delete
  using (auth.uid() = user_id);

-- PROJECTS: visible when approved (or owned/drafts by owner)
create policy "Approved projects readable by all"
  on public.projects for select
  using (review_status = 'approved' or auth.uid() = owner_id);

create policy "Users create own projects"
  on public.projects for insert
  with check (auth.uid() = owner_id);

create policy "Owners update own projects"
  on public.projects for update
  using (auth.uid() = owner_id);

create policy "Owners delete own projects"
  on public.projects for delete
  using (auth.uid() = owner_id);

-- PROJECT MEMBERS
create policy "Members readable by all"
  on public.project_members for select using (true);

create policy "Owners add members"
  on public.project_members for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    ) and user_id <> auth.uid()
  );

create policy "Owners remove members"
  on public.project_members for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

-- PROJECT FEEDBACK
create policy "Feedback readable by all"
  on public.project_feedback for select using (true);

create policy "Users create feedback as themselves"
  on public.project_feedback for insert
  with check (auth.uid() = user_id);

create policy "Only project owner updates feedback status"
  on public.project_feedback for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy "Feedback author or owner deletes"
  on public.project_feedback for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

-- CONVERSATIONS: members only
create policy "Conversations readable by members"
  on public.conversations for select
  using (
    exists (
      select 1 from public.conversation_members m
      where m.conversation_id = id and m.user_id = auth.uid()
    )
  );

create policy "Users create conversations"
  on public.conversations for insert
  with check (auth.uid() = created_by);

create policy "Members update conversation"
  on public.conversations for update
  using (
    exists (
      select 1 from public.conversation_members m
      where m.conversation_id = id and m.user_id = auth.uid()
    )
  );

-- CONVERSATION MEMBERS
create policy "Members see co-members"
  on public.conversation_members for select
  using (
    exists (
      select 1 from public.conversation_members m2
      where m2.conversation_id = conversation_id and m2.user_id = auth.uid()
    )
  );

create policy "Conversation creator adds members"
  on public.conversation_members for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.created_by = auth.uid()
    )
  );

create policy "Owner removes members"
  on public.conversation_members for delete
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.created_by = auth.uid()
    )
  );

-- MESSAGES: members only, send as self
create policy "Messages readable by members"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversation_members m
      where m.conversation_id = conversation_id and m.user_id = auth.uid()
    )
  );

create policy "Members send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversation_members m
      where m.conversation_id = conversation_id and m.user_id = auth.uid()
    )
  );

-- NOTIFICATIONS: own only
create policy "Notifications readable by owner"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Owner marks notifications read"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Owner deletes notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 13. REALTIME
-- ------------------------------------------------------------
alter table public.messages replica identity full;
alter table public.notifications replica identity full;

drop publication if exists supabase_realtime;
create publication supabase_realtime for table
  public.messages,
  public.notifications,
  public.posts,
  public.tools,
  public.platform_resources;

-- ------------------------------------------------------------
-- 14. STORAGE: post/project images bucket
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-media', 'community-media', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Community media public read"
  on storage.objects for select
  using (bucket_id = 'community-media');

create policy "Community media upload own folder"
  on storage.objects for insert
  with check (bucket_id = 'community-media' and auth.role() = 'authenticated'
              and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Community media update own folder"
  on storage.objects for update
  using (bucket_id = 'community-media' and auth.role() = 'authenticated'
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Community media delete own folder"
  on storage.objects for delete
  using (bucket_id = 'community-media' and auth.role() = 'authenticated'
         and (storage.foldername(name))[1] = auth.uid()::text);
