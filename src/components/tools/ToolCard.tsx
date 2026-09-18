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
    <article className="card card-hover group flex flex-col p-4">
      {/* Logo / fallback */}
      <div className="relative mb-4 grid h-24 place-items-center overflow-hidden rounded-xl border border-[var(--color-line)] bg-gradient-to-br from-[var(--color-surface-2)] to-[var(--color-accent-soft)] sm:h-28">
        <div className="absolute left-3 top-3 z-10">
          <span className="pill pill-neutral">{FREE_TYPE_LABELS[tool.free_type]}</span>
        </div>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={`${tool.name} logo`}
            className="h-14 w-14 rounded-2xl bg-white object-contain p-1.5 shadow-[var(--shadow-soft)] ring-1 ring-[var(--color-line)] transition duration-300 group-hover:scale-[1.08] sm:h-16 sm:w-16"
            loading="lazy"
          />
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-ink)] text-base font-black text-[var(--color-paper)] sm:h-14 sm:w-14 sm:text-lg">
            {getInitials(tool.name)}
          </span>
        )}
      </div>

      {/* Header */}
      <p className="overline">{tool.category}</p>
      <h3 className="mt-1 text-base font-bold leading-snug text-[var(--color-ink)] sm:text-lg">{tool.name}</h3>

      {/* Description */}
      <p className="line-clamp-2 mt-2 flex-1 text-sm leading-6 text-[var(--color-muted)]">{tool.short_description}</p>

      {/* Tags */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tool.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="chip px-2 py-0.5 text-[11px]">
            #{tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--color-line)] pt-3">
        <div>
          <p className="text-xs font-semibold text-[var(--color-ink)]">
            ★ {tool.avg_rating.toFixed(1)}
            <span className="ml-1 font-normal text-[var(--color-faint)]">({tool.review_count})</span>
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--color-faint)]">Updated {formatDate(tool.updated_at)}</p>
        </div>
        <Link href={`/tools/${tool.slug}`} className="btn btn-primary btn-sm">
          Open
        </Link>
      </div>
    </article>
  );
}
