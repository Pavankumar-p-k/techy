"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { FREE_TYPE_LABELS } from "@/lib/constants";
import type { Database } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type Submission = Database["public"]["Tables"]["tool_submissions"]["Row"];
type Tool = Database["public"]["Tables"]["tools"]["Row"];

export function AdminDashboardClient() {
  const router = useRouter();
  const { supabase, user, profile, loading } = useAuthUser();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pendingTools, setPendingTools] = useState<Tool[]>([]);
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?next=/admin");
      return;
    }

    if (!loading && user && !isAdmin) {
      router.push("/");
      return;
    }

    async function loadData() {
      if (!user || !isAdmin) {
        return;
      }

      setIsLoading(true);

      const [submissionsRes, toolsRes] = await Promise.all([
        supabase.from("tool_submissions").select("*").eq("status", "pending").order("created_at", { ascending: true }),
        supabase.from("tools").select("*").eq("status", "pending").order("created_at", { ascending: true }),
      ]);

      setSubmissions(submissionsRes.data ?? []);
      setPendingTools(toolsRes.data ?? []);
      setIsLoading(false);
    }

    void loadData();
  }, [isAdmin, loading, router, supabase, user]);

  async function refreshData() {
    if (!user || !isAdmin) {
      return;
    }

    const [submissionsRes, toolsRes] = await Promise.all([
      supabase.from("tool_submissions").select("*").eq("status", "pending").order("created_at", { ascending: true }),
      supabase.from("tools").select("*").eq("status", "pending").order("created_at", { ascending: true }),
    ]);

    setSubmissions(submissionsRes.data ?? []);
    setPendingTools(toolsRes.data ?? []);
  }

  async function approveSubmission(id: string) {
    const note = noteById[id]?.trim() ?? "";
    const { error } = await supabase.rpc("approve_submission", {
      submission_id: id,
      moderation_comment: note || undefined,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Submission approved and published.");
    await refreshData();
  }

  async function rejectSubmission(id: string) {
    const note = noteById[id]?.trim() ?? "";
    const { error } = await supabase.rpc("reject_submission", {
      submission_id: id,
      moderation_comment: note || undefined,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Submission rejected.");
    await refreshData();
  }

  async function updatePendingTool(id: string, status: "published" | "rejected") {
    const note = noteById[id]?.trim() ?? null;

    const { error } = await supabase
      .from("tools")
      .update({ status, moderation_notes: note, is_verified: status === "published" })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`Tool marked as ${status}.`);
    await refreshData();
  }

  if (loading || isLoading) {
    return <p className="mx-auto w-full max-w-6xl px-4 py-10 text-sm text-[var(--color-muted)] md:px-6">Loading admin dashboard...</p>;
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <h1 className="text-3xl font-black text-[var(--color-ink)]">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">Moderate user submissions and pending tools.</p>
      {message ? <p className="mt-4 rounded-xl bg-[var(--color-surface-2)] p-3 text-sm text-[var(--color-muted)]">{message}</p> : null}

      <section className="mt-8">
        <h2 className="text-xl font-bold text-[var(--color-ink)]">Pending submissions</h2>
        <div className="mt-4 space-y-4">
          {submissions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--color-line)] p-4 text-sm text-[var(--color-muted)]">No pending submissions.</p>
          ) : (
            submissions.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
                      {item.category} | {FREE_TYPE_LABELS[item.free_type]}
                    </p>
                    <h3 className="text-lg font-bold text-[var(--color-ink)]">{item.name}</h3>
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">{formatDate(item.created_at)}</p>
                </div>

                <p className="mt-2 text-sm text-[var(--color-muted)]">{item.short_description}</p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{item.how_it_works}</p>
                <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-[var(--color-accent)]">
                  {item.url}
                </a>

                <textarea
                  rows={2}
                  placeholder="Moderation note"
                  value={noteById[item.id] ?? ""}
                  onChange={(event) => setNoteById((current) => ({ ...current, [item.id]: event.target.value }))}
                  className="mt-3 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
                />

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => approveSubmission(item.id)}
                    className="rounded-full bg-[var(--color-success)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Approve + Publish
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectSubmission(item.id)}
                    className="rounded-full bg-[var(--color-danger)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-[var(--color-ink)]">Direct pending tools</h2>
        <div className="mt-4 space-y-4">
          {pendingTools.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--color-line)] p-4 text-sm text-[var(--color-muted)]">No pending tools.</p>
          ) : (
            pendingTools.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                <h3 className="text-lg font-bold text-[var(--color-ink)]">{item.name}</h3>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{item.short_description}</p>
                <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-[var(--color-accent)]">
                  {item.url}
                </a>

                <textarea
                  rows={2}
                  placeholder="Moderation note"
                  value={noteById[item.id] ?? ""}
                  onChange={(event) => setNoteById((current) => ({ ...current, [item.id]: event.target.value }))}
                  className="mt-3 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
                />

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => updatePendingTool(item.id, "published")}
                    className="rounded-full bg-[var(--color-success)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Publish
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePendingTool(item.id, "rejected")}
                    className="rounded-full bg-[var(--color-danger)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
