/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";

interface SubmissionItem {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

export function ProfileClient() {
  const router = useRouter();
  const { supabase, user, profile, loading, refresh } = useAuthUser();

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?next=/profile");
      return;
    }

    if (profile) {
      setFullName(profile.full_name ?? "");
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [loading, profile, router, user]);

  useEffect(() => {
    async function loadStats() {
      if (!user) {
        return;
      }

      const [bookmarkRes, reviewRes, submissionRes] = await Promise.all([
        supabase.from("tool_bookmarks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("tool_reviews").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase
          .from("tool_submissions")
          .select("id,name,status,created_at")
          .eq("submitted_by", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setBookmarkCount(bookmarkRes.count ?? 0);
      setReviewCount(reviewRes.count ?? 0);
      setSubmissions((submissionRes.data as SubmissionItem[]) ?? []);
    }

    void loadStats();
  }, [supabase, user]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      })
      .eq("id", user.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Profile saved.");
      await refresh();
    }

    setSaving(false);
  }

  if (loading || !user) {
    return <p className="mx-auto w-full max-w-5xl px-4 py-10 text-sm text-[var(--color-muted)] md:px-6">Loading profile...</p>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
          <h1 className="text-2xl font-black text-[var(--color-ink)]">Your Profile</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Manage your account and contributor identity.</p>

          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <label className="block text-sm text-[var(--color-muted)]">
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
              />
            </label>

            <label className="block text-sm text-[var(--color-muted)]">
              Bio
              <textarea
                rows={4}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
              />
            </label>

            <label className="block text-sm text-[var(--color-muted)]">
              Avatar URL
              <input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
              />
            </label>

            <p className="text-xs text-[var(--color-muted)]">Signed in as {user.email}</p>

            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[var(--color-ink)] px-5 py-2 text-sm font-semibold text-[var(--color-paper)] transition hover:bg-[var(--color-accent)] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>

            {message ? <p className="text-sm text-[var(--color-muted)]">{message}</p> : null}
          </form>
        </section>

        <aside className="space-y-4">
          <StatItem label="Bookmarks" value={bookmarkCount.toString()} />
          <StatItem label="Reviews" value={reviewCount.toString()} />
          <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--color-ink)]">Recent submissions</h2>
            <div className="mt-3 space-y-3">
              {submissions.length === 0 ? (
                <p className="text-sm text-[var(--color-muted)]">No submissions yet.</p>
              ) : (
                submissions.map((submission) => (
                  <article key={submission.id} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-3">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">{submission.name}</p>
                    <p className="text-xs text-[var(--color-muted)]">Status: {submission.status}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[var(--color-ink)]">{value}</p>
    </section>
  );
}
