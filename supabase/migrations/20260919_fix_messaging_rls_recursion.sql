-- ============================================================
-- FIX: infinite recursion in messaging RLS policies (42P17)
--
-- The conversation policies queried conversation_members inside
-- their own USING clauses, so Postgres evaluated the policy,
-- which triggered the policy again... forever:
--   "infinite recursion detected in policy for relation
--    \"conversation_members\""
--
-- FIX (official Supabase pattern): check membership through
-- SECURITY DEFINER helper functions. A definer function runs as
-- the table owner, which bypasses RLS on the inner query, so the
-- recursion terminates. Also grants table/function privileges,
-- which newer Supabase projects do not apply by default.
--
-- ▶▶▶ RUN THIS IN SUPABASE SQL EDITOR ◀◀◀
-- Messaging (list, chat, groups, unread badges) is broken until
-- this is executed.
-- ============================================================

-- ------------------------------------------------------------
-- 1. SECURITY DEFINER membership helpers (recursion-safe)
-- ------------------------------------------------------------
create or replace function public.is_conversation_member(conv_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = conv_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.owns_conversation(conv_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversations
    where id = conv_id
      and created_by = auth.uid()
  );
$$;

-- ------------------------------------------------------------
-- 2. Replace the recursive policies
-- ------------------------------------------------------------

-- CONVERSATIONS
drop policy if exists "Conversations readable by members" on public.conversations;
create policy "Conversations readable by members"
  on public.conversations for select
  using (public.is_conversation_member(id));

drop policy if exists "Users create conversations" on public.conversations;
create policy "Users create conversations"
  on public.conversations for insert
  with check (auth.uid() = created_by);

drop policy if exists "Members update conversation" on public.conversations;
create policy "Members update conversation"
  on public.conversations for update
  using (public.is_conversation_member(id))
  with check (public.is_conversation_member(id));

-- CONVERSATION MEMBERS
drop policy if exists "Members see co-members" on public.conversation_members;
create policy "Members see co-members"
  on public.conversation_members for select
  using (public.is_conversation_member(conversation_id));

drop policy if exists "Conversation creator adds members" on public.conversation_members;
create policy "Conversation creator adds members"
  on public.conversation_members for insert
  with check (public.owns_conversation(conversation_id));

drop policy if exists "Owner removes members" on public.conversation_members;
create policy "Owner removes members"
  on public.conversation_members for delete
  using (public.owns_conversation(conversation_id));

drop policy if exists "Members leave conversations" on public.conversation_members;
create policy "Members leave conversations"
  on public.conversation_members for delete
  using (user_id = auth.uid());

-- MESSAGES
drop policy if exists "Messages readable by members" on public.messages;
create policy "Messages readable by members"
  on public.messages for select
  using (public.is_conversation_member(conversation_id));

drop policy if exists "Members send messages" on public.messages;
create policy "Members send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.is_conversation_member(conversation_id)
  );

-- ------------------------------------------------------------
-- 3. Privileges (newer Supabase projects skip these defaults)
-- ------------------------------------------------------------
grant select, insert, update, delete on
  public.follows, public.posts, public.post_likes, public.post_comments,
  public.projects, public.project_members, public.project_feedback,
  public.conversations, public.conversation_members, public.messages,
  public.notifications
to anon, authenticated;

grant execute on function public.is_conversation_member(uuid) to anon, authenticated;
grant execute on function public.owns_conversation(uuid) to anon, authenticated;
grant execute on function public.follow_user(uuid) to anon, authenticated;
grant execute on function public.unfollow_user(uuid) to anon, authenticated;
grant execute on function public.is_following(uuid) to anon, authenticated;
grant execute on function public.get_or_create_direct_conversation(uuid) to anon, authenticated;
