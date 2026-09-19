/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ConversationListItem, SocialProfile } from "@/lib/types";
import { timeAgo } from "@/lib/social-utils";
import { getInitials } from "@/lib/utils";

interface NewGroupMember {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url?: string | null;
}

export function MessagesClient() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { user, loading } = useAuthUser();

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<NewGroupMember[]>([]);
  const [searchResults, setSearchResults] = useState<NewGroupMember[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data, error: conversationsError } = await supabase
      .from("conversations")
      .select(`
        *,
        conversation_members!inner(user_id),
        messages(content, created_at, sender_id)
      `)
      .eq("conversation_members.user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (conversationsError) {
      setError(conversationsError.message);
      setIsLoading(false);
      return;
    }

    // Fetch members + profiles for each conversation
    const conversationIds = ((data ?? []) as unknown as ConversationListItem[]).map((item) => item.id);

    if (conversationIds.length === 0) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    const { data: memberData } = await supabase
      .from("conversation_members")
      .select("conversation_id, user_id, profiles(id, username, full_name, avatar_url)")
      .in("conversation_id", conversationIds);

    const membersByConversation = new Map<string, NewGroupMember[]>();
    const memberRowsTyped = ((memberData ?? []) as unknown) as { conversation_id: string; profiles: NewGroupMember | null }[];
    for (const member of memberRowsTyped) {
      const list = membersByConversation.get(member.conversation_id) ?? [];
      if (member.profiles) {
        list.push(member.profiles);
      }
      membersByConversation.set(member.conversation_id, list);
    }

    const enriched = ((data ?? []) as unknown as ConversationListItem[]).map((conversation) => ({
      ...conversation,
      conversation_members: (membersByConversation.get(conversation.id) ?? []).map((profile): ConversationListItem["conversation_members"][number] => ({
        user_id: profile.id,
        profiles: {
          id: profile.id,
          username: profile.username ?? null,
          full_name: profile.full_name ?? null,
          avatar_url: profile.avatar_url ?? null,
        },
      })),
    }));

    setConversations(enriched);
    setIsLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // Realtime: new messages refresh the list
  useEffect(() => {
    if (!user) {
      return;
    }

    const channel = supabase
      .channel(`messages-list-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        void loadConversations();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, user, loadConversations]);

  // Student search for group creation
  useEffect(() => {
    let mounted = true;

    async function search() {
      if (studentSearch.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .or(`username.ilike.%${studentSearch.trim()}%,full_name.ilike.%${studentSearch.trim()}%`)
        .neq("id", user?.id ?? "")
        .limit(8);

      if (mounted) {
        setSearchResults((data as NewGroupMember[]) ?? []);
      }
    }

    void search();

    return () => {
      mounted = false;
    };
  }, [supabase, studentSearch, user]);

  async function createGroup() {
    if (!user || !groupName.trim() || selectedMembers.length === 0) {
      setError("Group name and at least one member are required.");
      return;
    }

    setCreating(true);
    setError(null);

    const { data: conversationId, error: conversationError } = await supabase
      .from("conversations")
      .insert({ type: "group", title: groupName.trim(), created_by: user.id })
      .select("id")
      .single();

    if (conversationError || !conversationId) {
      setError(conversationError?.message ?? "Failed to create group.");
      setCreating(false);
      return;
    }

    const memberRows = [
      { conversation_id: conversationId.id, user_id: user.id, role: "owner" as const },
      ...selectedMembers.map((member) => ({ conversation_id: conversationId.id, user_id: member.id })),
    ];

    const { error: membersError } = await supabase.from("conversation_members").insert(memberRows);

    if (membersError) {
      setError(membersError.message);
      setCreating(false);
      return;
    }

    setShowGroupForm(false);
    setGroupName("");
    setSelectedMembers([]);
    setCreating(false);
    router.push(`/messages/${conversationId.id}`);
  }

  function conversationTitle(conversation: ConversationListItem): string {
    if (conversation.type === "direct") {
      const other = conversation.conversation_members.find((member) => member.user_id !== user?.id);
      return other?.profiles?.full_name ?? "Direct message";
    }
    return conversation.title ?? "Group";
  }

  if (loading || isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="skeleton h-8 w-40" />
        <div className="mt-5 space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <div className="card p-8 text-center">
          <h1 className="section-title text-2xl font-black tracking-tight">Messages</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Login to chat with other students.</p>
          <Link href="/login?next=/messages" className="btn btn-primary btn-md mt-5">
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-0">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight text-[var(--color-ink)]">Messages</h1>
        <button type="button" onClick={() => setShowGroupForm((current) => !current)} className="btn btn-ghost btn-sm">
          {showGroupForm ? "Cancel" : "+ New Group"}
        </button>
      </div>

      {/* Group creation form */}
      {showGroupForm ? (
        <div className="card mt-4 p-4">
          <label className="label">
            Group name
            <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="AI Project Team" className="field" maxLength={80} />
          </label>

          <label className="label mt-3">
            Add members
            <input
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Search students by name or @username..."
              className="field"
            />
          </label>

          {searchResults.length > 0 ? (
            <div className="mt-2 space-y-1">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => {
                    setSelectedMembers((current) =>
                      current.some((member) => member.id === result.id) ? current : [...current, result]
                    );
                    setStudentSearch("");
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[var(--color-surface-2)]"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-surface-2)] text-[10px] font-black">
                    {getInitials(result.full_name || "U")}
                  </span>
                  <span className="font-semibold text-[var(--color-ink)]">{result.full_name || "Student"}</span>
                  {result.username ? <span className="text-xs text-[var(--color-faint)]">@{result.username}</span> : null}
                  <span className="ml-auto text-xs font-semibold text-[var(--color-ink)]">Add</span>
                </button>
              ))}
            </div>
          ) : null}

          {selectedMembers.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedMembers((current) => current.filter((item) => item.id !== member.id))}
                  className="chip bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                >
                  {member.full_name || member.username} ✕
                </button>
              ))}
            </div>
          ) : null}

          <button type="button" onClick={createGroup} disabled={creating} className="btn btn-primary btn-md mt-4">
            {creating ? "Creating..." : `Create Group (${selectedMembers.length} members)`}
          </button>
          {error ? <p className="mt-2 text-xs text-[var(--color-danger)]">{error}</p> : null}
        </div>
      ) : null}

      {/* Conversation list */}
      {conversations.length === 0 ? (
        <div className="card mt-5 p-10 text-center">
          <MessageCircle aria-hidden="true" className="mx-auto h-10 w-10 text-[var(--color-faint)]" />
          <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">No conversations yet.</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Discover students and start a conversation.</p>
          <Link href="/explore" className="btn btn-primary btn-md mt-5">
            Explore Students
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {conversations.map((conversation) => {
            const lastMessage = Array.isArray(conversation.messages) ? conversation.messages[0] : conversation.messages;
            return (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.id}`}
                className="card card-hover flex items-center gap-3 p-3.5"
              >
                {conversation.type === "direct" ? (
                  (() => {
                    const other = conversation.conversation_members.find((member) => member.user_id !== user.id);
                    return other?.profiles?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={other.profiles.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-ink)] text-sm font-black text-[var(--color-paper)]">
                        {getInitials(other?.profiles?.full_name || "U")}
                      </span>
                    );
                  })()
                ) : (
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-surface-2)] text-lg" aria-hidden="true">
                    👥
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-[var(--color-ink)]">{conversationTitle(conversation)}</p>
                    {lastMessage ? <span className="shrink-0 text-[11px] text-[var(--color-faint)]">{timeAgo(lastMessage.created_at)}</span> : null}
                  </div>
                  <p className="truncate text-xs text-[var(--color-muted)]">
                    {lastMessage ? lastMessage.content : "Say hello 👋"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
