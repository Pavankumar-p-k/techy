"use client";

import { useState } from "react";

interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
}

function StarIcon({ filled, className }: { filled: boolean; className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.65 1.13 6.58L12 17.58l-5.9 3.09 1.13-6.58L2.45 9.44l6.6-.96L12 2.5z" />
    </svg>
  );
}

export function RatingStars({ value, onChange, size = "md" }: RatingStarsProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const sizeClass = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-7 w-7" : "h-5 w-5";
  const isInteractive = Boolean(onChange);
  const displayValue = hoverValue ?? value;

  return (
    <div className="inline-flex items-center gap-1" role="img" aria-label={`Rating ${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const score = index + 1;
        const isActive = score <= displayValue;

        if (!isInteractive) {
          return <StarIcon key={score} filled={isActive} className={`${sizeClass} ${isActive ? "text-[var(--color-ink)]" : "text-[var(--color-line-strong)]"}`} />;
        }

        return (
          <button
            key={score}
            type="button"
            onClick={() => onChange?.(score)}
            onMouseEnter={() => setHoverValue(score)}
            onMouseLeave={() => setHoverValue(null)}
            className="transition-transform hover:scale-110"
            aria-label={`Rate ${score} out of 5`}
          >
            <StarIcon filled={isActive} className={`${sizeClass} ${isActive ? "text-[var(--color-ink)]" : "text-[var(--color-line-strong)]"}`} />
          </button>
        );
      })}
    </div>
  );
}
