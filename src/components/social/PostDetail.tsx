/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CommentWithAuthor, PostWithAuthor } from "@/lib/types";
import { POST_TYPE_BADGES, timeAgo } from "@/lib/social-utils";
import { getInitials } from "@/lib/utils";

interface PostDetailProps {
  postId: string;
}

export function PostDetail({ postId }: PostDetailProps) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { user } = useAuthUser();

  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const loadPost = useCallback(async () => {
    const { data, error: postError } = await supabase
      .from("posts")
      .select("*, profiles(id, username, full_name, avatar_url), projects(id, title)")
      .eq("id", postId)
      .maybeSingle();

    if (postError || !data) {
      setError("Post not found.");
      setLoading(false);
      return;
    }

    const loadedPost = data as unknown as PostWithAuthor;
    setPost(loadedPost);
    setLikeCount(loadedPost.like_count);

    if (user) {
      const { data: like } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();
      setLiked(Boolean(like));
    }

    const { data: commentData } = await supabase
      .from("post_comments")
      .select("*, profiles(id, username, full_name, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    setComments((commentData as unknown as CommentWithAuthor[]) ?? []);
    setLoading(false);
  }, [supabase, postId, user]);

  useEffect(() => {
    void loadPost();
  }, [loadPost]);

  async function toggleLike() {
    if (!user || !post) {
      router.push("/login");
      return;
    }

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
  }

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !post || !commentText.trim()) {
      if (!user) {
        router.push("/login");
      }
      return;
    }

    setSubmitting(true);

    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: post.id, user_id: user.id, content: commentText.trim() })
      .select("*, profiles(id, username, full_name, avatar_url)")
      .single();

    if (error) {
      setError(error.message);
    } else {
      setComments((current) => [...current, data as unknown as CommentWithAuthor]);
      setCommentText("");
    }

    setSubmitting(false);
  }

  async function deleteComment(commentId: string) {
    if (!window.confirm("Delete this comment?")) {
      return;
    }

    const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
    if (!error) {
      setComments((current) => current.filter((item) => item.id !== commentId));
    }
  }

  async function deletePost() {
    if (!post || !window.confirm("Delete this post?")) {
      return;
    }

    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (!error) {
      router.push("/");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-0">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="skeleton h-10 w-10 rounded-full" />
            <div className="skeleton h-4 w-32" />
          </div>
          <div className="skeleton mt-4 h-4 w-full" />
          <div className="skeleton mt-2 h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-0">
        <div className="card p-8 text-center">
          <p className="text-sm font-semibold text-[var(--color-ink)]">{error ?? "Post not found."}</p>
          <Link href="/" className="btn btn-primary btn-md mt-4">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const author = post.profiles;
  const authorHref = author?.username ? `/u/${author.username}` : "#";
  const isOwner = user?.id === post.author_id;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-0">
      <Link href="/" className="mb-4 inline-block text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]">
        ← Back to feed
      </Link>

      <article className="card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Link href={authorHref} className="shrink-0">
            {author?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={author.avatar_url} alt="" className="h-11 w-11 rounded-full border border-[var(--color-line)] object-cover" />
            ) : (
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-ink)] text-sm font-black text-[var(--color-paper)]">
                {getInitials(author?.full_name || "U")}
              </span>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={authorHref} className="text-sm font-bold text-[var(--color-ink)] hover:underline">
              {author?.full_name || "Student"}
            </Link>
            {author?.username ? <span className="ml-2 text-xs text-[var(--color-faint)]">@{author.username}</span> : null}
            <p className="text-xs text-[var(--color-faint)]">{timeAgo(post.created_at)}</p>
          </div>
          <span className={`pill ${POST_TYPE_BADGES[post.post_type]}`}>{post.post_type.replace(/_/g, " ")}</span>
          {isOwner ? (
            <button type="button" onClick={deletePost} className="text-xs font-semibold text-[var(--color-faint)] hover:text-[var(--color-danger)]">
              Delete
            </button>
          ) : null}
        </div>

        {post.title ? <h1 className="mt-4 text-xl font-black tracking-tight text-[var(--color-ink)]">{post.title}</h1> : null}
        <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[var(--color-muted)]">{post.content}</p>

        {post.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image_url} alt="" className="mt-4 max-h-[560px] w-full rounded-xl border border-[var(--color-line)] object-cover" />
        ) : null}

        {post.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <span key={tag} className="chip px-2 py-0.5 text-[11px]">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        {post.projects ? (
          <Link
            href={`/projects/${post.projects.id}`}
            className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3 transition hover:border-[var(--color-line-strong)]"
          >
            <div>
              <p className="overline">Project</p>
              <p className="text-sm font-bold text-[var(--color-ink)]">{post.projects.title}</p>
            </div>
            <span className="text-xs font-semibold text-[var(--color-ink)]">View Project →</span>
          </Link>
        ) : null}

        <div className="mt-4 flex items-center gap-4 border-t border-[var(--color-line)] pt-3">
          <button
            type="button"
            onClick={toggleLike}
            className={`flex items-center gap-1.5 text-xs font-semibold transition ${liked ? "text-[var(--color-ink)]" : "text-[var(--color-faint)] hover:text-[var(--color-ink)]"}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 21c-4.8-3.6-8-6.4-8-10a4.6 4.6 0 0 1 8-3.1A4.6 4.6 0 0 1 20 11c0 3.6-3.2 6.4-8 10Z" />
            </svg>
            {likeCount > 0 ? likeCount : "Like"}
          </button>
          <span className="text-xs text-[var(--color-faint)]">
            {comments.length} {comments.length === 1 ? "comment" : "comments"}
          </span>
        </div>
      </article>

      {/* Comments */}
      <section className="card mt-4 p-5">
        <h2 className="overline">Comments</h2>

        {user ? (
          <form onSubmit={submitComment} className="mt-3 flex gap-2">
            <input
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Add a comment..."
              className="field"
              maxLength={1000}
            />
            <button type="submit" disabled={submitting || !commentText.trim()} className="btn btn-primary btn-md">
              {submitting ? "..." : "Send"}
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            <Link href="/login" className="font-semibold text-[var(--color-ink)] underline underline-offset-4">
              Login
            </Link>{" "}
            to comment.
          </p>
        )}

        <div className="mt-5 space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-[var(--color-faint)]">No comments yet. Start the conversation.</p>
          ) : (
            comments.map((comment) => (
              <article key={comment.id} className="flex gap-3">
                {comment.profiles?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={comment.profiles.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-surface-2)] text-[10px] font-black text-[var(--color-ink)]">
                    {getInitials(comment.profiles?.full_name || "U")}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={comment.profiles?.username ? `/u/${comment.profiles.username}` : "#"} className="text-xs font-bold text-[var(--color-ink)] hover:underline">
                      {comment.profiles?.full_name || "Student"}
                    </Link>
                    <span className="text-[11px] text-[var(--color-faint)]">{timeAgo(comment.created_at)}</span>
                    {user?.id === comment.user_id ? (
                      <button
                        type="button"
                        onClick={() => deleteComment(comment.id)}
                        className="ml-auto text-[11px] font-semibold text-[var(--color-faint)] hover:text-[var(--color-danger)]"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-0.5 whitespace-pre-line text-sm leading-6 text-[var(--color-muted)]">{comment.content}</p>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
