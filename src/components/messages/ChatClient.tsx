/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Conversation, MessageWithSender, SocialProfile } from "@/lib/types";
import { timeAgo } from "@/lib/social-utils";
import { getInitials } from "@/lib/utils";

interface ChatClientProps {
  conversationId: string;
}

interface OtherMember {
  user_id: string;
  profiles: Pick<SocialProfile, "id" | "username" | "full_name" | "avatar_url"> | null;
}

export function ChatClient({ conversationId }: ChatClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { user, loading } = useAuthUser();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [members, setMembers] = useState<OtherMember[]>([]);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadConversation = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Conversation
    const { data: conversationData } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .maybeSingle();

    if (!conversationData) {
      setError("Conversation not found.");
      setIsLoading(false);
      return;
    }

    // Members with profiles
    const { data: memberData } = await supabase
      .from("conversation_members")
      .select("user_id, profiles(id, username, full_name, avatar_url)")
      .eq("conversation_id", conversationId);

    const loadedMembers = ((memberData ?? []) as unknown as OtherMember[]);
    setMembers(loadedMembers);
    setConversation(conversationData);

    const meIsMember = loadedMembers.some((member) => member.user_id === user.id);
    setIsMember(meIsMember);

    if (!meIsMember) {
      // RLS blocks message read; show join-less state
      setIsLoading(false);
      return;
    }

    // Messages (recent first page)
    const { data: messageData } = await supabase
      .from("messages")
      .select("*, profiles(id, username, full_name, avatar_url)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200);

    setMessages((messageData as unknown as MessageWithSender[]) ?? []);

    // Mark read
    await supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);

    setIsLoading(false);
  }, [supabase, conversationId, user]);

  useEffect(() => {
    void loadConversation();
  }, [loadConversation]);

  // Realtime new messages
  useEffect(() => {
    if (!user || !isMember) {
      return;
    }

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const incoming = payload.new as { id: string; sender_id: string; content: string; created_at: string };
          setMessages((current) => {
            if (current.some((message) => message.id === incoming.id)) {
              return current;
            }
            const sender = members.find((member) => member.user_id === incoming.sender_id)?.profiles ?? null;
            return [...current, { ...incoming, profiles: sender } as MessageWithSender];
          });
          void supabase
            .from("conversation_members")
            .update({ last_read_at: new Date().toISOString() })
            .eq("conversation_id", conversationId)
            .eq("user_id", user.id);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, user, isMember, members]);

  // Auto-scroll to newest
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !draft.trim() || sending) {
      return;
    }

    setSending(true);

    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: user.id, content: draft.trim() })
      .select("*, profiles(id, username, full_name, avatar_url)")
      .single();

    if (error) {
      setError(error.message);
    } else {
      const inserted = data as unknown as MessageWithSender;
      setMessages((current) => (current.some((message) => message.id === inserted.id) ? current : [...current, inserted]));
      setDraft("");
    }

    setSending(false);
  }

  if (loading || isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="skeleton h-12 w-full" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className={`skeleton h-10 ${index % 2 ? "ml-auto" : ""} w-2/3`} />
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
          <p className="mt-2 text-sm text-[var(--color-muted)]">Login to view this conversation.</p>
          <Link href={`/login?next=/messages/${conversationId}`} className="btn btn-primary btn-md mt-5">
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <div className="card p-8 text-center">
          <p className="text-sm font-semibold text-[var(--color-ink)]">{error ?? "Conversation not found."}</p>
          <Link href="/messages" className="btn btn-primary btn-md mt-4">
            All Messages
          </Link>
        </div>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <div className="card p-8 text-center">
          <p className="text-sm font-semibold text-[var(--color-ink)]">You are not a member of this conversation.</p>
          <Link href="/messages" className="btn btn-primary btn-md mt-4">
            All Messages
          </Link>
        </div>
      </div>
    );
  }

  const otherMember = members.find((member) => member.user_id !== user.id);
  const chatTitle =
    conversation.type === "direct"
      ? otherMember?.profiles?.full_name ?? "Direct message"
      : conversation.title ?? "Group";
  const chatSubtitle =
    conversation.type === "direct"
      ? otherMember?.profiles?.username
        ? `@${otherMember.profiles.username}`
        : ""
      : `${members.length} members`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 md:px-0" style={{ minHeight: "calc(100vh - 14rem)" }}>
      {/* Header */}
      <div className="sticky top-14 z-10 -mx-4 border-b border-[var(--color-line)] bg-[var(--color-overlay)] px-4 py-3 backdrop-blur-xl md:mx-0 md:rounded-b-2xl">
        <div className="flex items-center gap-3">
          <Link href="/messages" className="text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]" aria-label="Back to messages">
            ←
          </Link>
          {conversation.type === "direct" ? (
            otherMember?.profiles?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={otherMember.profiles.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-ink)] text-xs font-black text-[var(--color-paper)]">
                {getInitials(otherMember?.profiles?.full_name || "U")}
              </span>
            )
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-surface-2)] text-base" aria-hidden="true">👥</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[var(--color-ink)]">{chatTitle}</p>
            {chatSubtitle ? <p className="truncate text-xs text-[var(--color-faint)]">{chatSubtitle}</p> : null}
          </div>
          {conversation.type === "direct" && otherMember?.profiles?.username ? (
            <Link href={`/u/${otherMember.profiles.username}`} className="btn btn-ghost btn-sm">
              Profile
            </Link>
          ) : null}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-2 py-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-faint)]">No messages yet. Say hello 👋</p>
        ) : (
          messages.map((message) => {
            const isMine = message.sender_id === user.id;
            const sender = message.profiles;
            return (
              <div key={message.id} className={`flex gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
                {!isMine ? (
                  sender?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sender.avatar_url} alt="" className="h-7 w-7 self-end rounded-full object-cover" />
                  ) : (
                    <span className="grid h-7 w-7 shrink-0 self-end place-items-center rounded-full bg-[var(--color-surface-2)] text-[9px] font-black text-[var(--color-ink)]">
                      {getInitials(sender?.full_name || "U")}
                    </span>
                  )
                ) : null}
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                    isMine
                      ? "rounded-br-sm bg-[var(--color-ink)] text-[var(--color-paper)]"
                      : "rounded-bl-sm border border-[var(--color-line)] bg-[var(--color-surface-2)] text-[var(--color-ink)]"
                  }`}
                >
                  {!isMine && conversation.type !== "direct" && sender ? (
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-faint)]">
                      {sender.full_name || "Student"}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-line break-words text-sm leading-6">{message.content}</p>
                  <p className={`mt-0.5 text-right text-[10px] ${isMine ? "text-[var(--color-paper)]/60" : "text-[var(--color-faint)]"}`}>
                    {timeAgo(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={send} className="sticky bottom-16 -mx-4 flex gap-2 border-t border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-3 md:mx-0 md:bottom-2 md:rounded-2xl md:border">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message..."
          className="field flex-1"
          maxLength={4000}
          aria-label="Message"
        />
        <button type="submit" disabled={sending || !draft.trim()} className="btn btn-primary btn-md">
          Send
        </button>
      </form>
    </div>
  );
}
