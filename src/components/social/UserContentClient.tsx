/* eslint-disable react-hooks/set-state-in-effect -- data-loading effects */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PostCard } from "@/components/social/PostCard";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PostWithAuthor, Project } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface UserContentClientProps {
  username: string;
  mode: "posts" | "projects";
}

/**
 * Instagram-style dedicated page listing a student's posts or projects.
 * Accessible from the profile header links.
 */
export function UserContentClient({ username, mode }: UserContentClientProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [profile, setProfile] = useState<{ id: string; full_name: string | null; avatar_url: string | null } | null>(null);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("username", username)
        .maybeSingle();

      if (!active) return;

      if (!profileData) {
        setError("Student not found.");
        setLoading(false);
        return;
      }
      setProfile(profileData);

      if (mode === "posts") {
        const { data: postsData } = await supabase
          .from("posts")
          .select("*, profiles(id, username, full_name, avatar_url), projects(id, title)")
          .eq("author_id", profileData.id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (!active) return;
        setPosts((postsData as unknown as PostWithAuthor[]) ?? []);
      } else {
        const { data: projectsData } = await supabase
          .from("projects")
          .select("*")
          .eq("owner_id", profileData.id)
          .order("updated_at", { ascending: false })
          .limit(50);
        if (!active) return;
        setProjects((projectsData as unknown as Project[]) ?? []);
      }

      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [supabase, username, mode]);

  const label = mode === "posts" ? "Posts" : "Projects";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <Link href={`/u/${username}`} className="text-sm font-bold text-[var(--color-ink)] hover:underline">
        ← @{username}
      </Link>

      <h1 className="section-title mt-3 text-2xl font-black tracking-tight">{label}</h1>

      {loading ? (
        <div className="mt-5 space-y-4">
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-20 w-full" />
        </div>
      ) : error ? (
        <div className="card mt-5 p-6 text-center text-sm text-[var(--color-muted)]">{error}</div>
      ) : mode === "posts" ? (
        posts.length === 0 ? (
          <div className="card mt-5 p-8 text-center">
            <p className="text-sm font-semibold text-[var(--color-ink)]">No posts yet.</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">Start sharing what you&apos;re building.</p>
            <Link href="/create/post" className="btn btn-primary btn-md mt-4">
              Create Post
            </Link>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )
      ) : projects.length === 0 ? (
        <div className="card mt-5 p-8 text-center">
          <p className="text-sm font-semibold text-[var(--color-ink)]">No projects yet.</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Build something and showcase it here.</p>
          <Link href="/create/project" className="btn btn-primary btn-md mt-4">
            Create Project
          </Link>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="card card-hover p-4">
              <p className="overline">{project.category ?? "Project"}</p>
              <h3 className="mt-1 text-base font-bold text-[var(--color-ink)]">{project.title}</h3>
              <p className="line-clamp-2 mt-1 text-xs leading-5 text-[var(--color-muted)]">{project.description ?? ""}</p>
              <p className="mt-2 text-[11px] text-[var(--color-faint)]">Updated {formatDate(project.updated_at)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
