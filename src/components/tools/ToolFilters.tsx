"use client";

import { FREE_TYPE_LABELS } from "@/lib/constants";
import type { FreeType } from "@/lib/types";

interface ToolFiltersProps {
  search: string;
  category: string;
  freeType: string;
  sortBy: string;
  categories: string[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onFreeTypeChange: (value: string) => void;
  onSortChange: (value: string) => void;
}

const FREE_TYPES: FreeType[] = ["free_forever", "freemium", "trial", "open_source", "student_plan"];
const SORT_OPTIONS = [
  { value: "most_reviewed", label: "Most reviewed" },
  { value: "top_rated", label: "Top rated" },
  { value: "most_clicked", label: "Most clicked" },
  { value: "newest", label: "Newest" },
] as const;

export function ToolFilters({
  search,
  category,
  freeType,
  sortBy,
  categories,
  onSearchChange,
  onCategoryChange,
  onFreeTypeChange,
  onSortChange,
}: ToolFiltersProps) {
  return (
    <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm text-[var(--color-muted)]">
          Search tools
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Find coding, writing, image..."
            className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)]"
          />
        </label>

        <label className="text-sm text-[var(--color-muted)]">
          Category
          <select
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)]"
          >
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-[var(--color-muted)]">
          Free model
          <select
            value={freeType}
            onChange={(event) => onFreeTypeChange(event.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)]"
          >
            <option value="all">All free models</option>
            {FREE_TYPES.map((item) => (
              <option key={item} value={item}>
                {FREE_TYPE_LABELS[item]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-[var(--color-muted)]">
          Sort by
          <select
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)]"
          >
            {SORT_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
