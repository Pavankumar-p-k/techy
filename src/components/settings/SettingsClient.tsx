/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { PortfolioSettings } from "@/components/settings/PortfolioSettings";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { communityProfileSchema } from "@/lib/validation";
import { getInitials } from "@/lib/utils";

type SettingsTab = "profile" | "portfolio" | "security";

const SKILL_PRESETS = ["Python", "JavaScript", "React", "AI/ML", "Java", "C++", "Node.js", "Flutter", "SQL", "Git"];

export function SettingsClient() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { user, profile, loading, refresh } = useAuthUser();

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Profile form state
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [college, setCollege] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [currentlyBuilding, setCurrentlyBuilding] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [links, setLinks] = useState({ github: "", linkedin: "", instagram: "", portfolio: "", youtube: "", x: "", other: "" });
  const [avatarUrl, setAvatarUrl] = useState("");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Security state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [sessionBusy, setSessionBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setUsername(profile.username ?? "");
      setBio(profile.bio ?? "");
      setBranch(profile.branch ?? "");
      setYear(profile.year ?? "");
      setCollege(profile.college ?? "");
      setSkills(profile.skills ?? []);
      setToolsUsed(profile.tools_used ?? []);
      setInterests(profile.interests ?? []);
      setCurrentlyBuilding(profile.currently_building ?? "");
      setLookingFor(profile.looking_for ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setLinks({
        github: profile.link_github ?? "",
        linkedin: profile.link_linkedin ?? "",
        instagram: profile.link_instagram ?? "",
        portfolio: profile.link_portfolio ?? "",
        youtube: profile.link_youtube ?? "",
        x: profile.link_x ?? "",
        other: profile.link_other ?? "",
      });
    }
  }, [profile]);

  function toggleArrayItem(list: string[], setList: (value: string[]) => void, value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    if (list.includes(trimmed)) {
      setList(list.filter((item) => item !== trimmed));
    } else {
      setList([...list, trimmed]);
    }
  }

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      return;
    }

    // Auto-generate a username from email if the user left it blank,
    // so the save is never blocked by the username validation.
    const effectiveUsername =
      username.trim() ||
      (user.email
        ? user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20) + Math.floor(Math.random() * 90 + 10)
        : "");

    const parsed = communityProfileSchema.safeParse({
      fullName,
      bio,
      avatarUrl,
      username: effectiveUsername,
      branch,
      year,
      college,
      skills,
      toolsUsed,
      interests,
      currentlyBuilding,
      lookingFor,
      links,
    });

    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Check your input.");
      setIsSuccess(false);
      return;
    }

    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.fullName,
        username: parsed.data.username,
        bio: parsed.data.bio,
        branch: parsed.data.branch,
        year: parsed.data.year,
        college: parsed.data.college,
        skills: parsed.data.skills,
        tools_used: parsed.data.toolsUsed,
        interests: parsed.data.interests,
        currently_building: parsed.data.currentlyBuilding,
        looking_for: parsed.data.lookingFor,
        avatar_url: parsed.data.avatarUrl,
        link_github: parsed.data.links.github,
        link_linkedin: parsed.data.links.linkedin,
        link_instagram: parsed.data.links.instagram,
        link_portfolio: parsed.data.links.portfolio,
        link_youtube: parsed.data.links.youtube,
        link_x: parsed.data.links.x,
        link_other: parsed.data.links.other,
      })
      .eq("id", user.id);

    if (error) {
      setMessage(error.message.includes("duplicate key") ? "That username is already taken." : error.message);
      setIsSuccess(false);
    } else {
      setMessage("Profile saved.");
      setIsSuccess(true);
      await refresh();
    }

    setSaving(false);
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
      setMessage("Please upload an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("Image must be under 2MB.");
      return;
    }

    setUploadingAvatar(true);
    setMessage(null);

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filePath = `${user.id}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (uploadError) {
      setMessage("Upload failed. The 'avatars' storage bucket is required.");
      setUploadingAvatar(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

    // Persist immediately so the avatar is saved even if the user
    // doesn't press "Save Profile" afterwards.
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: data.publicUrl })
      .eq("id", user.id);

    if (updateError) {
      setMessage("Avatar uploaded but failed to save. Press Save Profile.");
      setAvatarUrl(data.publicUrl);
      setUploadingAvatar(false);
      return;
    }

    setAvatarUrl(data.publicUrl);
    setMessage("Profile photo updated.");
    await refresh();
    setUploadingAvatar(false);
  }

  async function handlePasswordUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newPassword || newPassword.length < 8) {
      setSecurityMessage("Password should be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityMessage("Passwords do not match.");
      return;
    }

    setSessionBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setSecurityMessage(error.message);
    } else {
      setSecurityMessage("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
    }

    setSessionBusy(false);
  }

  async function handleSignOutAll() {
    setSessionBusy(true);
    await supabase.auth.signOut({ scope: "global" });
    setSessionBusy(false);
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="container-app max-w-2xl py-10">
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-app max-w-2xl py-10">
        <div className="card p-8 text-center">
          <h1 className="section-title text-2xl font-black tracking-tight">Settings</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Login to manage your profile.</p>
          <Link href="/login?next=/settings" className="btn btn-primary btn-md mt-5">
            Login
          </Link>
        </div>
      </div>
    );
  }

  const profileHref = profile?.username ? `/u/${profile.username}` : undefined;

  return (
    <div className="container-app max-w-2xl py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="section-title text-3xl font-black tracking-tight">Settings</h1>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          {profileHref ? (
            <Link href={profileHref} className="btn btn-ghost btn-sm">
              View Profile
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <div className="segmented">
          <button type="button" data-active={activeTab === "profile"} onClick={() => setActiveTab("profile")}>
            Edit Profile
          </button>
          <button type="button" data-active={activeTab === "portfolio"} onClick={() => setActiveTab("portfolio")}>
            Portfolio
          </button>
          <button type="button" data-active={activeTab === "security"} onClick={() => setActiveTab("security")}>
            Security
          </button>
        </div>
      </div>

      {activeTab === "profile" ? (
        <form onSubmit={handleSaveProfile} className="card mt-4 space-y-4 p-5">
          {/* Avatar */}
          <div className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-14 w-14 rounded-full border border-[var(--color-line)] object-cover" />
            ) : (
              <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--color-ink)] text-base font-black text-[var(--color-paper)]">
                {getInitials(fullName || user.email || "U")}
              </span>
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--color-ink)]">Profile photo</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="mt-1 block w-full text-xs text-[var(--color-muted)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--color-ink)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--color-paper)]"
              />
              {uploadingAvatar ? <p className="mt-1 text-xs text-[var(--color-faint)]">Uploading...</p> : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label">
              Full name
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="field" maxLength={80} />
            </label>
            <label className="label">
              Username
              <input
                required
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                placeholder="pavan_k"
                className="field"
                maxLength={24}
              />
              <span className="mt-1 block text-xs font-normal text-[var(--color-faint)]">Your profile: /u/{username || "username"}</span>
            </label>
          </div>

          <label className="label">
            Bio
            <textarea rows={3} value={bio} onChange={(event) => setBio(event.target.value)} className="field" maxLength={600} />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="label">
              Branch
              <input value={branch} onChange={(event) => setBranch(event.target.value)} placeholder="CSE" className="field" maxLength={60} />
            </label>
            <label className="label">
              Year
              <input value={year} onChange={(event) => setYear(event.target.value)} placeholder="2nd Year" className="field" maxLength={20} />
            </label>
            <label className="label">
              College
              <input value={college} onChange={(event) => setCollege(event.target.value)} placeholder="Your college" className="field" maxLength={120} />
            </label>
          </div>

          {/* Skills */}
          <div>
            <p className="label">Skills</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {SKILL_PRESETS.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleArrayItem(skills, setSkills, skill)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    skills.includes(skill)
                      ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
                      : "border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
            {skills.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {skills.filter((skill) => !SKILL_PRESETS.includes(skill)).map((skill) => (
                  <span key={skill} className="chip bg-[var(--color-accent-soft)] text-[var(--color-ink)]">
                    {skill}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* Tools */}
          <label className="label">
            Tools you use (comma separated)
            <input
              value={toolsUsed.join(", ")}
              onChange={(event) => setToolsUsed(event.target.value.split(",").map((item) => item.trim()).filter(Boolean))}
              placeholder="VS Code, GitHub, Docker, Ollama"
              className="field"
            />
          </label>

          <label className="label">
            Interests (comma separated)
            <input
              value={interests.join(", ")}
              onChange={(event) => setInterests(event.target.value.split(",").map((item) => item.trim()).filter(Boolean))}
              placeholder="AI, Web Dev, Open Source"
              className="field"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label">
              Currently building
              <input
                value={currentlyBuilding}
                onChange={(event) => setCurrentlyBuilding(event.target.value)}
                placeholder="AI study assistant with RAG"
                className="field"
                maxLength={280}
              />
            </label>
            <label className="label">
              Looking for
              <input
                value={lookingFor}
                onChange={(event) => setLookingFor(event.target.value)}
                placeholder="Hackathon teammates, internship..."
                className="field"
                maxLength={280}
              />
            </label>
          </div>

          {/* Links */}
          <div>
            <p className="label">Social links</p>
            <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
              <input value={links.github} onChange={(event) => setLinks((current) => ({ ...current, github: event.target.value }))} placeholder="GitHub URL" className="field" />
              <input value={links.linkedin} onChange={(event) => setLinks((current) => ({ ...current, linkedin: event.target.value }))} placeholder="LinkedIn URL" className="field" />
              <input value={links.portfolio} onChange={(event) => setLinks((current) => ({ ...current, portfolio: event.target.value }))} placeholder="Portfolio URL" className="field" />
              <input value={links.instagram} onChange={(event) => setLinks((current) => ({ ...current, instagram: event.target.value }))} placeholder="Instagram URL" className="field" />
              <input value={links.youtube} onChange={(event) => setLinks((current) => ({ ...current, youtube: event.target.value }))} placeholder="YouTube URL" className="field" />
              <input value={links.x} onChange={(event) => setLinks((current) => ({ ...current, x: event.target.value }))} placeholder="X (Twitter) URL" className="field" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-line)] pt-4">
            <button type="submit" disabled={saving} className="btn btn-primary btn-lg">
              {saving ? "Saving..." : "Save Profile"}
            </button>
            {message ? (
              <p className={`text-sm ${isSuccess ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{message}</p>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="card mt-4 space-y-5 p-5">
          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
            <p className="text-sm font-semibold text-[var(--color-ink)]">Account</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{user.email}</p>
            <p className="text-xs text-[var(--color-faint)]">Role: {profile?.role === "admin" ? "Admin / Mentor" : "Student"}</p>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-3">
            <p className="text-sm font-semibold text-[var(--color-ink)]">Change password</p>
            <label className="label">
              New password
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="field" autoComplete="new-password" />
            </label>
            <label className="label">
              Confirm new password
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="field" autoComplete="new-password" />
            </label>
            <button type="submit" disabled={sessionBusy} className="btn btn-primary btn-md">
              Update Password
            </button>
            {securityMessage ? <p className="text-sm text-[var(--color-muted)]">{securityMessage}</p> : null}
          </form>

          <div className="flex flex-wrap gap-2 border-t border-[var(--color-line)] pt-4">
            <button type="button" onClick={handleSignOutAll} disabled={sessionBusy} className="btn btn-ghost btn-md">
              Sign out all devices
            </button>
            {profile?.role === "admin" ? (
              <Link href="/admin" className="btn btn-ghost btn-md">
                Admin / Mentor Dashboard
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
