import Link from "next/link";
import { FREE_TYPE_LABELS } from "@/lib/constants";
import type { ToolWithStats } from "@/lib/types";

interface ToolCardProps {
  tool: ToolWithStats;
}

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <article className="group rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">{tool.category}</p>
          <h3 className="text-lg font-bold text-[var(--color-ink)]">{tool.name}</h3>
        </div>
        <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-1 text-xs font-semibold text-[var(--color-muted)]">
          {FREE_TYPE_LABELS[tool.free_type]}
        </span>
      </div>

      <p className="mb-4 line-clamp-2 text-sm leading-6 text-[var(--color-muted)]">{tool.short_description}</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {tool.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full border border-[var(--color-line)] px-2 py-1 text-xs text-[var(--color-muted)]">
            #{tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--color-muted)]">
          Rating {tool.avg_rating.toFixed(1)} / 5 ({tool.review_count})
        </p>
        <Link
          href={`/tools/${tool.slug}`}
          className="rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-[var(--color-paper)] transition group-hover:bg-[var(--color-accent)]"
        >
          Open
        </Link>
      </div>
    </article>
  );
}
