import Link from "next/link";
import { FREE_TYPE_LABELS } from "@/lib/constants";
import { getToolLogoUrl } from "@/lib/tool-media";
import type { ToolWithStats } from "@/lib/types";
import { formatDate, getInitials } from "@/lib/utils";

interface ToolCardProps {
  tool: ToolWithStats;
}

export function ToolCard({ tool }: ToolCardProps) {
  const logoUrl = getToolLogoUrl(tool.logo_url, tool.url);

  return (
    <article className="interactive-lift premium-panel group rounded-xl p-3 shadow-sm sm:rounded-2xl sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-2 sm:mb-4 sm:gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">{tool.category}</p>
          <h3 className="text-base font-bold text-[var(--color-ink)] sm:text-lg">{tool.name}</h3>
        </div>
        <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-1 text-[11px] font-semibold text-[var(--color-muted)] sm:text-xs">
          {FREE_TYPE_LABELS[tool.free_type]}
        </span>
      </div>

      <div className="mb-3 overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] sm:mb-4 sm:rounded-xl">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={`${tool.name} logo`} className="h-24 w-full object-cover transition duration-300 group-hover:scale-[1.04] sm:h-32" />
        ) : (
          <div className="grid h-24 place-items-center bg-gradient-to-br from-[var(--color-accent-soft)] to-[var(--color-surface)] sm:h-32">
            <span className="rounded-xl bg-[var(--color-surface)] px-3 py-2 text-xl font-black text-[var(--color-ink)] sm:rounded-2xl sm:px-4 sm:py-3 sm:text-2xl">
              {getInitials(tool.name)}
            </span>
          </div>
        )}
      </div>

      <p className="mb-3 line-clamp-2 text-sm leading-5 text-[var(--color-muted)] sm:mb-4 sm:leading-6">{tool.short_description}</p>

      <div className="mb-3 flex flex-wrap gap-1.5 sm:mb-4 sm:gap-2">
        {tool.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full border border-[var(--color-line)] px-2 py-1 text-[11px] text-[var(--color-muted)] sm:text-xs">
            #{tag}
          </span>
        ))}
      </div>

      <div className="flex items-end justify-between gap-3">
        <p className="text-[11px] leading-4 text-[var(--color-muted)] sm:text-xs sm:leading-5">
          Rating {tool.avg_rating.toFixed(1)} / 5 ({tool.review_count})
          <br />
          Updated {formatDate(tool.updated_at)}
        </p>
        <Link
          href={`/tools/${tool.slug}`}
          className="rounded-full bg-[var(--color-ink)] px-3 py-1.5 text-xs font-semibold text-[var(--color-paper)] transition group-hover:bg-[var(--color-accent)] sm:px-4 sm:py-2 sm:text-sm"
        >
          Open
        </Link>
      </div>
    </article>
  );
}
