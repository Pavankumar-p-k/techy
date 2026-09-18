/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PostCard } from "@/components/social/PostCard";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { PostWithAuthor } from "@/lib/types";
import { getInitials } from "@/lib/utils";

const PAGE_SIZE = 10;

export function HomeClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { user, profile } = useAuthUser();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const loadPosts = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!isSupabaseConfigured) {
        setError("Supabase is not configured. Add values in .env.local and restart the app.");
        setLoading(false);
        return;
      }

      setError(null);

      const { data, error: postsError } = await supabase
        .from("posts")
        .select("*, profiles(id, username, full_name, avatar_url), projects(id, title)")
        .order("created_at", { ascending: false })
        .range(pageNum * PAGE_SIZE, pageNum * PAGE_SIZE + PAGE_SIZE - 1);

      if (postsError) {
        setError(postsError.message);
      } else {
        setPosts((current) => (append ? [...current, ...((data as unknown as PostWithAuthor[]) ?? [])] : (data as unknown as PostWithAuthor[]) ?? []));
        setHasMore(((data as unknown as PostWithAuthor[]) ?? []).length === PAGE_SIZE);
      }

      setLoading(false);
    },
    [supabase]
  );

  useEffect(() => {
    void loadPosts(0, false);
  }, [loadPosts]);

  function handleDeleted(postId: string) {
    setPosts((current) => current.filter((item) => item.id !== postId));
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-0">
      {/* Composer entry */}
      {user ? (
        <Link
          href="/create/post"
          className="card mb-4 flex items-center gap-3 p-4 transition hover:border-[var(--color-line-strong)]"
        >
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-ink)] text-xs font-black text-[var(--color-paper)]">
              {getInitials(profile?.full_name || user.email || "U")}
            </span>
          )}
          <span className="flex-1 text-sm text-[var(--color-faint)]">Share what you&apos;re building...</span>
          <span className="btn btn-primary btn-sm">Create</span>
        </Link>
      ) : (
        <div className="card mb-4 p-5 text-center">
          <p className="text-sm font-semibold text-[var(--color-ink)]">Join the community</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Share projects, follow students, and build together.</p>
          <div className="mt-3 flex justify-center gap-2">
            <Link href="/login" className="btn btn-ghost btn-md">
              Login
            </Link>
            <Link href="/register" className="btn btn-primary btn-md">
              Join
            </Link>
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card p-5">
              <div className="flex items-center gap-3">
                <div className="skeleton h-10 w-10 rounded-full" />
                <div>
                  <div className="skeleton h-3.5 w-32" />
                  <div className="skeleton mt-1.5 h-3 w-20" />
                </div>
              </div>
              <div className="skeleton mt-4 h-4 w-full" />
              <div className="skeleton mt-2 h-4 w-3/4" />
              <div className="skeleton mt-4 h-40 w-full" />
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-danger-soft)] p-4 text-sm text-[var(--color-danger)]">{error}</div>
      ) : null}

      {/* Feed */}
      {!loading && !error ? (
        <>
          {posts.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-3xl" aria-hidden="true">🏗️</p>
              <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">No posts yet.</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">Start sharing what you&apos;re building.</p>
              <Link href="/create/post" className="btn btn-primary btn-md mt-5">
                Create Post
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onDeleted={handleDeleted} />
              ))}
            </div>
          )}

          {hasMore ? (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  void loadPosts(next, true);
                }}
                className="btn btn-ghost btn-md"
              >
                Load more
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
