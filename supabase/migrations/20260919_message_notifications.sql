-- ============================================================
-- Message notifications
-- Adds the missing 'message' notification trigger: when a message
-- is sent, every OTHER member of the conversation gets a
-- notification with a deep link to the conversation.
--
-- Dedup: while an unread 'message' notification for the same
-- conversation already exists, new messages do NOT create extra
-- rows (prevents unread-badge spam in active chats).
--
-- ▶▶▶ RUN THIS IN SUPABASE SQL EDITOR ◀◀◀
-- ============================================================

create or replace function public.notify_on_message()
returns trigger as $$
begin
  insert into public.notifications (user_id, actor_id, type, entity_id, body)
  select m.user_id, new.sender_id, 'message', new.conversation_id, left(new.content, 120)
  from public.conversation_members m
  where m.conversation_id = new.conversation_id
    and m.user_id <> new.sender_id
    and not exists (
      select 1 from public.notifications n
      where n.user_id = m.user_id
        and n.type = 'message'
        and n.entity_id = new.conversation_id
        and n.is_read = false
    );
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_message on public.messages;
create trigger trg_notify_message
  after insert on public.messages
  for each row execute function public.notify_on_message();
