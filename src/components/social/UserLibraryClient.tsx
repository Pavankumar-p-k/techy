/* eslint-disable react-hooks/set-state-in-effect -- data-loading effects */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface UserLibraryClientProps {
  profileId: string;
  mode: "tools" | "resources";
}

interface ToolRow {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  category: string;
}

interface ResourceRow {
  id: string;
  name: string;
  short_description: string;
  category: string;
  url: string;
}

/**
 * Tools & Resources associated with a student, shown on their profile.
 * - Tools: the tools they use (from their profile.tools_used list, matched
 *   against the tools catalog) plus bookmarked tools.
 * - Resources: resources they bookmarked/saved.
 */
export function UserLibraryClient({ profileId, mode }: UserLibraryClientProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [tools, setTools] = useState<ToolRow[]>([]);
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (mode === "tools") {
        // Bookmarked tools via the existing tool_bookmarks table
        const { data: bookmarked } = await supabase
          .from("tool_bookmarks")
          .select("tools(id, name, slug, short_description, category)")
          .eq("user_id", profileId)
          .limit(50);

        if (!active) return;
        const list = ((bookmarked ?? []) as unknown as { tools: ToolRow | null }[])
          .map((row) => row.tools)
          .filter((t): t is ToolRow => Boolean(t?.id));
        setTools(list);
      } else {
        // Resource bookmarking isn't in the schema yet — show an empty state
        // until the resources-saved feature lands.
        setResources([]);
      }

      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [supabase, profileId, mode]);

  if (loading) {
    return (
      <div className="card p-5">
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton mt-2 h-4 w-1/2" />
      </div>
    );
  }

  if (mode === "tools") {
    return tools.length === 0 ? (
      <div className="card p-8 text-center text-sm text-[var(--color-muted)]">
        No tools saved yet.
        <Link href="/tools" className="btn btn-ghost btn-md mt-3 block">
          Browse Tools
        </Link>
      </div>
    ) : (
      <div className="grid gap-3 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link key={tool.id} href={`/tools/${tool.slug}`} className="card card-hover p-4">
            <p className="overline">{tool.category}</p>
            <h3 className="mt-1 text-base font-bold text-[var(--color-ink)]">{tool.name}</h3>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-muted)]">{tool.short_description}</p>
          </Link>
        ))}
      </div>
    );
  }

  return resources.length === 0 ? (
    <div className="card p-8 text-center text-sm text-[var(--color-muted)]">
      No resources saved yet.
      <Link href="/resources" className="btn btn-ghost btn-md mt-3 block">
        Browse Resources
      </Link>
    </div>
  ) : null;
}
