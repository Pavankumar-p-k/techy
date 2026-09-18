/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { NotificationWithActor } from "@/lib/types";
import { timeAgo } from "@/lib/social-utils";
import { getInitials } from "@/lib/utils";

export function NotificationsClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { user, loading } = useAuthUser();
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from("notifications")
      .select("*, profiles(id, username, full_name, avatar_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setNotifications((data as unknown as NotificationWithActor[]) ?? []);
    setIsLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // Realtime
  useEffect(() => {
    if (!user) {
      return;
    }

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          void loadNotifications();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, user, loadNotifications]);

  async function markAllRead() {
    if (!user) {
      return;
    }

    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
  }

  function notificationText(notification: NotificationWithActor): { text: string; href: string } {
    const actorName = notification.profiles?.full_name || "Someone";
    switch (notification.type) {
      case "follow":
        return { text: `${actorName} started following you.`, href: notification.profiles?.username ? `/u/${notification.profiles.username}` : "#" };
      case "like":
        return { text: `${actorName} liked your post.`, href: `/post/${notification.entity_id}` };
      case "comment":
        return { text: `${actorName} commented: "${notification.body ?? ""}"`, href: `/post/${notification.entity_id}` };
      case "feedback":
        return { text: `${actorName} gave feedback: "${notification.body ?? ""}"`, href: `/projects/${notification.entity_id}` };
      case "feedback_status":
        return { text: notification.body ?? "Your feedback was updated.", href: `/projects/${notification.entity_id}` };
      case "message":
        return { text: `New message from ${actorName}.`, href: "/messages" };
      case "group_invite":
        return { text: `${actorName} added you to a group.`, href: "/messages" };
      default:
        return { text: "New notification.", href: "#" };
    }
  }

  if (loading || isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="skeleton h-8 w-48" />
        <div className="mt-5 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="skeleton h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <div className="card p-8 text-center">
          <h1 className="section-title text-2xl font-black tracking-tight">Notifications</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Login to see updates about your posts, projects, and followers.</p>
          <Link href="/login?next=/notifications" className="btn btn-primary btn-md mt-5">
            Login
          </Link>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-0">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight text-[var(--color-ink)]">Notifications</h1>
        {unreadCount > 0 ? (
          <button type="button" onClick={markAllRead} className="btn btn-ghost btn-sm">
            Mark all read
          </button>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <div className="card mt-5 p-10 text-center">
          <p className="text-3xl" aria-hidden="true">🔔</p>
          <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">No notifications yet.</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Follow, like, and comment activity shows up here.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {notifications.map((notification) => {
            const { text, href } = notificationText(notification);
            return (
              <Link
                key={notification.id}
                href={href}
                className={`card flex items-center gap-3 p-3.5 transition hover:border-[var(--color-line-strong)] ${
                  !notification.is_read ? "border-l-4 !border-l-[var(--color-ink)]" : ""
                }`}
              >
                {notification.profiles?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={notification.profiles.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-surface-2)] text-xs font-black text-[var(--color-ink)]">
                    {getInitials(notification.profiles?.full_name || "S")}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${!notification.is_read ? "font-bold text-[var(--color-ink)]" : "text-[var(--color-muted)]"}`}>{text}</p>
                  <p className="text-[11px] text-[var(--color-faint)]">{timeAgo(notification.created_at)}</p>
                </div>
                {!notification.is_read ? <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-ink)]" /> : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
