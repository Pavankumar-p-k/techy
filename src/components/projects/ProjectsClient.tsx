"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CategoryDropdown } from "@/components/explore/CategoryDropdown";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ProjectWithOwner } from "@/lib/types";
import { PROJECT_STATUS_BADGES } from "@/lib/social-utils";
import { formatDate, getInitials } from "@/lib/utils";

const CATEGORIES = ["All", "AI", "Web", "Mobile", "IoT", "Research", "Other"];
const PAGE_SIZE = 12;

export function ProjectsClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { user } = useAuthUser();
  const [projects, setProjects] = useState<ProjectWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("projects")
        .select("*, profiles(id, username, full_name, avatar_url)")
        .eq("review_status", "approved")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (category !== "All") {
        query = query.eq("category", category);
      }

      const { data, error: projectsError } = await query;

      if (!mounted) {
        return;
      }

      if (projectsError) {
        setError(projectsError.message);
      } else {
        const loaded = (data as unknown as ProjectWithOwner[]) ?? [];
        setProjects((current) => (page === 0 ? loaded : [...current, ...loaded]));
        setHasMore(loaded.length === PAGE_SIZE);
      }

      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [supabase, category, page]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) {
      return projects;
    }
    return projects.filter(
      (project) =>
        project.title.toLowerCase().includes(term) ||
        (project.description ?? "").toLowerCase().includes(term) ||
        project.technologies.some((tech) => tech.toLowerCase().includes(term))
    );
  }, [projects, search]);

  return (
    <div className="container-app py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="section-title text-3xl font-black tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Discover what students are building.</p>
        </div>
        {user ? (
          <Link href="/create/project" className="btn btn-primary btn-md">
            + New Project
          </Link>
        ) : null}
      </div>

      {/* Search + category dropdown */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search projects, tech, keywords..."
          className="field flex-1"
          aria-label="Search projects"
        />
        <CategoryDropdown label="Field" categories={CATEGORIES.filter((item) => item !== "All")} value={category} onChange={(value) => { setCategory(value); setPage(0); }} />
      </div>

      {error ? (
        <div className="mt-5 rounded-xl border border-[var(--color-line)] bg-[var(--color-danger-soft)] p-4 text-sm text-[var(--color-danger)]">{error}</div>
      ) : null}

      {loading && projects.length === 0 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="card p-4">
              <div className="skeleton h-32 w-full" />
              <div className="skeleton mt-3 h-4 w-2/3" />
              <div className="skeleton mt-2 h-3 w-full" />
            </div>
          ))}
        </div>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="text-3xl" aria-hidden="true">🚀</p>
          <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">No projects yet.</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Build something and showcase it here.</p>
          {user ? (
            <Link href="/create/project" className="btn btn-primary btn-md mt-5">
              Create Project
            </Link>
          ) : null}
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <div className="stagger-fade mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="card card-hover flex flex-col overflow-hidden">
              <div className="grid h-32 place-items-center border-b border-[var(--color-line)] bg-gradient-to-br from-[var(--color-surface-2)] to-[var(--color-accent-soft)]">
                {project.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={project.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-2xl font-black text-[var(--color-faint)]">{"</>"}</span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="overline">{project.category}</p>
                  <span className={`pill ${PROJECT_STATUS_BADGES[project.status]}`}>{project.status}</span>
                </div>
                <h3 className="mt-1 text-base font-bold text-[var(--color-ink)]">{project.title}</h3>
                <p className="line-clamp-2 mt-1 flex-1 text-xs leading-5 text-[var(--color-muted)]">{project.description ?? ""}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.technologies.slice(0, 3).map((tech) => (
                    <span key={tech} className="chip px-2 py-0.5 text-[10px]">
                      {tech}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-[var(--color-line)] pt-3">
                  {project.profiles?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={project.profiles.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-surface-2)] text-[9px] font-black text-[var(--color-ink)]">
                      {getInitials(project.profiles?.full_name || "U")}
                    </span>
                  )}
                  <span className="text-xs text-[var(--color-muted)]">{project.profiles?.full_name || "Student"}</span>
                  <span className="ml-auto text-[11px] text-[var(--color-faint)]">{formatDate(project.created_at)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {hasMore && !loading ? (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            className="btn btn-ghost btn-md"
          >
            Load more
          </button>
        </div>
      ) : null}
    </div>
  );
}
