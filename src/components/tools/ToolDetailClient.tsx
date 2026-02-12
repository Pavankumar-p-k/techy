"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RatingStars } from "@/components/common/RatingStars";
import { useAuthUser } from "@/hooks/useAuthUser";
import { FREE_TYPE_LABELS } from "@/lib/constants";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database, ReviewWithProfile } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type Tool = Database["public"]["Tables"]["tools"]["Row"];

interface ToolDetailClientProps {
  slug: string;
}

export function ToolDetailClient({ slug }: ToolDetailClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { user, loading: authLoading } = useAuthUser();

  const [tool, setTool] = useState<Tool | null>(null);
  const [reviews, setReviews] = useState<ReviewWithProfile[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      const { data: toolData, error: toolError } = await supabase
        .from("tools")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single();

      if (toolError || !toolData) {
        if (mounted) {
          setTool(null);
          setError("Tool not found.");
          setLoading(false);
        }
        return;
      }

      const reviewsResponse = await supabase
        .from("tool_reviews")
        .select("*, profiles(full_name, avatar_url)")
        .eq("tool_id", toolData.id)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (!mounted) {
        return;
      }

      setTool(toolData);

      if (reviewsResponse.error) {
        setError(reviewsResponse.error.message);
      } else {
        setReviews((reviewsResponse.data as unknown as ReviewWithProfile[]) ?? []);
      }

      if (user) {
        const { data: bookmark } = await supabase
          .from("tool_bookmarks")
          .select("id")
          .eq("tool_id", toolData.id)
          .eq("user_id", user.id)
          .maybeSingle();
        setIsBookmarked(Boolean(bookmark));

        const { data: ownReview } = await supabase
          .from("tool_reviews")
          .select("rating, review_text")
          .eq("tool_id", toolData.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (ownReview) {
          setRating(ownReview.rating);
          setReviewText(ownReview.review_text ?? "");
        }
      } else {
        setIsBookmarked(false);
      }

      setLoading(false);
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, [slug, supabase, user]);

  async function openTool() {
    if (!tool) {
      return;
    }

    await supabase.rpc("increment_tool_click", { target_tool_id: tool.id });
    window.open(tool.url, "_blank", "noopener,noreferrer");
  }

  async function toggleBookmark() {
    if (!tool) {
      return;
    }

    if (!user) {
      router.push(`/login?next=/tools/${slug}`);
      return;
    }

    if (isBookmarked) {
      await supabase.from("tool_bookmarks").delete().eq("tool_id", tool.id).eq("user_id", user.id);
      setIsBookmarked(false);
      return;
    }

    const { error: insertError } = await supabase.from("tool_bookmarks").insert({ tool_id: tool.id, user_id: user.id });

    if (!insertError) {
      setIsBookmarked(true);
    }
  }

  async function handleReviewSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tool) {
      return;
    }

    if (!user) {
      router.push(`/login?next=/tools/${slug}`);
      return;
    }

    setSubmittingReview(true);

    const { error: upsertError } = await supabase.from("tool_reviews").upsert(
      {
        tool_id: tool.id,
        user_id: user.id,
        rating,
        review_text: reviewText.trim() || null,
      },
      { onConflict: "tool_id,user_id" }
    );

    if (upsertError) {
      setError(upsertError.message);
      setSubmittingReview(false);
      return;
    }

    const { data: refreshedTool } = await supabase.from("tools").select("*").eq("id", tool.id).single();
    if (refreshedTool) {
      setTool(refreshedTool);
    }

    const { data: refreshedReviews } = await supabase
      .from("tool_reviews")
      .select("*, profiles(full_name, avatar_url)")
      .eq("tool_id", tool.id)
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    setReviews((refreshedReviews as unknown as ReviewWithProfile[]) ?? []);
    setSubmittingReview(false);
  }

  if (loading || authLoading) {
    return <p className="mx-auto w-full max-w-4xl px-4 py-10 text-sm text-[var(--color-muted)] md:px-6">Loading tool...</p>;
  }

  if (!tool) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6">
        <p className="rounded-xl bg-[var(--color-danger-soft)] p-4 text-sm text-[var(--color-danger)]">{error ?? "Tool not found."}</p>
        <Link href="/" className="mt-4 inline-block rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-[var(--color-paper)]">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6 md:py-10">
      <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">{tool.category}</p>
        <h1 className="text-3xl font-black text-[var(--color-ink)]">{tool.name}</h1>
        <p className="mt-3 text-base leading-7 text-[var(--color-muted)]">{tool.short_description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {tool.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-[var(--color-line)] px-2 py-1 text-xs text-[var(--color-muted)]">
              #{tag}
            </span>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <InfoCard label="Free model" value={FREE_TYPE_LABELS[tool.free_type]} />
          <InfoCard label="Community rating" value={`${tool.avg_rating.toFixed(1)} / 5 (${tool.review_count} reviews)`} />
          <InfoCard label="How free access works" value={tool.free_details} />
          <InfoCard label="Clicks" value={tool.click_count.toString()} />
        </div>

        <section className="mt-6 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4">
          <h2 className="text-lg font-bold text-[var(--color-ink)]">How it works</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[var(--color-muted)]">{tool.how_it_works}</p>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openTool}
            className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-95"
          >
            Visit Official Website
          </button>
          <button
            type="button"
            onClick={toggleBookmark}
            className="rounded-full border border-[var(--color-line)] px-5 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-surface-2)]"
          >
            {isBookmarked ? "Remove Bookmark" : "Save Bookmark"}
          </button>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
        <h2 className="text-xl font-bold text-[var(--color-ink)]">Rate this tool</h2>
        <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-sm text-[var(--color-muted)]">Your rating</p>
            <RatingStars value={rating} onChange={setRating} />
          </div>
          <label className="block text-sm text-[var(--color-muted)]">
            Review (optional)
            <textarea
              value={reviewText}
              onChange={(event) => setReviewText(event.target.value)}
              rows={4}
              placeholder="What was useful? Any limits?"
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)]"
            />
          </label>
          <button
            type="submit"
            disabled={submittingReview}
            className="rounded-full bg-[var(--color-ink)] px-5 py-2 text-sm font-semibold text-[var(--color-paper)] transition hover:bg-[var(--color-accent)] disabled:opacity-60"
          >
            {submittingReview ? "Saving..." : "Submit Review"}
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
        <h2 className="text-xl font-bold text-[var(--color-ink)]">Community reviews</h2>
        <div className="mt-4 space-y-4">
          {reviews.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No reviews yet.</p>
          ) : (
            reviews.map((review) => (
              <article key={review.id} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--color-ink)]">{review.profiles?.full_name ?? "Anonymous"}</p>
                  <p className="text-xs text-[var(--color-muted)]">{formatDate(review.created_at)}</p>
                </div>
                <RatingStars value={review.rating} size="sm" />
                {review.review_text ? <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{review.review_text}</p> : null}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-3">
      <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}
