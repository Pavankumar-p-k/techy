"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PostWithAuthor } from "@/lib/types";
import { POST_TYPE_BADGES, timeAgo } from "@/lib/social-utils";
import { getInitials } from "@/lib/utils";

interface PostCardProps {
  post: PostWithAuthor;
  onDeleted?: (postId: string) => void;
}

export function PostCard({ post, onDeleted }: PostCardProps) {
  const { user } = useAuthUser();
  const supabase = getSupabaseBrowserClient();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [liking, setLiking] = useState(false);

  const author = post.profiles;
  const authorHref = author?.username ? `/u/${author.username}` : "#";
  const isOwner = user?.id === post.author_id;

  async function toggleLike() {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    if (liking) {
      return;
    }

    setLiking(true);

    // Optimistic
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((count) => Math.max(0, count + (nextLiked ? 1 : -1)));

    if (nextLiked) {
      const { error } = await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      if (error) {
        setLiked(false);
        setLikeCount((count) => Math.max(0, count - 1));
      }
    } else {
      const { error } = await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      if (error) {
        setLiked(true);
        setLikeCount((count) => count + 1);
      }
    }

    setLiking(false);
  }

  async function deletePost() {
    if (!isOwner || !window.confirm("Delete this post?")) {
      return;
    }

    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (!error && onDeleted) {
      onDeleted(post.id);
    }
  }

  return (
    <article className="card p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={authorHref} className="shrink-0">
          {author?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.avatar_url} alt="" className="h-10 w-10 rounded-full border border-[var(--color-line)] object-cover" />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-ink)] text-xs font-black text-[var(--color-paper)]">
              {getInitials(author?.full_name || "U")}
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <Link href={authorHref} className="truncate text-sm font-bold text-[var(--color-ink)] hover:underline">
              {author?.full_name || "Student"}
            </Link>
            {author?.username ? <span className="truncate text-xs text-[var(--color-faint)]">@{author.username}</span> : null}
          </div>
          <p className="text-xs text-[var(--color-faint)]">{timeAgo(post.created_at)}</p>
        </div>
        <span className={`pill ${POST_TYPE_BADGES[post.post_type]}`}>{post.post_type.replace(/_/g, " ")}</span>
        {isOwner ? (
          <button
            type="button"
            onClick={deletePost}
            className="text-xs font-semibold text-[var(--color-faint)] transition hover:text-[var(--color-danger)]"
            aria-label="Delete post"
          >
            Delete
          </button>
        ) : null}
      </div>

      {/* Title for typed posts */}
      {post.title ? <h3 className="mt-3 text-base font-bold text-[var(--color-ink)]">{post.title}</h3> : null}

      {/* Content */}
      <Link href={`/post/${post.id}`} className="mt-1.5 block">
        <p className="whitespace-pre-line text-sm leading-6 text-[var(--color-muted)]">{post.content}</p>
      </Link>

      {/* Image */}
      {post.image_url ? (
        <Link href={`/post/${post.id}`} className="mt-3 block overflow-hidden rounded-xl border border-[var(--color-line)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image_url} alt="" className="max-h-[480px] w-full object-cover" loading="lazy" />
        </Link>
      ) : null}

      {/* Tags */}
      {post.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span key={tag} className="chip px-2 py-0.5 text-[11px]">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      {/* Project reference */}
      {post.projects ? (
        <Link
          href={`/projects/${post.projects.id}`}
          className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3 transition hover:border-[var(--color-line-strong)]"
        >
          <div>
            <p className="overline">Project</p>
            <p className="text-sm font-bold text-[var(--color-ink)]">{post.projects.title}</p>
          </div>
          <span className="text-xs font-semibold text-[var(--color-ink)]">View →</span>
        </Link>
      ) : null}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-4 border-t border-[var(--color-line)] pt-3">
        <button
          type="button"
          onClick={toggleLike}
          className={`flex items-center gap-1.5 text-xs font-semibold transition ${liked ? "text-[var(--color-ink)]" : "text-[var(--color-faint)] hover:text-[var(--color-ink)]"}`}
          aria-label={liked ? "Unlike post" : "Like post"}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 21c-4.8-3.6-8-6.4-8-10a4.6 4.6 0 0 1 8-3.1A4.6 4.6 0 0 1 20 11c0 3.6-3.2 6.4-8 10Z" />
          </svg>
          {likeCount > 0 ? likeCount : "Like"}
        </button>
        <Link
          href={`/post/${post.id}`}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-faint)] transition hover:text-[var(--color-ink)]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-8 8H4l1.6-3.2A8 8 0 1 1 21 12Z" />
          </svg>
          {post.comment_count > 0 ? post.comment_count : "Comment"}
        </Link>
        {post.projects ? (
          <Link href={`/projects/${post.projects.id}`} className="ml-auto text-xs font-semibold text-[var(--color-ink)]">
            View Project →
          </Link>
        ) : null}
      </div>
    </article>
  );
}
