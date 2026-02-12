"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolCard } from "@/components/tools/ToolCard";
import { ToolFilters } from "@/components/tools/ToolFilters";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Database } from "@/lib/types";

type Tool = Database["public"]["Tables"]["tools"]["Row"];
type Resource = Database["public"]["Tables"]["platform_resources"]["Row"];

export function HomeClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [tools, setTools] = useState<Tool[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [freeType, setFreeType] = useState("all");

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
          .order("review_count", { ascending: false })
          .order("created_at", { ascending: false }),
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
      .channel("tools-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "tools" }, () => {
        void loadData();
      })
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  const categories = useMemo(() => {
    return Array.from(new Set(tools.map((item) => item.category))).sort((a, b) => a.localeCompare(b));
  }, [tools]);

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchSearch =
        tool.name.toLowerCase().includes(search.toLowerCase()) ||
        tool.short_description.toLowerCase().includes(search.toLowerCase()) ||
        tool.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));

      const matchCategory = category === "all" || tool.category === category;
      const matchFreeType = freeType === "all" || tool.free_type === freeType;

      return matchSearch && matchCategory && matchFreeType;
    });
  }, [category, freeType, search, tools]);

  return (
    <>
      <section className="hero-pattern border-b border-[var(--color-line)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <p className="mb-4 inline-flex rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Student-first platform
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-[var(--color-ink)] md:text-6xl">
            Free AI and online tools, explained clearly for students.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--color-muted)] md:text-lg">
            Discover coding assistants, writing tools, design platforms, and useful non-AI websites. See what is actually free,
            how limits work, and community ratings from real users.
          </p>
          <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Tools" value={tools.length.toString()} />
            <StatCard label="Resources" value={resources.length.toString()} />
            <StatCard label="Categories" value={categories.length.toString()} />
            <StatCard label="No Ads" value="100%" />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <ToolFilters
          search={search}
          category={category}
          freeType={freeType}
          categories={categories}
          onSearchChange={setSearch}
          onCategoryChange={setCategory}
          onFreeTypeChange={setFreeType}
        />

        {loading ? <p className="mt-6 text-sm text-[var(--color-muted)]">Loading tools...</p> : null}
        {error ? <p className="mt-6 rounded-xl bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">{error}</p> : null}

        {!loading && !error ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredTools.length > 0 ? (
              filteredTools.map((tool) => <ToolCard key={tool.id} tool={tool} />)
            ) : (
              <p className="rounded-xl border border-dashed border-[var(--color-line)] p-4 text-sm text-[var(--color-muted)]">
                No tools match this filter.
              </p>
            )}
          </div>
        ) : null}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 md:px-6 md:pb-16">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[var(--color-ink)]">Useful Student Platforms</h2>
          <p className="text-sm text-[var(--color-muted)]">Beyond AI tools</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resources.map((resource) => (
            <a
              key={resource.id}
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">{resource.category}</p>
              <h3 className="text-lg font-bold text-[var(--color-ink)]">{resource.name}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{resource.short_description}</p>
              <p className="mt-3 text-xs font-semibold text-[var(--color-accent)]">{resource.free_details}</p>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-3">
      <p className="text-xl font-black text-[var(--color-ink)]">{value}</p>
      <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
    </div>
  );
}
