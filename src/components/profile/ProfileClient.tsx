/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { useAuthUser } from "@/hooks/useAuthUser";
import type { Database } from "@/lib/types";
import { formatDate, getInitials } from "@/lib/utils";
import { profileUpdateSchema } from "@/lib/validation";

type ProfilePanel = "profile" | "security" | "bookmarks";
type Tool = Database["public"]["Tables"]["tools"]["Row"];

interface SubmissionItem {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

interface BookmarkItem {
  id: string;
  created_at: string;
  tools: Tool | null;
}

export function ProfileClient() {
  const router = useRouter();
  const { supabase, user, profile, loading, refresh } = useAuthUser();
  const isAdmin = profile?.role === "admin";

  const [activePanel, setActivePanel] = useState<ProfilePanel>("profile");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [sessionBusy, setSessionBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [profile]);

  useEffect(() => {
    async function loadStats() {
      if (!user) {
        return;
      }

      const [bookmarkRes, reviewRes, submissionRes, bookmarksRes] = await Promise.all([
        supabase.from("tool_bookmarks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("tool_reviews").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase
          .from("tool_submissions")
          .select("id,name,status,created_at")
          .eq("submitted_by", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("tool_bookmarks").select("id,created_at,tools(*)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
      ]);

      setBookmarkCount(bookmarkRes.count ?? 0);
      setReviewCount(reviewRes.count ?? 0);
      setSubmissions((submissionRes.data as SubmissionItem[]) ?? []);
      setBookmarks((((bookmarksRes.data as unknown as BookmarkItem[]) ?? []).filter((item) => item.tools?.status === "published")));
    }

    void loadStats();
  }, [supabase, user]);

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    const validation = profileUpdateSchema.safeParse({
      fullName,
      bio,
      avatarUrl,
    });

    if (!validation.success) {
      setProfileMessage(validation.error.issues[0]?.message ?? "Invalid profile details.");
      return;
    }

    setSavingProfile(true);
    setProfileMessage(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: validation.data.fullName,
        bio: validation.data.bio,
        avatar_url: validation.data.avatarUrl,
      })
      .eq("id", user.id);

    if (error) {
      setProfileMessage(error.message);
    } else {
      setProfileMessage("Profile saved.");
      await refresh();
    }

    setSavingProfile(false);
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!user) {
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setProfileMessage("Please upload an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileMessage("Profile image must be under 2MB.");
      return;
    }

    setUploadingAvatar(true);
    setProfileMessage(null);

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filePath = `${user.id}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (uploadError) {
      setProfileMessage("Avatar upload failed. Create a public bucket named 'avatars' in Supabase Storage.");
      setUploadingAvatar(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    setAvatarUrl(data.publicUrl);
    setProfileMessage("Avatar uploaded. Save profile to apply it.");
    setUploadingAvatar(false);
  }

  async function handlePasswordUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newPassword || newPassword.length < 8) {
      setSecurityMessage("Password should be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityMessage("Password confirmation does not match.");
      return;
    }

    setSavingPassword(true);
    setSecurityMessage(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setSecurityMessage(error.message);
    } else {
      setSecurityMessage("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
    }

    setSavingPassword(false);
  }

  async function handleSignOutCurrent() {
    setSessionBusy(true);
    await supabase.auth.signOut();
    setSessionBusy(false);
    router.push("/login");
  }

  async function handleSignOutAll() {
    setSessionBusy(true);
    await supabase.auth.signOut({ scope: "global" });
    setSessionBusy(false);
    router.push("/login");
  }

  if (loading) {
    return <p className="mx-auto w-full max-w-5xl px-4 py-10 text-sm text-[var(--color-muted)] md:px-6">Loading profile...</p>;
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
        <section className="premium-panel rounded-2xl p-6">
          <h1 className="section-title text-2xl font-black">Profile</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Login to access your profile settings.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/login?next=/profile" className="rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-[var(--color-paper)]">
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
      <div className="premium-panel rounded-2xl p-5">
        <h1 className="section-title text-2xl font-black">Account Panel</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Manage profile, password, login sessions, bookmarks, and avatar.</p>

        <div className={`mt-4 grid gap-3 ${isAdmin ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Account</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">{user.email}</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">Role: {isAdmin ? "Admin" : "User"}</p>
          </section>
          <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Appearance and Session</p>
            <div className="flex flex-wrap items-center gap-2">
              <ThemeSwitcher />
              <button
                type="button"
                onClick={handleSignOutCurrent}
                disabled={sessionBusy}
                className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-surface-2)] disabled:opacity-60 sm:text-sm"
              >
                Logout
              </button>
              <button
                type="button"
                onClick={handleSignOutAll}
                disabled={sessionBusy}
                className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-surface-2)] disabled:opacity-60 sm:text-sm"
              >
                Logout all
              </button>
            </div>
          </section>
          {isAdmin ? (
            <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Admin</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">Manage submissions, tools, and resources.</p>
              <Link href="/admin" className="mt-3 inline-flex rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-[var(--color-paper)]">
                Open Admin Dashboard
              </Link>
            </section>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <PanelTab label="Profile" active={activePanel === "profile"} onClick={() => setActivePanel("profile")} />
          <PanelTab label="Security" active={activePanel === "security"} onClick={() => setActivePanel("security")} />
          <PanelTab label="Bookmarks" active={activePanel === "bookmarks"} onClick={() => setActivePanel("bookmarks")} />
        </div>
      </div>

      {activePanel === "profile" ? (
        <section className="glass-panel mt-5 rounded-2xl p-5">
          <h2 className="text-lg font-bold text-[var(--color-ink)]">Edit profile</h2>
          <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Profile avatar preview" className="h-16 w-16 rounded-full border border-[var(--color-line)] object-cover" />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--color-surface-2)] text-xl font-black text-[var(--color-ink)]">
                  {getInitials(fullName || user.email || "U")}
                </span>
              )}
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">Profile photo</p>
                <p className="text-xs text-[var(--color-muted)]">Upload image (max 2MB) or use a public image URL.</p>
              </div>
            </div>

            <label className="block text-sm text-[var(--color-muted)]">
              Upload profile image
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
              />
              <span className="mt-1 block text-xs text-[var(--color-muted)]">
                {uploadingAvatar ? "Uploading avatar..." : "Supabase public bucket required: avatars"}
              </span>
            </label>

            <label className="block text-sm text-[var(--color-muted)]">
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
              />
            </label>

            <label className="block text-sm text-[var(--color-muted)]">
              Bio
              <textarea
                rows={4}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
              />
            </label>

            <label className="block text-sm text-[var(--color-muted)]">
              Avatar URL
              <input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
              />
            </label>

            <p className="text-xs text-[var(--color-muted)]">Signed in as {user.email}</p>

            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-full bg-[var(--color-ink)] px-5 py-2 text-sm font-semibold text-[var(--color-paper)] transition hover:bg-[var(--color-accent)] disabled:opacity-60"
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>

            {profileMessage ? <p className="text-sm text-[var(--color-muted)]">{profileMessage}</p> : null}
          </form>
        </section>
      ) : null}

