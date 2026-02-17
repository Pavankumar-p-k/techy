"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { FREE_TYPE_LABELS } from "@/lib/constants";
import { getToolLogoUrl } from "@/lib/tool-media";
import type { Database } from "@/lib/types";
import { formatDate, getInitials } from "@/lib/utils";

type Tool = Database["public"]["Tables"]["tools"]["Row"];
type BookmarkSortOption = "saved_recent" | "top_rated" | "name_az";

const PAGE_SIZE = 8;

interface BookmarkItem {
  id: string;
  tool_id: string;
  created_at: string;
  tools: Tool;
}

export function BookmarksClient() {
  const { supabase, user, loading } = useAuthUser();
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<BookmarkSortOption>("saved_recent");
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function loadBookmarks() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const { data } = await supabase
        .from("tool_bookmarks")
        .select("id, tool_id, created_at, tools(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const parsed = ((data ?? []) as unknown as BookmarkItem[]).filter((item) => item.tools?.status === "published");
      setItems(parsed);
      setIsLoading(false);
    }

    void loadBookmarks();
  }, [loading, supabase, user]);

  async function removeBookmark(toolId: string) {
    if (!user) {
      return;
    }

    await supabase.from("tool_bookmarks").delete().eq("user_id", user.id).eq("tool_id", toolId);
    setItems((current) => current.filter((item) => item.tool_id !== toolId));
  }

  const sortedItems = useMemo(() => {
    const copy = [...items];

    copy.sort((a, b) => {
      if (sortBy === "top_rated") {
        return b.tools.avg_rating - a.tools.avg_rating || b.tools.review_count - a.tools.review_count || a.tools.name.localeCompare(b.tools.name);
      }

      if (sortBy === "name_az") {
        return a.tools.name.localeCompare(b.tools.name);
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || a.tools.name.localeCompare(b.tools.name);
    });

    return copy;
  }, [items, sortBy]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE)), [sortedItems.length]);
  const currentPage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedItems.slice(start, start + PAGE_SIZE);
  }, [currentPage, sortedItems]);

  if (loading || isLoading) {
    return <p className="mx-auto w-full max-w-5xl px-4 py-10 text-sm text-[var(--color-muted)] md:px-6">Loading bookmarks...</p>;
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
        <section className="premium-panel rounded-2xl p-6">
          <h1 className="section-title text-2xl font-black">Bookmarks</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Login to view your saved tools.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/login?next=/bookmarks" className="rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-[var(--color-paper)]">
              Login
            </Link>
            <Link href="/register" className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]">
              Create Account
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
      <h1 className="section-title text-3xl font-black">Bookmarks</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">Your saved tools for quick access.</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="text-sm text-[var(--color-muted)]">
          Sort by
          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as BookmarkSortOption);
              setPage(1);
            }}
            className="ml-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)]"
          >
            <option value="saved_recent">Recently saved</option>
            <option value="top_rated">Top rated</option>
            <option value="name_az">Name A-Z</option>
          </select>
        </label>
        <p className="text-sm text-[var(--color-muted)]">
          Page {currentPage} of {totalPages}
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {sortedItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--color-line)] p-4 text-sm text-[var(--color-muted)]">
            No bookmarks yet.
          </p>
        ) : (
          paginatedItems.map((item) => (
            <article key={item.id} className="interactive-lift premium-panel rounded-2xl p-4">
              <div className="mb-3 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)]">
                {getToolLogoUrl(item.tools.logo_url, item.tools.url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getToolLogoUrl(item.tools.logo_url, item.tools.url) ?? ""} alt={`${item.tools.name} logo`} className="h-24 w-full object-cover" />
                ) : (
                  <div className="grid h-24 place-items-center bg-gradient-to-br from-[var(--color-accent-soft)] to-white">
                    <span className="rounded-2xl bg-white/90 px-3 py-2 text-lg font-black text-[var(--color-ink)]">{getInitials(item.tools.name)}</span>
                  </div>
                )}
              </div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{item.tools.category}</p>
              <h2 className="mt-1 text-lg font-bold text-[var(--color-ink)]">{item.tools.name}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted)]">{item.tools.short_description}</p>
              <p className="mt-2 text-xs font-semibold text-[var(--color-accent)]">{FREE_TYPE_LABELS[item.tools.free_type]}</p>
              <p className="mt-2 text-xs text-[var(--color-muted)]">Saved {formatDate(item.created_at)}</p>
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
      {sortedItems.length > 0 && totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, Math.min(current, totalPages) - 1))}
            disabled={currentPage === 1}
            className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-45"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, Math.min(current, totalPages) + 1))}
            disabled={currentPage === totalPages}
            className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-45"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
