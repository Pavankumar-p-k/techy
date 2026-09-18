/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RatingStars } from "@/components/common/RatingStars";
import { useAuthUser } from "@/hooks/useAuthUser";
import { FREE_TYPE_LABELS } from "@/lib/constants";
import { getToolLogoUrl } from "@/lib/tool-media";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database, ReviewWithProfile } from "@/lib/types";
import { formatDate, getInitials } from "@/lib/utils";
import { reviewInputSchema } from "@/lib/validation";

type Tool = Database["public"]["Tables"]["tools"]["Row"];
type ToolGuide = Database["public"]["Tables"]["tool_guides"]["Row"];
type ToolGuideStep = Database["public"]["Tables"]["tool_guide_steps"]["Row"];
type DetailPanel = "overview" | "setup" | "share" | "review" | "community";

interface ToolDetailClientProps {
  slug: string;
}

export function ToolDetailClient({ slug }: ToolDetailClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { user, loading: authLoading } = useAuthUser();

  const [tool, setTool] = useState<Tool | null>(null);
  const [reviews, setReviews] = useState<ReviewWithProfile[]>([]);
  const [guide, setGuide] = useState<ToolGuide | null>(null);
  const [guideSteps, setGuideSteps] = useState<ToolGuideStep[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [activePanel, setActivePanel] = useState<DetailPanel>("overview");

  const loadData = useCallback(
    async (withLoading = true) => {
      if (withLoading) {
        setLoading(true);
      }
      setError(null);

      const { data: toolData, error: toolError } = await supabase.from("tools").select("*").eq("slug", slug).eq("status", "published").single();

      if (toolError || !toolData) {
        setTool(null);
        setGuide(null);
        setGuideSteps([]);
        setError("Tool not found.");
        setLoading(false);
        return;
      }

      const [reviewsResponse, guideResponse] = await Promise.all([
        supabase.from("tool_reviews").select("*, profiles(full_name, avatar_url)").eq("tool_id", toolData.id).eq("is_public", true).order("created_at", { ascending: false }),
        supabase.from("tool_guides").select("*").eq("tool_id", toolData.id).maybeSingle(),
      ]);

      setTool(toolData);
      setGuide(guideResponse.data ?? null);

      if (guideResponse.data) {
        const { data: stepData } = await supabase.from("tool_guide_steps").select("*").eq("guide_id", guideResponse.data.id).order("step_order", { ascending: true });
        setGuideSteps(stepData ?? []);
      } else {
        setGuideSteps([]);
      }

      if (reviewsResponse.error) {
        setError(reviewsResponse.error.message);
      } else {
        setReviews((reviewsResponse.data as unknown as ReviewWithProfile[]) ?? []);
      }

      if (user) {
        const { data: bookmark } = await supabase.from("tool_bookmarks").select("id").eq("tool_id", toolData.id).eq("user_id", user.id).maybeSingle();
        setIsBookmarked(Boolean(bookmark));

        const { data: ownReview } = await supabase.from("tool_reviews").select("rating, review_text").eq("tool_id", toolData.id).eq("user_id", user.id).maybeSingle();

        if (ownReview) {
          setRating(ownReview.rating);
          setReviewText(ownReview.review_text ?? "");
        }
      } else {
        setIsBookmarked(false);
      }

      setLoading(false);
    },
    [slug, supabase, user]
  );

  useEffect(() => {
    let mounted = true;

    void loadData();

    const channel = supabase
      .channel(`tool-live-${slug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tools" }, () => {
        if (mounted) {
          void loadData(false);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tool_reviews" }, () => {
        if (mounted) {
          void loadData(false);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tool_guides" }, () => {
        if (mounted) {
          void loadData(false);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tool_guide_steps" }, () => {
        if (mounted) {
          void loadData(false);
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [loadData, slug, supabase]);

  const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const shareUrl = siteOrigin ? `${siteOrigin}/tools/${slug}` : `/tools/${slug}`;
  const shareText = tool ? `Check ${tool.name} on Student Tool Hub` : "Check this tool on Student Tool Hub";
  const encodedShareUrl = encodeURIComponent(shareUrl);
  const encodedShareText = encodeURIComponent(`${shareText}: ${shareUrl}`);
  const logoUrl = tool ? getToolLogoUrl(tool.logo_url, tool.url) : null;
  const fallbackSteps = (tool?.pricing_notes ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  async function shareTool() {
    if (!tool || !shareUrl) {
      return;
    }

    setShareMessage(null);

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${tool.name} | Student Tool Hub`,
          text: shareText,
          url: shareUrl,
        });
        setShareMessage("Shared successfully.");
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareMessage("Tool page link copied.");
    } catch {
      setShareMessage("Share canceled or unavailable on this device.");
    }
  }

  async function copyShareLink() {
    if (!shareUrl) {
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
    setShareMessage("Tool page link copied.");
  }

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

    setError(null);

    const validation = reviewInputSchema.safeParse({
      rating,
      reviewText,
    });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Invalid review input.");
      return;
    }

    setSubmittingReview(true);

    const { error: upsertError } = await supabase.from("tool_reviews").upsert(
      {
        tool_id: tool.id,
        user_id: user.id,
        rating: validation.data.rating,
        review_text: validation.data.reviewText,
      },
      { onConflict: "tool_id,user_id" }
    );

    if (upsertError) {
      setError(upsertError.message);
      setSubmittingReview(false);
      return;
    }

    await loadData(false);
    setSubmittingReview(false);
  }

  if (loading || authLoading) {
    return (
      <div className="container-app py-10">
        <div className="card p-6">
          <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
            <div className="skeleton h-48 w-full rounded-2xl" />
            <div>
              <div className="skeleton h-4 w-24" />
              <div className="skeleton mt-3 h-8 w-2/3" />
              <div className="skeleton mt-3 h-4 w-full" />
              <div className="skeleton mt-2 h-4 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="container-app py-10">
        <div className="card p-6">
          <p className="rounded-xl bg-[var(--color-danger-soft)] p-4 text-sm text-[var(--color-danger)]">{error ?? "Tool not found."}</p>
          <Link href="/" className="btn btn-primary btn-md mt-4">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-app py-6 md:py-10">
      {/* Hero card */}
      <div className="card overflow-hidden fade-in-up">
        <div className="grid gap-0 lg:grid-cols-[240px_1fr]">
          {/* Logo panel */}
          <div className="relative grid place-items-center border-b border-[var(--color-line)] bg-gradient-to-br from-[var(--color-surface-2)] to-[var(--color-accent-soft)] p-6 lg:min-h-[240px] lg:border-b-0 lg:border-r">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`${tool.name} logo`}
                className="h-24 w-24 rounded-3xl bg-white object-contain p-2 shadow-[var(--shadow-soft)] ring-1 ring-[var(--color-line)] sm:h-28 sm:w-28"
              />
            ) : (
              <span className="grid h-24 w-24 place-items-center rounded-3xl bg-[var(--color-ink)] text-2xl font-black text-[var(--color-paper)] sm:h-28 sm:w-28">
                {getInitials(tool.name)}
              </span>
            )}
          </div>

          {/* Info panel */}
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="pill pill-accent">{tool.category}</span>
              <span className="pill pill-neutral">{FREE_TYPE_LABELS[tool.free_type]}</span>
              {tool.is_verified ? <span className="pill pill-success">Verified</span> : null}
            </div>

            <h1 className="section-title mt-3 text-2xl font-black tracking-tight sm:text-3xl">{tool.name}</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)] sm:text-base sm:leading-7">{tool.short_description}</p>

            <div className="mt-4 flex items-center gap-2">
              <RatingStars value={tool.avg_rating} size="sm" />
              <span className="text-xs font-semibold text-[var(--color-ink)]">{tool.avg_rating.toFixed(1)}</span>
              <span className="text-xs text-[var(--color-faint)]">({tool.review_count} reviews)</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {tool.tags.map((tag) => (
                <span key={tag} className="chip px-2 py-0.5 text-[11px]">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              <InfoCard label="Free model" value={FREE_TYPE_LABELS[tool.free_type]} />
              <InfoCard label="Rating" value={`${tool.avg_rating.toFixed(1)} / 5`} />
              <InfoCard label="Updated" value={formatDate(tool.updated_at)} />
              <InfoCard label="Clicks" value={tool.click_count.toString()} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={openTool} className="btn btn-accent btn-md">
                Visit Website ↗
              </button>
              <button type="button" onClick={toggleBookmark} className="btn btn-ghost btn-md">
                {isBookmarked ? "★ Saved" : "☆ Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 overflow-x-auto pb-1">
        <div className="flex gap-2">
          <PanelTab label="Overview" active={activePanel === "overview"} onClick={() => setActivePanel("overview")} />
          <PanelTab label="Setup Guide" active={activePanel === "setup"} onClick={() => setActivePanel("setup")} />
          <PanelTab label="Share" active={activePanel === "share"} onClick={() => setActivePanel("share")} />
          <PanelTab label="Write Review" active={activePanel === "review"} onClick={() => setActivePanel("review")} />
          <PanelTab label="Community" active={activePanel === "community"} onClick={() => setActivePanel("community")} />
        </div>
      </div>

      {activePanel === "overview" ? (
        <section className="card mt-4 p-5 sm:p-6 fade-in-up">
          <h2 className="text-lg font-bold text-[var(--color-ink)]">How it works and why it is useful</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[var(--color-muted)]">{tool.how_it_works}</p>
          <p className="mt-4 rounded-xl bg-[var(--color-surface-2)] p-4 text-sm leading-7 text-[var(--color-muted)]">
            <span className="font-semibold text-[var(--color-ink)]">Free access summary: </span>
            {tool.free_details}
          </p>
        </section>
      ) : null}

      {activePanel === "share" ? (
        <section className="card mt-4 p-5 sm:p-6 fade-in-up">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[var(--color-ink)]">Share this tool page</h2>
            <button type="button" onClick={shareTool} className="btn btn-primary btn-sm">
              Share from phone
            </button>
          </div>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Shared links open this website first, then users can go to the official tool link.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`https://wa.me/?text=${encodedShareText}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
              WhatsApp
            </a>
            <a href={`https://t.me/share/url?url=${encodedShareUrl}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
              Telegram
            </a>
            <a href={`https://twitter.com/intent/tweet?text=${encodedShareText}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
              X
            </a>
            <button type="button" onClick={copyShareLink} className="btn btn-ghost btn-sm">
              Copy link
            </button>
          </div>
          {shareMessage ? <p className="mt-3 text-xs text-[var(--color-muted)]">{shareMessage}</p> : null}
        </section>
      ) : null}

      {activePanel === "setup" ? (
        <section className="card mt-4 p-5 sm:p-6 fade-in-up">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[var(--color-ink)]">Setup guide (free access)</h2>
            <div className="flex flex-wrap gap-2">
              {guide?.requires_login ? <span className="pill pill-neutral">Login required</span> : null}
              {guide?.requires_api_key ? <span className="pill pill-neutral">API key setup</span> : null}
            </div>
          </div>

          {guide?.summary ? <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">{guide.summary}</p> : null}
          {guide?.free_access_notes ? <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">{guide.free_access_notes}</p> : null}

          {guideSteps.length > 0 ? (
            <ol className="mt-5 space-y-3">
              {guideSteps.map((step, index) => (
                <li key={step.id} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--color-ink)] text-xs font-bold text-[var(--color-paper)]">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[var(--color-ink)]">{step.title}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-[var(--color-muted)]">{step.description}</p>
                    </div>
                  </div>
                  {step.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={step.image_url} alt={`${step.title} screenshot`} className="mt-3 max-h-64 w-full rounded-xl border border-[var(--color-line)] object-cover" loading="lazy" />
                  ) : null}
                </li>
              ))}
            </ol>
          ) : fallbackSteps.length > 0 ? (
            <div className="mt-4 space-y-2">
              {fallbackSteps.map((line) => (
                <p key={line} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3 text-sm text-[var(--color-muted)]">
                  {line}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-muted)]">No setup guide yet.</p>
          )}
        </section>
      ) : null}

      {activePanel === "review" ? (
        <section className="card mt-4 p-5 sm:p-6 fade-in-up">
          <h2 className="text-xl font-bold text-[var(--color-ink)]">Rate this tool</h2>
          <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
            <div>
              <p className="label">Your rating</p>
              <div className="mt-2">
                <RatingStars value={rating} onChange={setRating} size="lg" />
              </div>
            </div>
            <label className="label">
              Review (optional)
              <textarea
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                rows={4}
                placeholder="What was useful? Any free-tier limits?"
                className="field mt-1"
              />
            </label>
            <button type="submit" disabled={submittingReview} className="btn btn-primary btn-md">
              {submittingReview ? "Saving..." : "Submit Review"}
            </button>
          </form>
          {error ? (
            <p className="mt-4 rounded-xl bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">{error}</p>
          ) : null}
        </section>
      ) : null}

      {activePanel === "community" ? (
        <section className="card mt-4 p-5 sm:p-6 fade-in-up">
          <h2 className="text-xl font-bold text-[var(--color-ink)]">Community reviews</h2>
          <div className="mt-4 space-y-3">
            {reviews.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--color-line)] p-4 text-sm text-[var(--color-muted)]">No reviews yet. Be the first to review.</p>
            ) : (
              reviews.map((review) => (
                <article key={review.id} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {review.profiles?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={review.profiles.avatar_url} alt="Reviewer avatar" className="h-8 w-8 rounded-full border border-[var(--color-line)] object-cover" />
                      ) : (
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-ink)] text-xs font-bold text-[var(--color-paper)]">
                          {getInitials(review.profiles?.full_name ?? "U")}
                        </span>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-ink)]">{review.profiles?.full_name ?? "Anonymous"}</p>
                        <p className="text-[11px] text-[var(--color-faint)]">{formatDate(review.created_at)}</p>
                      </div>
                    </div>
                    <RatingStars value={review.rating} size="sm" />
                  </div>
                  {review.review_text ? <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">{review.review_text}</p> : null}
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3">
      <p className="overline">{label}</p>
      <p className="mt-1 text-xs font-semibold text-[var(--color-ink)] sm:text-sm">{value}</p>
    </div>
  );
}

function PanelTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition sm:text-sm ${
        active
          ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
          : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
      }`}
    >
      {label}
    </button>
  );
}
