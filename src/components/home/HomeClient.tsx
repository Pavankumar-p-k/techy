"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ToolCard } from "@/components/tools/ToolCard";
import { useAuthUser } from "@/hooks/useAuthUser";
import { FREE_TYPE_LABELS } from "@/lib/constants";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Database, FreeType } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type Tool = Database["public"]["Tables"]["tools"]["Row"];
type Resource = Database["public"]["Tables"]["platform_resources"]["Row"];
type ToolSortOption = "latest_updated" | "most_reviewed" | "top_rated" | "most_clicked" | "newest";
type ResourceSortOption = "latest" | "name";
type ViewMode = "tools" | "resources";

const PAGE_SIZE = 10;
const FREE_TYPES: FreeType[] = ["free_forever", "freemium", "trial", "open_source", "student_plan"];

export function HomeClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { user } = useAuthUser();
  const [tools, setTools] = useState<Tool[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [bookmarkCount, setBookmarkCount] = useState(0);

  const [viewMode, setViewMode] = useState<ViewMode>("tools");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const [toolSearch, setToolSearch] = useState("");
  const [toolCategory, setToolCategory] = useState("all");
  const [freeType, setFreeType] = useState("all");
  const [toolSortBy, setToolSortBy] = useState<ToolSortOption>("latest_updated");
  const [toolPage, setToolPage] = useState(1);

  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceCategory, setResourceCategory] = useState("all");
  const [resourceSortBy, setResourceSortBy] = useState<ResourceSortOption>("latest");
  const [resourcePage, setResourcePage] = useState(1);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!isSupabaseConfigured) {
        if (mounted) {
          setError("Supabase is not configured. Add values in .env.local and restart the app.");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      const [toolsRes, resourcesRes] = await Promise.all([
        supabase
          .from("tools")
          .select("*")
          .eq("status", "published")
          .order("updated_at", { ascending: false })
          .order("review_count", { ascending: false }),
        supabase.from("platform_resources").select("*").order("created_at", { ascending: false }),
      ]);

      if (!mounted) {
        return;
      }

      if (toolsRes.error || resourcesRes.error) {
        setError(toolsRes.error?.message ?? resourcesRes.error?.message ?? "Failed to load data.");
      } else {
        setTools(toolsRes.data ?? []);
        setResources(resourcesRes.data ?? []);
        setLastSyncedAt(new Date());
      }

      setLoading(false);
    }

    void loadData();

    if (!isSupabaseConfigured) {
      return () => {
        mounted = false;
      };
    }

    const channel = supabase
      .channel("hub-live-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "tools" }, () => {
        void loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_resources" }, () => {
        void loadData();
      })
      .subscribe();

    const periodicRefresh = setInterval(() => {
      void loadData();
    }, 2 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(periodicRefresh);
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    async function loadBookmarkCount() {
      if (!user) {
        setBookmarkCount(0);
        return;
      }

      const { count } = await supabase.from("tool_bookmarks").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      setBookmarkCount(count ?? 0);
    }

    void loadBookmarkCount();
  }, [supabase, user]);

  const toolCategoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of tools) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return counts;
  }, [tools]);

  const resourceCategoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of resources) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return counts;
  }, [resources]);

  const toolCategories = useMemo(() => {
    return Array.from(new Set(tools.map((item) => item.category))).sort((a, b) => a.localeCompare(b));
  }, [tools]);

  const resourceCategories = useMemo(() => {
    return Array.from(new Set(resources.map((item) => item.category))).sort((a, b) => a.localeCompare(b));
  }, [resources]);

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchSearch =
        tool.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
        tool.short_description.toLowerCase().includes(toolSearch.toLowerCase()) ||
        tool.tags.some((tag) => tag.toLowerCase().includes(toolSearch.toLowerCase()));

      const matchCategory = toolCategory === "all" || tool.category === toolCategory;
      const matchFreeType = freeType === "all" || tool.free_type === freeType;

      return matchSearch && matchCategory && matchFreeType;
    });
  }, [freeType, toolCategory, toolSearch, tools]);

  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      const matchSearch =
        resource.name.toLowerCase().includes(resourceSearch.toLowerCase()) ||
        resource.short_description.toLowerCase().includes(resourceSearch.toLowerCase());
      const matchCategory = resourceCategory === "all" || resource.category === resourceCategory;
      return matchSearch && matchCategory;
    });
  }, [resourceCategory, resourceSearch, resources]);

  const sortedTools = useMemo(() => {
    const copy = [...filteredTools];

    copy.sort((a, b) => {
      if (toolSortBy === "latest_updated") {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime() || b.review_count - a.review_count;
      }

      if (toolSortBy === "top_rated") {
        return b.avg_rating - a.avg_rating || b.review_count - a.review_count || a.name.localeCompare(b.name);
      }

      if (toolSortBy === "most_clicked") {
        return b.click_count - a.click_count || b.review_count - a.review_count || a.name.localeCompare(b.name);
      }

      if (toolSortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || a.name.localeCompare(b.name);
      }

      return b.review_count - a.review_count || b.avg_rating - a.avg_rating || a.name.localeCompare(b.name);
    });

    return copy;
  }, [filteredTools, toolSortBy]);

  const sortedResources = useMemo(() => {
    const copy = [...filteredResources];
    copy.sort((a, b) => {
      if (resourceSortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || a.name.localeCompare(b.name);
    });
    return copy;
  }, [filteredResources, resourceSortBy]);

  const totalToolPages = useMemo(() => Math.max(1, Math.ceil(sortedTools.length / PAGE_SIZE)), [sortedTools.length]);
  const currentToolPage = Math.min(toolPage, totalToolPages);
  const paginatedTools = useMemo(() => {
    const start = (currentToolPage - 1) * PAGE_SIZE;
    return sortedTools.slice(start, start + PAGE_SIZE);
  }, [currentToolPage, sortedTools]);

  const totalResourcePages = useMemo(() => Math.max(1, Math.ceil(sortedResources.length / PAGE_SIZE)), [sortedResources.length]);
  const currentResourcePage = Math.min(resourcePage, totalResourcePages);
  const paginatedResources = useMemo(() => {
    const start = (currentResourcePage - 1) * PAGE_SIZE;
    return sortedResources.slice(start, start + PAGE_SIZE);
  }, [currentResourcePage, sortedResources]);

  const isToolsView = viewMode === "tools";
  const activeCount = isToolsView ? sortedTools.length : sortedResources.length;
  const activePageCount = isToolsView ? paginatedTools.length : paginatedResources.length;

  return (
    <>
      <section className="hero-pattern border-b border-[var(--color-line)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            <span className="live-dot h-2 w-2 rounded-full bg-[var(--color-accent)]" />
            Daily refreshed catalog
          </p>
          <h1 className="section-title max-w-4xl text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">Find what you need faster.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--color-muted)] sm:text-base sm:leading-7">
            Use the top menu to switch between tools and student resources, then filter only what you need.
          </p>
          <div className="stagger-fade mt-6 grid max-w-xl grid-cols-4 gap-2 sm:gap-3">
            <StatCard label="Tools" value={tools.length.toString()} />
            <StatCard label="Resources" value={resources.length.toString()} />
            <StatCard label="Categories" value={(toolCategories.length + resourceCategories.length).toString()} />
            <StatCard label="Bookmarks" value={bookmarkCount.toString()} />
          </div>
        </div>
      </section>

      <section className="sticky top-[72px] z-20 border-b border-[var(--color-line)] bg-[var(--color-paper)]/94 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 md:px-6">
          <div className="inline-flex w-fit rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] p-1">
            <button
              type="button"
              onClick={() => {
                setViewMode("tools");
                setIsMobileFiltersOpen(false);
              }}
              className={`rounded-full px-4 py-2 text-xs font-semibold sm:text-sm ${
                isToolsView ? "bg-[var(--color-ink)] text-[var(--color-paper)]" : "text-[var(--color-muted)]"
              }`}
            >
              Tools
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("resources");
                setIsMobileFiltersOpen(false);
              }}
              className={`rounded-full px-4 py-2 text-xs font-semibold sm:text-sm ${
                !isToolsView ? "bg-[var(--color-ink)] text-[var(--color-paper)]" : "text-[var(--color-muted)]"
              }`}
            >
              Student Resources
            </button>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="w-full text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)] md:max-w-2xl">
              {isToolsView ? "Search tools" : "Search resources"}
              <input
                value={isToolsView ? toolSearch : resourceSearch}
                onChange={(event) => {
                  if (isToolsView) {
                    setToolSearch(event.target.value);
                    setToolPage(1);
                  } else {
                    setResourceSearch(event.target.value);
                    setResourcePage(1);
                  }
                }}
                placeholder={isToolsView ? "Try: coding, design, api..." : "Try: internships, docs, practice..."}
                className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)]"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)] sm:text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5">
                <span className="live-dot h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                Live updates
              </span>
              {lastSyncedAt ? (
                <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5">
                  Synced: {formatDate(lastSyncedAt.toISOString())}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen((current) => !current)}
            className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
          >
            {isMobileFiltersOpen ? "Hide filters" : "Show filters"}
          </button>
          <p className="text-sm text-[var(--color-muted)]">{activeCount} results</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className={`${isMobileFiltersOpen ? "block" : "hidden"} space-y-4 lg:block`}>
            <section className="premium-panel rounded-2xl p-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--color-ink)]">Filters</h2>

              {isToolsView ? (
                <>
                  <label className="mt-3 block text-sm text-[var(--color-muted)]">
                    Free model
                    <select
                      value={freeType}
                      onChange={(event) => {
                        setFreeType(event.target.value);
                        setToolPage(1);
                      }}
                      className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)]"
                    >
                      <option value="all">All free models</option>
                      {FREE_TYPES.map((item) => (
                        <option key={item} value={item}>
                          {FREE_TYPE_LABELS[item]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="mt-3 block text-sm text-[var(--color-muted)]">
                    Sort by
                    <select
                      value={toolSortBy}
                      onChange={(event) => {
                        setToolSortBy(event.target.value as ToolSortOption);
                        setToolPage(1);
                      }}
                      className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)]"
                    >
                      <option value="latest_updated">Latest updates</option>
                      <option value="most_reviewed">Most reviewed</option>
                      <option value="top_rated">Top rated</option>
                      <option value="most_clicked">Most clicked</option>
                      <option value="newest">Newest added</option>
                    </select>
                  </label>
                </>
              ) : (
                <label className="mt-3 block text-sm text-[var(--color-muted)]">
                  Sort by
                  <select
                    value={resourceSortBy}
                    onChange={(event) => {
                      setResourceSortBy(event.target.value as ResourceSortOption);
                      setResourcePage(1);
                    }}
                    className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)]"
                  >
                    <option value="latest">Latest added</option>
                    <option value="name">Name A-Z</option>
                  </select>
                </label>
              )}
            </section>

            <section id="categories" className="premium-panel rounded-2xl p-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--color-ink)]">Categories</h2>
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isToolsView) {
                      setToolCategory("all");
                      setToolPage(1);
                    } else {
                      setResourceCategory("all");
                      setResourcePage(1);
                    }
                  }}
                  className={`interactive-lift rounded-xl border px-3 py-2 text-left text-sm ${
                    (isToolsView ? toolCategory : resourceCategory) === "all"
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                      : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]"
                  }`}
                >
                  All categories ({isToolsView ? tools.length : resources.length})
                </button>

                {(isToolsView ? toolCategories : resourceCategories).map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => {
                      if (isToolsView) {
                        setToolCategory(item);
                        setToolPage(1);
                      } else {
                        setResourceCategory(item);
                        setResourcePage(1);
                      }
                    }}
                    className={`interactive-lift rounded-xl border px-3 py-2 text-left text-sm ${
                      (isToolsView ? toolCategory : resourceCategory) === item
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                        : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]"
                    }`}
                  >
                    {item} ({isToolsView ? toolCategoryCounts.get(item) ?? 0 : resourceCategoryCounts.get(item) ?? 0})
                  </button>
                ))}
              </div>
            </section>

            <section className="premium-panel rounded-2xl p-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--color-ink)]">Bookmarks</h2>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{user ? `You saved ${bookmarkCount} tools.` : "Login to save tools."}</p>
              <Link
                href={user ? "/bookmarks" : "/login?next=/bookmarks"}
                className="mt-3 inline-flex rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-[var(--color-paper)] transition hover:bg-[var(--color-accent)]"
              >
                Open bookmarks
              </Link>
            </section>
          </aside>

          <div>
            <div className="premium-panel mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl p-3 sm:p-4">
              <p className="text-sm text-[var(--color-muted)]">
                Showing {activePageCount} of {activeCount} {isToolsView ? "tools" : "resources"}
              </p>
            </div>

            {loading ? <p className="mt-6 text-sm text-[var(--color-muted)]">Loading...</p> : null}
            {error ? <p className="mt-6 rounded-xl bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">{error}</p> : null}

            {!loading && !error ? (
              <>
                {isToolsView ? (
                  <div className="stagger-fade mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
                    {sortedTools.length > 0 ? (
                      paginatedTools.map((tool) => <ToolCard key={tool.id} tool={tool} />)
                    ) : (
                      <div className="col-span-2 rounded-xl border border-dashed border-[var(--color-line)] p-4 text-sm text-[var(--color-muted)] lg:col-span-3">
                        {tools.length === 0 ? (
                          <>
                            <p>No published tools found.</p>
                            <p className="mt-1 text-xs">Run `supabase/seed.sql`, then refresh this page.</p>
                          </>
                        ) : (
                          <p>No tools match this filter.</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="stagger-fade mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
                    {sortedResources.length > 0 ? (
                      paginatedResources.map((resource) => (
                        <a
                          key={resource.id}
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="interactive-lift rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3"
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">{resource.category}</p>
                          <h3 className="mt-1 text-sm font-bold text-[var(--color-ink)] sm:text-base">{resource.name}</h3>
                          <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)] sm:text-sm">{resource.short_description}</p>
                          <p className="mt-2 text-[11px] font-semibold text-[var(--color-accent)]">{resource.free_details}</p>
                        </a>
                      ))
                    ) : (
                      <p className="col-span-2 rounded-xl border border-dashed border-[var(--color-line)] p-4 text-sm text-[var(--color-muted)] lg:col-span-3">
                        No resources match this filter.
                      </p>
                    )}
                  </div>
                )}

                {isToolsView && sortedTools.length > 0 && totalToolPages > 1 ? (
                  <Pager
                    currentPage={currentToolPage}
                    totalPages={totalToolPages}
                    onPrev={() => setToolPage((current) => Math.max(1, Math.min(current, totalToolPages) - 1))}
                    onNext={() => setToolPage((current) => Math.min(totalToolPages, Math.min(current, totalToolPages) + 1))}
                  />
                ) : null}

                {!isToolsView && sortedResources.length > 0 && totalResourcePages > 1 ? (
                  <Pager
                    currentPage={currentResourcePage}
                    totalPages={totalResourcePages}
                    onPrev={() => setResourcePage((current) => Math.max(1, Math.min(current, totalResourcePages) - 1))}
                    onNext={() => setResourcePage((current) => Math.min(totalResourcePages, Math.min(current, totalResourcePages) + 1))}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="interactive-lift rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-3">
      <p className="text-lg font-black text-[var(--color-ink)] sm:text-xl">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] sm:text-xs">{label}</p>
    </div>
  );
}

function Pager({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={onPrev}
        disabled={currentPage === 1}
        className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-45"
      >
        Previous
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage === totalPages}
        className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-45"
      >
        Next
      </button>
    </div>
  );
}
