/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, FileEdit, GraduationCap, Rocket, Wrench, type LucideIcon } from "lucide-react";
import { CategoryDropdown } from "@/components/explore/CategoryDropdown";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { TOOL_CATEGORIES, RESOURCE_CATEGORIES } from "@/lib/constants";
import { PROJECT_CATEGORIES } from "@/lib/social-utils";
import type { ProjectWithOwner, SocialProfile, ToolWithStats } from "@/lib/types";
import { FREE_TYPE_LABELS } from "@/lib/constants";
import { formatDate, getInitials } from "@/lib/utils";

type SearchTab = "students" | "projects" | "posts" | "tools" | "resources";

interface PostResult {
  id: string;
  content: string;
  post_type: string;
  created_at: string;
  profiles: { id: string; username: string | null; full_name: string | null } | null;
}

interface ResourceResult {
  id: string;
  name: string;
  url: string;
  category: string;
  short_description: string;
  free_details: string;
}

const SKILL_CHIPS = ["Python", "React", "AI/ML", "JavaScript", "Java", "Node.js", "Flutter", "C++", "SQL", "Git"];

const TAB_CATEGORIES: Record<SearchTab, string[]> = {
  students: SKILL_CHIPS,
  projects: PROJECT_CATEGORIES,
  posts: [],
  tools: [...TOOL_CATEGORIES],
  resources: [...RESOURCE_CATEGORIES],
};

const TAB_PLACEHOLDERS: Record<SearchTab, string> = {
  students: "Search by name, @username, branch, or skill...",
  projects: "Search projects by title or technology...",
  posts: "Search posts by keyword...",
  tools: "Search tools by name or tag...",
  resources: "Search resources...",
};

