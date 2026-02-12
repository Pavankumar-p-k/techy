"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { FREE_TYPE_LABELS } from "@/lib/constants";
import type { Database } from "@/lib/types";

type Tool = Database["public"]["Tables"]["tools"]["Row"];

interface BookmarkItem {
  id: string;
  tool_id: string;
  tools: Tool;
}

export function BookmarksClient() {
  const router = useRouter();
  const { supabase, user, loading } = useAuthUser();
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?next=/bookmarks");
      return;
    }

    async function loadBookmarks() {
      if (!user) {
        return;
      }

      setIsLoading(true);

      const { data } = await supabase
        .from("tool_bookmarks")
        .select("id, tool_id, tools(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const parsed = ((data ?? []) as unknown as BookmarkItem[]).filter((item) => item.tools?.status === "published");
      setItems(parsed);
      setIsLoading(false);
    }

    void loadBookmarks();
  }, [loading, router, supabase, user]);

  async function removeBookmark(toolId: string) {
    if (!user) {
      return;
    }

    await supabase.from("tool_bookmarks").delete().eq("user_id", user.id).eq("tool_id", toolId);
    setItems((current) => current.filter((item) => item.tool_id !== toolId));
  }

  if (loading || isLoading || !user) {
    return <p className="mx-auto w-full max-w-5xl px-4 py-10 text-sm text-[var(--color-muted)] md:px-6">Loading bookmarks...</p>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
      <h1 className="text-3xl font-black text-[var(--color-ink)]">Bookmarks</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">Your saved tools for quick access.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--color-line)] p-4 text-sm text-[var(--color-muted)]">
            No bookmarks yet.
          </p>
        ) : (
          items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{item.tools.category}</p>
              <h2 className="mt-1 text-lg font-bold text-[var(--color-ink)]">{item.tools.name}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted)]">{item.tools.short_description}</p>
              <p className="mt-2 text-xs font-semibold text-[var(--color-accent)]">{FREE_TYPE_LABELS[item.tools.free_type]}</p>
              <div className="mt-4 flex gap-2">
                <Link href={`/tools/${item.tools.slug}`} className="rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-[var(--color-paper)]">
                  Open
                </Link>
                <button
                  type="button"
                  onClick={() => removeBookmark(item.tool_id)}
                  className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
                >
                  Remove
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