      {activePanel === "security" ? (
        <section className="glass-panel mt-5 rounded-2xl p-5">
          <h2 className="text-lg font-bold text-[var(--color-ink)]">Security and logins</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Update password and control active sessions.</p>

          <div className="mt-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <p className="text-sm font-semibold text-[var(--color-ink)]">Login details</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">Email: {user.email}</p>
            <p className="text-sm text-[var(--color-muted)]">Last sign-in: {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : "Unknown"}</p>
          </div>

          <form onSubmit={handlePasswordUpdate} className="mt-4 space-y-4">
            <label className="block text-sm text-[var(--color-muted)]">
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
              />
            </label>
            <label className="block text-sm text-[var(--color-muted)]">
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
              />
            </label>
            <button
              type="submit"
              disabled={savingPassword}
              className="rounded-full bg-[var(--color-ink)] px-5 py-2 text-sm font-semibold text-[var(--color-paper)] transition hover:bg-[var(--color-accent)] disabled:opacity-60"
            >
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSignOutCurrent}
              disabled={sessionBusy}
              className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-60"
            >
              Sign out here
            </button>
            <button
              type="button"
              onClick={handleSignOutAll}
              disabled={sessionBusy}
              className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-60"
            >
              Sign out all devices
            </button>
          </div>

          {securityMessage ? <p className="mt-3 text-sm text-[var(--color-muted)]">{securityMessage}</p> : null}

          <div className="mt-5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <p className="text-sm font-semibold text-[var(--color-ink)]">Admin access</p>
            {profile?.role === "admin" ? (
              <Link href="/admin" className="mt-2 inline-flex rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-[var(--color-paper)]">
                Open Admin Dashboard
              </Link>
            ) : (
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                To login as admin, keep this same account and ask the project owner to promote your email in Supabase SQL:
                <code className="ml-1 rounded bg-[var(--color-surface-2)] px-1 py-0.5 text-xs">select public.set_admin_by_email(&apos;&lt;your-email&gt;&apos;);</code>
              </p>
            )}
          </div>
        </section>
      ) : null}

      {activePanel === "bookmarks" ? (
        <section className="glass-panel mt-5 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-[var(--color-ink)]">Bookmarks and activity</h2>
            <Link href="/bookmarks" className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-ink)] sm:text-sm">
              Open full bookmarks
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatItem label="Bookmarks" value={bookmarkCount.toString()} />
            <StatItem label="Reviews" value={reviewCount.toString()} />
            <StatItem label="Submissions" value={submissions.length.toString()} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--color-ink)]">Recent bookmarks</h3>
              <div className="mt-3 space-y-3">
                {bookmarks.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)]">No bookmarks yet.</p>
                ) : (
                  bookmarks.map((bookmark) => (
                    <article key={bookmark.id} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-3">
                      <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{bookmark.tools?.category ?? "Tool"}</p>
                      <p className="text-sm font-semibold text-[var(--color-ink)]">{bookmark.tools?.name ?? "Unknown tool"}</p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">Saved {formatDate(bookmark.created_at)}</p>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--color-ink)]">Recent submissions</h3>
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
          </div>
        </section>
      ) : null}
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

function PanelTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs font-semibold transition sm:text-sm ${
        active
          ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
          : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
      }`}
    >
      {label}
    </button>
  );
}
