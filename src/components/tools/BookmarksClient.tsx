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
    return (
      <div className="container-app py-10">
        <div className="skeleton h-8 w-48" />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-app flex justify-center py-10 md:py-16">
        <div className="card w-full max-w-md p-6 text-center sm:p-8">
          <h1 className="section-title text-2xl font-black tracking-tight">Bookmarks</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Login to view your saved tools.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/login?next=/bookmarks" className="btn btn-primary btn-md">
              Login
            </Link>
            <Link href="/register" className="btn btn-ghost btn-md">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-app py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="section-title text-3xl font-black tracking-tight">Bookmarks</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Your saved tools for quick access.</p>
        </div>
        <label className="label w-full sm:w-auto">
          Sort by
          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as BookmarkSortOption);
              setPage(1);
            }}
            className="field sm:w-48"
          >
            <option value="saved_recent">Recently saved</option>
            <option value="top_rated">Top rated</option>
            <option value="name_az">Name A-Z</option>
          </select>
        </label>
      </div>

      {sortedItems.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--color-line)] p-10 text-center">
          <p className="text-3xl" aria-hidden="true">☆</p>
          <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">No bookmarks yet</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Browse the tool catalog and save what you like.</p>
          <Link href="/" className="btn btn-primary btn-md mt-5">
            Browse Tools
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {paginatedItems.map((item) => {
              const logoUrl = getToolLogoUrl(item.tools.logo_url, item.tools.url);
              return (
                <article key={item.id} className="card card-hover p-4">
                  <div className="flex gap-3">
                    {/* Thumb */}
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--color-line)] bg-gradient-to-br from-[var(--color-surface-2)] to-[var(--color-accent-soft)]">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logoUrl}
                          alt={`${item.tools.name} logo`}
                          className="h-10 w-10 rounded-lg bg-white object-contain p-0.5 shadow-[var(--shadow-soft)] ring-1 ring-[var(--color-line)]"
                          loading="lazy"
                        />
                      ) : (
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-ink)] text-xs font-black text-[var(--color-paper)]">
                          {getInitials(item.tools.name)}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="overline">{item.tools.category}</p>
                      <h2 className="truncate text-base font-bold text-[var(--color-ink)]">{item.tools.name}</h2>
                      <p className="line-clamp-2 mt-0.5 text-xs leading-5 text-[var(--color-muted)]">{item.tools.short_description}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-line)] pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="pill pill-accent">{FREE_TYPE_LABELS[item.tools.free_type]}</span>
                      <span className="text-[11px] text-[var(--color-faint)]">Saved {formatDate(item.created_at)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/tools/${item.tools.slug}`} className="btn btn-primary btn-sm">
                        Open
                      </Link>
                      <button type="button" onClick={() => removeBookmark(item.tool_id)} className="btn btn-ghost btn-sm">
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {totalPages > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, Math.min(current, totalPages) - 1))}
                disabled={currentPage === 1}
                className="btn btn-ghost btn-md"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, Math.min(current, totalPages) + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-ghost btn-md"
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