export function ExploreClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("tools");
  const [category, setCategory] = useState("All");

  const [students, setStudents] = useState<SocialProfile[]>([]);
  const [projects, setProjects] = useState<ProjectWithOwner[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [tools, setTools] = useState<ToolWithStats[]>([]);
  const [resources, setResources] = useState<ResourceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const isSearchMode = debouncedQuery.length >= 2;

  // Reset category when switching tabs
  function switchTab(tab: SearchTab) {
    setActiveTab(tab);
    setCategory("All");
  }

  const browse = useCallback(
    async (tab: SearchTab, selectedCategory: string) => {
      setIsSearching(true);

      if (tab === "tools") {
        let q = supabase.from("tools").select("*").eq("status", "published").order("avg_rating", { ascending: false }).limit(18);
        if (selectedCategory !== "All") {
          q = q.eq("category", selectedCategory);
        }
        const { data } = await q;
        setTools((data as ToolWithStats[]) ?? []);
      } else if (tab === "resources") {
        let q = supabase.from("platform_resources").select("*").order("created_at", { ascending: false }).limit(18);
        if (selectedCategory !== "All") {
          q = q.eq("category", selectedCategory);
        }
        const { data } = await q;
        setResources((data as ResourceResult[]) ?? []);
      } else if (tab === "projects") {
        let q = supabase
          .from("projects")
          .select("*, profiles(id, username, full_name, avatar_url)")
          .eq("review_status", "approved")
          .order("created_at", { ascending: false })
          .limit(18);
        if (selectedCategory !== "All") {
          q = q.eq("category", selectedCategory);
        }
        const { data } = await q;
        setProjects(((data ?? []) as unknown) as ProjectWithOwner[]);
      } else if (tab === "students") {
        let q = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(18);
        if (selectedCategory !== "All") {
          q = q.contains("skills", [selectedCategory]);
        }
        const { data } = await q;
        setStudents((data as SocialProfile[]) ?? []);
      } else if (tab === "posts") {
        const { data } = await supabase
          .from("posts")
          .select("id, content, post_type, created_at, profiles(id, username, full_name)")
          .order("created_at", { ascending: false })
          .limit(18);
        setPosts(((data ?? []) as unknown) as PostResult[]);
      }

      setIsSearching(false);
    },
    [supabase]
  );

  // Browse mode: load content on tab / category change
  useEffect(() => {
    if (!isSearchMode) {
      setHasSearched(false);
      void browse(activeTab, category);
    }
  }, [browse, activeTab, category, isSearchMode]);

  // Search mode
  useEffect(() => {
    let mounted = true;

    async function search() {
      if (!isSearchMode) {
        return;
      }

      setIsSearching(true);
      const term = `%${debouncedQuery}%`;

      const [studentsRes, projectsRes, postsRes, toolsRes, resourcesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .or(`username.ilike.${term},full_name.ilike.${term},branch.ilike.${term},college.ilike.${term},skills.cs.{${debouncedQuery}},tools_used.cs.{${debouncedQuery}},interests.cs.{${debouncedQuery}}`)
          .limit(12),
        supabase
          .from("projects")
          .select("*")
          .eq("review_status", "approved")
          .or(`title.ilike.${term},description.ilike.${term},technologies.cs.{${debouncedQuery}}`)
          .limit(12),
        supabase
          .from("posts")
          .select("id, content, post_type, created_at, profiles(id, username, full_name)")
          .ilike("content", term)
          .limit(12),
        supabase
          .from("tools")
          .select("*")
          .eq("status", "published")
          .or(`name.ilike.${term},category.ilike.${term},short_description.ilike.${term},tags.cs.{${debouncedQuery}}`)
          .limit(12),
        supabase
          .from("platform_resources")
          .select("*")
          .or(`name.ilike.${term},category.ilike.${term},short_description.ilike.${term}`)
          .limit(12),
      ]);

      if (!mounted) {
        return;
      }

      setStudents((studentsRes.data as SocialProfile[]) ?? []);
      setProjects((projectsRes.data as ProjectWithOwner[]) ?? []);
      setPosts(((postsRes.data ?? []) as unknown) as PostResult[]);
      setTools((toolsRes.data as ToolWithStats[]) ?? []);
      setResources((resourcesRes.data as ResourceResult[]) ?? []);
      setHasSearched(true);
      setIsSearching(false);
    }

    void search();

    return () => {
      mounted = false;
    };
  }, [supabase, debouncedQuery, isSearchMode]);

  const tabs: { key: SearchTab; label: string; Icon: LucideIcon; count: number }[] = useMemo(
    () => [
      { key: "tools", label: "Tools", Icon: Wrench, count: tools.length },
      { key: "resources", label: "Resources", Icon: BookOpen, count: resources.length },
      { key: "projects", label: "Projects", Icon: Rocket, count: projects.length },
      { key: "students", label: "Students", Icon: GraduationCap, count: students.length },
      { key: "posts", label: "Posts", Icon: FileEdit, count: posts.length },
    ],
    [tools.length, resources.length, projects.length, students.length, posts.length]
  );

  const categories = TAB_CATEGORIES[activeTab];

  return (
    <div className="container-app max-w-4xl py-8">
      <h1 className="section-title text-3xl font-black tracking-tight">Explore</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Browse by category or search for anything across the community.
      </p>

      {/* Search */}
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={TAB_PLACEHOLDERS[activeTab]}
        className="field mt-5"
        aria-label="Search the community"
      />

        {/* Sticky search + tabs block (Instagram search-style) */}
        <div className="sticky top-14 z-30 -mx-4 bg-[var(--color-paper)] px-4 pb-2 pt-1 md:mx-0 md:rounded-b-2xl md:px-0">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={activeTab === "students" ? "Search by name, @username, branch, or skill..." : `Search ${activeTab}...`}
        className="field"
        aria-label="Search the community"
      />
      <div className="-mx-4 mt-4 overflow-x-auto px-4 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2 md:w-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => switchTab(tab.key)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${
                activeTab === tab.key
                  ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
                  : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              <tab.Icon aria-hidden="true" className="mr-1 inline h-4 w-4" />
              {tab.label}
              {!isSearchMode ? "" : ` (${tab.count})`}
            </button>
          ))}
        </div>
      </div>
        </div>

      {/* Category dropdown (browse mode) */}            {!isSearchMode && categories.length > 0 ? (
            <div className="mt-2 pb-1">
              <CategoryDropdown
                label={activeTab === "students" ? "Skill" : activeTab === "tools" ? "Category" : activeTab === "resources" ? "Type" : activeTab === "projects" ? "Field" : "Category"}
                categories={categories}
                value={category}
            onChange={setCategory}
          />
        </div>
      ) : null}

      {isSearching ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="card p-4">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton mt-2 h-4 w-2/3" />
              <div className="skeleton mt-2 h-3 w-full" />
            </div>
          ))}
        </div>
      ) : null}

      {/* ============ TOOLS ============ */}
      {!isSearching && activeTab === "tools" && tools.length > 0 ? (
        <div className="stagger-fade mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Link key={tool.id} href={`/tools/${tool.slug}`} className="card card-hover flex flex-col p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="overline">{tool.category}</p>
                <span className="pill pill-accent">{FREE_TYPE_LABELS[tool.free_type]}</span>
              </div>
              <h3 className="mt-1.5 text-base font-bold text-[var(--color-ink)]">{tool.name}</h3>
              <p className="line-clamp-2 mt-1 flex-1 text-xs leading-5 text-[var(--color-muted)]">{tool.short_description}</p>
              <p className="mt-3 border-t border-[var(--color-line)] pt-2 text-xs font-semibold text-[var(--color-ink)]">
                ★ {tool.avg_rating.toFixed(1)} <span className="font-normal text-[var(--color-faint)]">({tool.review_count})</span>
              </p>
            </Link>
          ))}
        </div>
      ) : null}

      {/* ============ RESOURCES ============ */}
      {!isSearching && activeTab === "resources" && resources.length > 0 ? (
        <div className="stagger-fade mt-4 grid gap-3 sm:grid-cols-2">
          {resources.map((resource) => (
            <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer noopener" className="card card-hover flex flex-col p-4">
              <p className="overline">{resource.category}</p>
              <h3 className="mt-1.5 text-base font-bold text-[var(--color-ink)]">{resource.name}</h3>
              <p className="line-clamp-2 mt-1 flex-1 text-xs leading-5 text-[var(--color-muted)]">{resource.short_description}</p>
              <p className="mt-3 border-t border-[var(--color-line)] pt-2 text-xs font-semibold text-[var(--color-ink)]">{resource.free_details}</p>
            </a>
          ))}
        </div>
      ) : null}

      {/* ============ PROJECTS ============ */}
      {!isSearching && activeTab === "projects" && projects.length > 0 ? (
        <div className="stagger-fade mt-4 grid gap-3 sm:grid-cols-2">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="card card-hover flex flex-col p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="overline">{project.category}</p>
                <span className="pill pill-neutral">{project.status}</span>
              </div>
              <h3 className="mt-1.5 text-base font-bold text-[var(--color-ink)]">{project.title}</h3>
              <p className="line-clamp-2 mt-1 flex-1 text-xs leading-5 text-[var(--color-muted)]">{project.description ?? ""}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {project.technologies.slice(0, 4).map((tech) => (
                  <span key={tech} className="chip px-2 py-0.5 text-[10px]">{tech}</span>
                ))}
              </div>
              <p className="mt-3 border-t border-[var(--color-line)] pt-2 text-xs text-[var(--color-muted)]">
                by {project.profiles?.full_name || "Student"} · {formatDate(project.created_at)}
              </p>
            </Link>
          ))}
        </div>
      ) : null}

      {/* ============ STUDENTS ============ */}
      {!isSearching && activeTab === "students" && students.length > 0 ? (
        <div className="stagger-fade mt-4 grid gap-2 sm:grid-cols-2">
          {students.map((student) => (
            <Link key={student.id} href={student.username ? `/u/${student.username}` : "#"} className="card card-hover flex items-center gap-3 p-3.5">
              {student.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={student.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-ink)] text-sm font-black text-[var(--color-paper)]">
                  {getInitials(student.full_name || "U")}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[var(--color-ink)]">{student.full_name || "Student"}</p>
                {student.username ? <p className="truncate text-xs text-[var(--color-faint)]">@{student.username}</p> : null}
                {student.branch || student.year ? (
                  <p className="truncate text-[11px] text-[var(--color-muted)]">{[student.branch, student.year].filter(Boolean).join(" • ")}</p>
                ) : null}
              </div>
              {student.skills.length > 0 ? (
                <div className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
                  {student.skills.slice(0, 2).map((skill) => (
                    <span key={skill} className="chip px-2 py-0.5 text-[10px]">{skill}</span>
                  ))}
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      ) : null}

      {/* ============ POSTS ============ */}
      {!isSearching && activeTab === "posts" && posts.length > 0 ? (
        <div className="stagger-fade mt-4 space-y-2">
          {posts.map((post) => (
            <Link key={post.id} href={`/post/${post.id}`} className="card card-hover block p-4">
              <p className="text-xs font-semibold text-[var(--color-faint)]">
                {post.profiles?.full_name || "Student"} · {post.post_type.replace(/_/g, " ")} · {formatDate(post.created_at)}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">{post.content}</p>
            </Link>
          ))}
        </div>
      ) : null}

      {/* Empty states per tab */}
      {!isSearching && !isSearching && categories.length >= 0 ? (
        <>
          {activeTab === "tools" && tools.length === 0 ? (
            <p className="card mt-4 p-8 text-center text-sm text-[var(--color-muted)]">
              No tools in {category === "All" ? "the catalog" : category} yet.
            </p>
          ) : null}
          {activeTab === "resources" && resources.length === 0 ? (
            <p className="card mt-4 p-8 text-center text-sm text-[var(--color-muted)]">
              No resources in {category === "All" ? "the catalog" : category} yet.
            </p>
          ) : null}
          {activeTab === "projects" && projects.length === 0 ? (
            <p className="card mt-4 p-8 text-center text-sm text-[var(--color-muted)]">
              No projects in {category === "All" ? "the community" : category} yet.
            </p>
          ) : null}
          {activeTab === "students" && students.length === 0 ? (
            <p className="card mt-4 p-8 text-center text-sm text-[var(--color-muted)]">
              No students{category === "All" ? "" : ` with ${category}`} found yet.
            </p>
          ) : null}
          {activeTab === "posts" && posts.length === 0 ? (
            <p className="card mt-4 p-8 text-center text-sm text-[var(--color-muted)]">No posts yet.</p>
          ) : null}
        </>
      ) : null}

      {/* Search-mode empty states */}
      {hasSearched && !isSearching && isSearchMode ? (
        <>
          {activeTab === "tools" && tools.length === 0 ? (
            <p className="card mt-4 p-8 text-center text-sm text-[var(--color-muted)]">No tools match &quot;{debouncedQuery}&quot;.</p>
          ) : null}
          {activeTab === "resources" && resources.length === 0 ? (
            <p className="card mt-4 p-8 text-center text-sm text-[var(--color-muted)]">No resources match &quot;{debouncedQuery}&quot;.</p>
          ) : null}
          {activeTab === "projects" && projects.length === 0 ? (
            <p className="card mt-4 p-8 text-center text-sm text-[var(--color-muted)]">No projects match &quot;{debouncedQuery}&quot;.</p>
          ) : null}
          {activeTab === "students" && students.length === 0 ? (
            <p className="card mt-4 p-8 text-center text-sm text-[var(--color-muted)]">No students match &quot;{debouncedQuery}&quot;.</p>
          ) : null}
          {activeTab === "posts" && posts.length === 0 ? (
            <p className="card mt-4 p-8 text-center text-sm text-[var(--color-muted)]">No posts match &quot;{debouncedQuery}&quot;.</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
