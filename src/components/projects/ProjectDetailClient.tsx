/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useFollow } from "@/hooks/useFollow";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { FeedbackStatus, FeedbackType, FeedbackWithAuthor, ProjectWithOwner } from "@/lib/types";
import { FEEDBACK_STATUS_LABELS, PROJECT_STATUS_BADGES, timeAgo } from "@/lib/social-utils";
import { formatDate, getInitials } from "@/lib/utils";
import { feedbackInputSchema } from "@/lib/validation";

interface ProjectDetailClientProps {
  projectId: string;
}

export function ProjectDetailClient({ projectId }: ProjectDetailClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { user } = useAuthUser();

  const [project, setProject] = useState<ProjectWithOwner | null>(null);
  const [feedback, setFeedback] = useState<FeedbackWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [feedbackType, setFeedbackType] = useState<FeedbackType>("suggestion");
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");

  const loadProject = useCallback(async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*, profiles(id, username, full_name, avatar_url)")
      .eq("id", projectId)
      .maybeSingle();

    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setProject(data as unknown as ProjectWithOwner);

    const { data: feedbackData } = await supabase
      .from("project_feedback")
      .select("*, profiles(id, username, full_name, avatar_url)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    setFeedback((feedbackData as unknown as FeedbackWithAuthor[]) ?? []);
    setLoading(false);
  }, [supabase, projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  async function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !project) {
      router.push("/login");
      return;
    }

    const parsed = feedbackInputSchema.safeParse({ feedbackType, content: feedbackText });
    if (!parsed.success) {
      setFeedbackMessage(parsed.error.issues[0]?.message ?? "Check your input.");
      return;
    }

    setSubmittingFeedback(true);
    setFeedbackMessage(null);

    const { error } = await supabase.from("project_feedback").insert({
      project_id: project.id,
      user_id: user.id,
      feedback_type: parsed.data.feedbackType,
      content: parsed.data.content,
    });

    if (error) {
      setFeedbackMessage(error.message);
    } else {
      setFeedbackText("");
      await loadProject();
    }

    setSubmittingFeedback(false);
  }

  async function updateFeedbackStatus(feedbackId: string, status: FeedbackStatus) {
    const { error } = await supabase.from("project_feedback").update({ status }).eq("id", feedbackId);
    if (!error) {
      await loadProject();
    }
  }

  async function startConversation() {
    if (!user || !project?.profiles?.id) {
      router.push("/login");
      return;
    }

    const { data: conversationId } = await supabase.rpc("get_or_create_direct_conversation", {
      other_user: project.profiles.id,
    });

    if (conversationId) {
      router.push(`/messages/${conversationId}`);
    }
  }

  if (loading) {
    return (
      <div className="container-app max-w-4xl py-8">
        <div className="skeleton h-48 w-full" />
        <div className="skeleton mt-4 h-4 w-2/3" />
        <div className="skeleton mt-2 h-4 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container-app max-w-4xl py-10">
        <div className="card p-8 text-center">
          <p className="text-sm font-semibold text-[var(--color-ink)]">{notFound ? "Project not found." : "Something went wrong."}</p>
          <Link href="/projects" className="btn btn-primary btn-md mt-4">
            Browse Projects
          </Link>
        </div>
      </div>
    );
  }

  const owner = project.profiles;
  const isOwner = user?.id === project.owner_id;
  const visibleFeedback = statusFilter === "all" ? feedback : feedback.filter((item) => item.status === statusFilter);

  return (
    <div className="container-app max-w-4xl py-8">
      <Link href="/projects" className="text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]">
        ← All projects
      </Link>

      {/* Cover */}
      <div className="card mt-4 overflow-hidden">
        <div className="grid h-48 place-items-center border-b border-[var(--color-line)] bg-gradient-to-br from-[var(--color-surface-2)] to-[var(--color-accent-soft)] sm:h-64">
          {project.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-4xl font-black text-[var(--color-faint)]">{"</>"}</span>
          )}
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="pill pill-accent">{project.category}</span>
            <span className={`pill ${PROJECT_STATUS_BADGES[project.status]}`}>{project.status}</span>
          </div>

          <h1 className="section-title mt-3 text-2xl font-black tracking-tight sm:text-3xl">{project.title}</h1>

          {/* Owner row */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href={owner?.username ? `/u/${owner.username}` : "#"} className="flex items-center gap-2.5">
              {owner?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={owner.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-ink)] text-xs font-black text-[var(--color-paper)]">
                  {getInitials(owner?.full_name || "U")}
                </span>
              )}
              <div>
                <p className="text-sm font-bold text-[var(--color-ink)] hover:underline">{owner?.full_name || "Student"}</p>
                {owner?.username ? <p className="text-xs text-[var(--color-faint)]">@{owner.username}</p> : null}
              </div>
            </Link>
            {!isOwner && owner ? (
              <OwnerActions ownerId={owner.id} />
            ) : null}
            <span className="ml-auto text-xs text-[var(--color-faint)]">Created {formatDate(project.created_at)}</span>
          </div>

          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[var(--color-muted)]">{project.description}</p>

          {/* Links */}
          {(project.demo_url || project.github_url || project.other_url) && (
            <div className="mt-5 flex flex-wrap gap-2">
              {project.demo_url ? (
                <a href={project.demo_url} target="_blank" rel="noreferrer noopener" className="btn btn-accent btn-md">
                  Live Demo ↗
                </a>
              ) : null}
              {project.github_url ? (
                <a href={project.github_url} target="_blank" rel="noreferrer noopener" className="btn btn-ghost btn-md">
                  GitHub ↗
                </a>
              ) : null}
              {project.other_url ? (
                <a href={project.other_url} target="_blank" rel="noreferrer noopener" className="btn btn-ghost btn-md">
                  Link ↗
                </a>
              ) : null}
            </div>
          )}

          {/* Tech + tools */}
          {(project.technologies.length > 0 || project.tools_used.length > 0) && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {project.technologies.length > 0 ? (
                <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3">
                  <p className="overline">Technologies</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {project.technologies.map((tech) => (
                      <span key={tech} className="chip bg-[var(--color-accent-soft)] text-[var(--color-ink)]">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {project.tools_used.length > 0 ? (
                <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3">
                  <p className="overline">Tools</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {project.tools_used.map((tool) => (
                      <span key={tool} className="chip">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Screenshots */}
          {project.screenshots.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {project.screenshots.map((shot) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={shot} src={shot} alt="" className="h-32 w-full rounded-xl border border-[var(--color-line)] object-cover" loading="lazy" />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Feedback section */}
      <section className="card mt-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-[var(--color-ink)]">Feedback</h2>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "open", "in_progress", "fixed", "closed"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatusFilter(item)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                  statusFilter === item
                    ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
                    : "border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                {item === "all" ? "All" : FEEDBACK_STATUS_LABELS[item]}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback form */}
        {user && !isOwner ? (
          <form onSubmit={submitFeedback} className="mt-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
            <div className="flex flex-wrap gap-2">
              {(["bug", "suggestion", "question", "improvement"] as FeedbackType[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFeedbackType(item)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    feedbackType === item
                      ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
                      : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={feedbackText}
              onChange={(event) => setFeedbackText(event.target.value)}
              placeholder={
                feedbackType === "bug"
                  ? "Describe the bug — what happened vs what you expected..."
                  : feedbackType === "question"
                    ? "What would you like to ask?"
                    : "Share your suggestion..."
              }
              className="field mt-3"
              maxLength={2000}
            />
            <div className="mt-3 flex items-center gap-3">
              <button type="submit" disabled={submittingFeedback} className="btn btn-primary btn-md">
                {submittingFeedback ? "Sending..." : "Send Feedback"}
              </button>
              {feedbackMessage ? <p className="text-xs text-[var(--color-danger)]">{feedbackMessage}</p> : null}
            </div>
          </form>
        ) : !user ? (
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            <Link href="/login" className="font-semibold text-[var(--color-ink)] underline underline-offset-4">
              Login
            </Link>{" "}
            to give feedback.
          </p>
        ) : null}

        {/* Feedback list */}
        <div className="mt-5 space-y-3">
          {visibleFeedback.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--color-line)] p-6 text-center text-sm text-[var(--color-muted)]">
              No feedback yet.
            </p>
          ) : (
            visibleFeedback.map((item) => (
              <article key={item.id} className="rounded-xl border border-[var(--color-line)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {item.profiles?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.profiles.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-surface-2)] text-[10px] font-black text-[var(--color-ink)]">
                        {getInitials(item.profiles?.full_name || "U")}
                      </span>
                    )}
                    <div>
                      <p className="text-xs font-bold text-[var(--color-ink)]">{item.profiles?.full_name || "Student"}</p>
                      <p className="text-[11px] text-[var(--color-faint)]">
                        {item.feedback_type} • {timeAgo(item.created_at)}
                      </p>
                    </div>
                  </div>
                  {isOwner ? (
                    <select
                      value={item.status}
                      onChange={(event) => updateFeedbackStatus(item.id, event.target.value as FeedbackStatus)}
                      className="field w-auto px-2 py-1 text-xs"
                      aria-label="Update feedback status"
                    >
                      {(["open", "in_progress", "fixed", "closed"] as FeedbackStatus[]).map((status) => (
                        <option key={status} value={status}>
                          {FEEDBACK_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`pill ${item.status === "fixed" ? "pill-success" : item.status === "open" ? "pill-danger" : "pill-neutral"}`}>
                      {FEEDBACK_STATUS_LABELS[item.status]}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{item.content}</p>
                {item.owner_response ? (
                  <p className="mt-2 rounded-lg bg-[var(--color-surface-2)] p-2.5 text-xs text-[var(--color-muted)]">
                    <span className="font-semibold text-[var(--color-ink)]">Owner: </span>
                    {item.owner_response}
                  </p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function OwnerActions({ ownerId }: { ownerId: string }) {
  const { isFollowing, toggle, isToggling } = useFollow(ownerId);
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  async function message() {
    const { data } = await supabase.rpc("get_or_create_direct_conversation", { other_user: ownerId });
    if (data) {
      router.push(`/messages/${data}`);
    }
  }

  return (
    <div className="flex gap-2">
      <button type="button" onClick={toggle} disabled={isToggling} className={`btn btn-sm ${isFollowing ? "btn-ghost" : "btn-primary"}`}>
        {isFollowing ? "Following" : "Follow"}
      </button>
      <button type="button" onClick={message} className="btn btn-ghost btn-sm">
        Message
      </button>
    </div>
  );
}
