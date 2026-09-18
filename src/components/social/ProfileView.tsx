/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PostCard } from "@/components/social/PostCard";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useFollow, useFollowCounts } from "@/hooks/useFollow";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PostWithAuthor, Project, SocialProfile } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type ProfileTab = "posts" | "projects";

interface ProfileViewProps {
  profile: SocialProfile;
}

const LINK_LABELS: { key: keyof SocialProfile; label: string }[] = [
  { key: "link_github", label: "GitHub" },
  { key: "link_linkedin", label: "LinkedIn" },
  { key: "link_portfolio", label: "Portfolio" },
  { key: "link_instagram", label: "Instagram" },
  { key: "link_youtube", label: "YouTube" },
  { key: "link_x", label: "X" },
  { key: "link_other", label: "Website" },
];

export function ProfileView({ profile }: ProfileViewProps) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { user } = useAuthUser();
  const { isFollowing, isToggling, error: followError, toggle } = useFollow(user && user.id !== profile.id ? profile.id : null);
  const { followers, following } = useFollowCounts(profile.id);

  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [loadingContent, setLoadingContent] = useState(true);
  const [messaging, setMessaging] = useState(false);

  const isOwnProfile = user?.id === profile.id;

  const loadContent = useCallback(async () => {
    setLoadingContent(true);

    const [postsRes, projectsRes] = await Promise.all([
      supabase
        .from("posts")
        .select("*, profiles(id, username, full_name, avatar_url), projects(id, title)")
        .eq("author_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("projects")
        .select("*")
        .eq("owner_id", profile.id)
        .eq("review_status", "approved")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    setPosts((postsRes.data as unknown as PostWithAuthor[]) ?? []);
    setProjects(projectsRes.data ?? []);
    setPostCount(postsRes.count ?? postsRes.data?.length ?? 0);
    setProjectCount(projectsRes.count ?? projectsRes.data?.length ?? 0);
    setLoadingContent(false);
  }, [supabase, profile.id]);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  async function startConversation() {
    if (!user) {
      router.push(`/login?next=/u/${profile.username}`);
      return;
    }

    setMessaging(true);
    const { data: conversationId, error } = await supabase.rpc("get_or_create_direct_conversation", {
      other_user: profile.id,
    });

    setMessaging(false);

    if (!error && conversationId) {
      router.push(`/messages/${conversationId}`);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-0">
      {/* Header card */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          {/* Avatar */}
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-2xl border border-[var(--color-line)] object-cover sm:h-24 sm:w-24" />
          ) : (
            <span className="grid h-20 w-20 place-items-center rounded-2xl bg-[var(--color-ink)] text-2xl font-black text-[var(--color-paper)] sm:h-24 sm:w-24">
              {(profile.full_name || "U").slice(0, 1).toUpperCase()}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black tracking-tight text-[var(--color-ink)] sm:text-2xl">{profile.full_name || "Student"}</h1>
            <p className="text-sm text-[var(--color-faint)]">@{profile.username ?? "unset"}</p>
            {profile.branch || profile.year || profile.college ? (
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {[profile.branch, profile.year, profile.college].filter(Boolean).join(" • ")}
              </p>
            ) : null}

            {profile.bio ? <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{profile.bio}</p> : null}

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {isOwnProfile ? (
                <Link href="/settings" className="btn btn-primary btn-md">
                  Edit Profile
                </Link>
              ) : (
                <>
                  <button type="button" onClick={toggle} disabled={isToggling} className={`btn btn-md ${isFollowing ? "btn-ghost" : "btn-primary"}`}>
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                  <button type="button" onClick={startConversation} disabled={messaging} className="btn btn-ghost btn-md">
                    {messaging ? "Opening..." : "Message"}
                  </button>
                </>
              )}
            </div>
            {followError ? <p className="mt-2 text-xs text-[var(--color-danger)]">{followError}</p> : null}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-4 gap-2 border-t border-[var(--color-line)] pt-4 text-center">
          <div>
            <p className="text-lg font-black text-[var(--color-ink)]">{postCount}</p>
            <p className="overline">Posts</p>
          </div>
          <div>
            <p className="text-lg font-black text-[var(--color-ink)]">{projectCount}</p>
            <p className="overline">Projects</p>
          </div>
          <button type="button" className="group" onClick={() => alert("Followers list coming soon")}>
            <p className="text-lg font-black text-[var(--color-ink)] group-hover:underline">{followers}</p>
            <p className="overline">Followers</p>
          </button>
          <div>
            <p className="text-lg font-black text-[var(--color-ink)]">{following}</p>
            <p className="overline">Following</p>
          </div>
        </div>
      </section>

      {/* Links + skills */}
      <section className="mt-4 grid gap-4 sm:grid-cols-2">
        {profile.show_links ? (
          <div className="card p-4">
            <h2 className="overline">Links</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {LINK_LABELS.map(({ key, label }) => {
                const value = profile[key] as string | null;
                if (!value) {
                  return null;
                }
                return (
                  <a key={key} href={value} target="_blank" rel="noreferrer noopener" className="chip transition hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]">
                    {label} ↗
                  </a>
                );
              })}
              {LINK_LABELS.every(({ key }) => !profile[key]) ? <p className="text-sm text-[var(--color-faint)]">No links added yet.</p> : null}
            </div>
          </div>
        ) : null}

        <div className="card p-4">
          <h2 className="overline">Skills & Tools</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => (
              <span key={skill} className="chip bg-[var(--color-accent-soft)] text-[var(--color-ink)]">
                {skill}
              </span>
            ))}
            {profile.tools_used.map((tool) => (
              <span key={tool} className="chip">
                {tool}
              </span>
            ))}
            {profile.skills.length === 0 && profile.tools_used.length === 0 ? (
              <p className="text-sm text-[var(--color-faint)]">No skills listed yet.</p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Currently building / looking for */}
      {profile.currently_building || profile.looking_for ? (
        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          {profile.currently_building ? (
            <div className="card p-4">
              <h2 className="overline">Currently building</h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{profile.currently_building}</p>
            </div>
          ) : null}
          {profile.looking_for ? (
            <div className="card p-4">
              <h2 className="overline">Looking for</h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{profile.looking_for}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Content tabs */}
      <section className="mt-6">
        <div className="segmented">
          <button type="button" data-active={activeTab === "posts"} onClick={() => setActiveTab("posts")}>
            Posts
          </button>
          <button type="button" data-active={activeTab === "projects"} onClick={() => setActiveTab("projects")}>
            Projects
          </button>
        </div>

        <div className="mt-4">
          {loadingContent ? (
            <div className="card p-5">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton mt-2 h-4 w-1/2" />
            </div>
          ) : activeTab === "posts" ? (
            posts.length === 0 ? (
              <div className="card p-8 text-center text-sm text-[var(--color-muted)]">
                {isOwnProfile ? "You haven't posted yet." : "No posts yet."}
                {isOwnProfile ? (
                  <Link href="/create/post" className="btn btn-primary btn-md mt-4">
                    Create Post
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )
          ) : projects.length === 0 ? (
            <div className="card p-8 text-center text-sm text-[var(--color-muted)]">
              {isOwnProfile ? "No projects yet. Showcase what you're building." : "No projects yet."}
              {isOwnProfile ? (
                <Link href="/create/project" className="btn btn-primary btn-md mt-4">
                  Create Project
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="card card-hover p-4">
                  <p className="overline">{project.category}</p>
                  <h3 className="mt-1 text-base font-bold text-[var(--color-ink)]">{project.title}</h3>
                  <p className="line-clamp-2 mt-1 text-xs leading-5 text-[var(--color-muted)]">{project.description}</p>
                  <p className="mt-2 text-[11px] text-[var(--color-faint)]">Updated {formatDate(project.updated_at)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
